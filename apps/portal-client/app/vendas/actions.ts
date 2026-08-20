"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { MOVEMENT_DB } from "@/lib/dados/estoque";
import { onlyDigits } from "@/lib/dados/fiscal";
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
 * Registra uma venda.
 *
 * A baixa de estoque é do BANCO: um trigger em `sale_items` desconta o saldo e
 * grava o movimento do tipo 'sale'. Esta função só cria a venda e os itens.
 *
 * ATENÇÃO — AINDA não é atômico. São duas escritas em sequência (`sales` e
 * `sale_items`) e o PostgREST não tem transação entre chamadas: se a segunda
 * falhar, fica uma venda sem itens.
 *
 * A função `create_sale` que resolve isso JÁ EXISTE, em
 * `supabase/migrations/20260817140000_fiscal_emissao.sql`, e não está ligada
 * aqui de propósito: trocar o caminho da venda sem exercitar a função contra o
 * banco é o tipo de mudança cujo erro aparece como venda perdida no balcão.
 * Ligar é uma linha — trocar as duas escritas por um `rpc("create_sale")` —
 * assim que a migration rodar e houver como testar.
 *
 * Enquanto isso, a nota só é enfileirada DEPOIS de os itens entrarem, o que
 * fecha a janela pior: documento fiscal de uma venda vazia.
 */
export async function recordSale(
  items: ItemToSave[],
  payment: PaymentMethod,
  customerDocument = "",
): Promise<ActionResult> {
  const session = await requireCustomer("registrar uma venda");
  if (!session.ok) return session;

  if (!items.length) return { ok: false, message: "A venda precisa de pelo menos um item." };

  const { supabase, userId, tenantId } = session;
  const total = items.reduce((a, i) => a + i.qtd * i.price, 0);
  const document = onlyDigits(customerDocument);

  const { data: sale, error } = await supabase
    .from("sales")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      total,
      payment_method: PAYMENT_DB[payment],
      status: SALE_STATUS.normal,
      sold_at: new Date().toISOString(),
      customer_document: document || null,
    })
    .select("id")
    .single();

  if (error || !sale) return { ok: false, message: error?.message ?? "Não foi possível registrar a venda." };

  const { error: erroItens } = await supabase.from("sale_items").insert(
    items.map((i) => ({
      tenant_id: tenantId,
      sale_id: sale.id,
      product_id: i.productId,
      product_name: i.name,
      quantity: i.qtd,
      unit_price: i.price,
      subtotal: i.qtd * i.price,
    })),
  );

  if (erroItens) return { ok: false, message: erroItens.message };

  // A nota entra na fila SÓ DEPOIS de os itens estarem gravados. Enfileirar
  // antes produziria um documento fiscal de uma venda sem itens — valor zero
  // enviado à SEFAZ, que não se apaga.
  await enqueueFiscalDocument(supabase, sale.id);

  // A baixa de estoque NÃO é feita aqui. Um trigger em `sale_items` já desconta
  // o saldo e grava o `stock_movements` do tipo 'sale' — verificado no banco:
  // inserir um item de 3 unidades leva o saldo de 100 para 97 sozinho.
  // Descontar de novo daqui tiraria o dobro de cada venda.

  revalidatePath("/", "layout");
  return { ok: true };
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
