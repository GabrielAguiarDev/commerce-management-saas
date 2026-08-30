"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { MOVEMENT_DB } from "@/lib/dados/estoque";
import { onlyDigits } from "@/lib/dados/fiscal";
import { logActivity } from "@/lib/historico";
import { isComingSoon } from "@/lib/modulos";
import { PAYMENT_DB, SALE_STATUS } from "@/lib/dados/vendas";
import { requireCustomer, type ActionResult } from "@/lib/sessao";
import type { PaymentMethod } from "@/types/types";

export interface ItemToSave {
  productId: string | null;
  name: string;
  qtd: number;
  price: number;
}

/**
 * Registra uma venda — UMA transação, via `create_sale`.
 *
 * ┌─ POR QUE NÃO SÃO MAIS DUAS ESCRITAS ───────────────────────────────────┐
 * │ Até aqui esta função inseria em `sales` e depois em `sale_items`, e o   │
 * │ PostgREST não tem transação entre chamadas: a segunda falhando deixava  │
 * │ uma venda SEM ITENS no banco. Sem nota fiscal isso era um incômodo no   │
 * │ relatório; com nota é um documento de valor errado enviado à SEFAZ, que │
 * │ não se apaga depois.                                                    │
 * │                                                                        │
 * │ `create_sale` faz as duas dentro da mesma transação — ou entram as      │
 * │ duas, ou nenhuma. Ela é SECURITY INVOKER: o RLS de `sales` e            │
 * │ `sale_items` continua valendo linha a linha, como valia antes.          │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * O TOTAL DEIXA DE SER CALCULADO AQUI. Quem soma é a função, a partir dos
 * itens. Não é preciosismo: uma Server Action é um endpoint HTTP, e uma
 * requisição forjada podia mandar itens de R$ 200 com total de R$ 2. Como a
 * nota fiscal sai desse número, ele tem de vir do banco.
 *
 * Desde `20260829000000_create_sale_client_id.sql` a função arredonda CADA
 * subtotal em centavos e soma os arredondados. Importa em venda por peso: meio
 * quilo a R$ 19,99 dá R$ 9,995, um valor que não existe em dinheiro — e uma
 * nota fiscal em que os itens não somam o total é uma nota rejeitada.
 *
 * A baixa de estoque continua sendo do BANCO: o trigger em `sale_items`
 * desconta o saldo e grava o movimento do tipo 'sale'. Agora ele roda DENTRO
 * da transação — uma melhoria de graça, porque venda desfeita desfaz a baixa
 * junto.
 *
 * A nota entra na fila depois, e fora da transação: emitir documento é o
 * passo que pode falhar por motivo de fora (cadastro incompleto, provedor
 * indisponível), e nenhum deles pode desfazer uma venda que o cliente já
 * pagou.
 */
export async function recordSale(
  items: ItemToSave[],
  payment: PaymentMethod,
  customerDocument = "",
): Promise<ActionResult> {
  const session = await requireCustomer("registrar uma venda");
  if (!session.ok) return session;

  if (!items.length) return { ok: false, message: "A venda precisa de pelo menos um item." };

  const { supabase } = session;

  const { data: saleId, error } = await supabase.rpc("create_sale", {
    p_payment_method: PAYMENT_DB[payment],
    // `product_id` vazio vira NULL lá dentro: venda de item avulso, que não
    // está no cadastro, é caso normal no balcão.
    p_items: items.map((i) => ({
      product_id: i.productId ?? "",
      product_name: i.name,
      quantity: i.qtd,
      unit_price: i.price,
    })),
    p_customer_document: onlyDigits(customerDocument) || null,
    p_customer_name: null,
    p_sold_at: null,
  });

  if (error || !saleId) {
    return { ok: false, message: error?.message ?? "Não foi possível registrar a venda." };
  }

  await enqueueFiscalDocument(supabase, saleId as string);

  const total = items.reduce((a, i) => a + i.qtd * i.price, 0);
  await logActivity(supabase, "sale.created", {
    entityId: saleId as string,
    summary: `${items.length} ${items.length === 1 ? "item" : "itens"} · ${brl(total)}`,
    metadata: { payment: PAYMENT_DB[payment], items: items.length },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * O valor como ele aparece no histórico.
 *
 * Formatado AQUI e gravado pronto: o `summary` do log é o retrato do que
 * aconteceu naquela hora, e remontá-lo na tela usaria as regras de hoje para
 * descrever um evento de ontem.
 */
function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* -------------------------------------------------------------------------- */
/* Nota fiscal                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Põe a venda na fila da nota fiscal.
 *
 * DUAS ETAPAS, E A SEPARAÇÃO É O PONTO:
 *
 * 1. `enqueue_fiscal_document` roda AGORA, dentro da requisição. É uma escrita
 *    barata no próprio banco, e precisa acontecer antes da resposta para que a
 *    tela seguinte já mostre a nota como "pendente" em vez de fingir que a
 *    venda não tem documento nenhum.
 *
 * 2. A emissão vai para `after()` — o callback que o Next roda DEPOIS de a
 *    resposta ter sido enviada. A NFC-e é síncrona no provedor: o POST espera
 *    a SEFAZ responder, o que leva segundos e às vezes falha. Fazer o balcão
 *    esperar por isso para ver "venda registrada" é inaceitável num PDV.
 *
 * NADA AQUI DERRUBA A VENDA. Se o cliente não tem cadastro fiscal, a função do
 * banco devolve `null` e não há o que emitir. Se a chamada da Edge Function
 * falhar, o documento fica em `pending` e a `fiscal-retry` o pega. A venda já
 * está gravada nos dois casos — é a regra que organiza toda esta área.
 */
async function enqueueFiscalDocument(
  supabase: Extract<Awaited<ReturnType<typeof requireCustomer>>, { ok: true }>["supabase"],
  saleId: string,
) {
  // Módulo em espera: nem enfileira. O `enqueue_fiscal_document` já devolveria
  // `null` para quem não tem cadastro fiscal, mas um tenant que TENHA cadastro
  // e a chave antiga ficaria acumulando documentos numa fila que ninguém emite.
  // Ver `COMING_SOON_MODULES` em `lib/modulos.ts`.
  if (isComingSoon("fiscal")) return;

  let documentId: string | null = null;

  try {
    const { data } = await supabase.rpc("enqueue_fiscal_document", { p_sale_id: saleId });
    documentId = (data as string | null) ?? null;
  } catch {
    // A migration da fase 2 pode ainda não ter rodado neste ambiente. Venda
    // sem nota é degradação aceitável; venda que falha, não.
    return;
  }

  if (!documentId) return;

  after(async () => {
    try {
      await supabase.functions.invoke("fiscal-emit", { body: { document_id: documentId } });
    } catch {
      // O documento fica em `pending` e a `fiscal-retry` reenvia. Não há a
      // quem avisar aqui: a resposta da venda já foi para a tela.
    }
  });
}

/**
 * Estorna: a venda sai do faturamento, o estoque volta, e a linha continua no
 * histórico riscada. Nada é apagado — é o que permite explicar a diferença
 * para o contador depois.
 *
 * A devolução ao estoque é feita AQUI, à mão: o trigger de `sale_items` só
 * reage à inserção do item, não à mudança de `sales.status` — verificado no
 * banco. Sem isto, estornar tiraria a venda do caixa e deixaria a mercadoria
 * fora da prateleira.
 */
export async function refundSale(vendaId: string): Promise<ActionResult> {
  const session = await requireCustomer("estornar uma venda");
  if (!session.ok) return session;
  const { supabase } = session;

  const { error } = await supabase
    .from("sales")
    .update({ status: SALE_STATUS.refunded })
    .eq("id", vendaId);

  if (error) return { ok: false, message: error.message };

  await returnToStock(supabase, vendaId, 1);
  await logActivity(supabase, "sale.refunded", { entityId: vendaId });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function undoRefund(vendaId: string): Promise<ActionResult> {
  const session = await requireCustomer("desfazer um estorno");
  if (!session.ok) return session;
  const { supabase } = session;

  const { error } = await supabase
    .from("sales")
    .update({ status: SALE_STATUS.normal })
    .eq("id", vendaId);

  if (error) return { ok: false, message: error.message };

  await returnToStock(supabase, vendaId, -1);
  await logActivity(supabase, "sale.refund_undone", { entityId: vendaId });

  revalidatePath("/", "layout");
  return { ok: true };
}

/** `sinal = 1` devolve à prateleira (estorno); `-1` baixa de novo. */
async function returnToStock(
  supabase: Extract<Awaited<ReturnType<typeof requireCustomer>>, { ok: true }>["supabase"],
  vendaId: string,
  sign: 1 | -1,
) {
  const { data: items } = await supabase
    .from("sale_items")
    .select("product_id, quantity, products(tracks_stock)")
    .eq("sale_id", vendaId);

  for (const i of items ?? []) {
    const tracks = (i.products as { tracks_stock?: boolean } | null)?.tracks_stock;
    if (!i.product_id || !tracks) continue;
    await supabase.rpc("apply_stock_movement", {
      p_product_id: i.product_id,
      p_type: MOVEMENT_DB.adjustment,
      p_quantity: sign * Number(i.quantity),
      p_reason: sign > 0 ? "Devolução por estorno" : "Baixa por estorno desfeito",
      p_sale_id: vendaId,
      p_unit_cost: null,
    });
  }
}

/**
 * Editar é substituir: a venda antiga é estornada e uma nova entra no lugar.
 *
 * Reescrever a linha original apagaria o rastro de que houve correção — e o
 * estorno já resolve a devolução do estoque, sem lógica nova.
 */
export async function editSale(
  vendaId: string,
  items: ItemToSave[],
  payment: PaymentMethod,
  customerDocument = "",
): Promise<ActionResult> {
  const refund = await refundSale(vendaId);
  if (!refund.ok) return refund;
  return recordSale(items, payment, customerDocument);
}
