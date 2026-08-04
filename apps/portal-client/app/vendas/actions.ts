"use server";

import { revalidatePath } from "next/cache";
import { MOV_DB } from "@/lib/dados/estoque";
import { PAGAMENTO_DB, STATUS_VENDA } from "@/lib/dados/vendas";
import { exigirCliente, type ResultadoAcao } from "@/lib/sessao";
import type { FormaPagamento } from "@/types/types";

export interface ItemParaSalvar {
  produtoId: string | null;
  nome: string;
  qtd: number;
  preco: number;
}

/**
 * Registra uma venda.
 *
 * ATENÇÃO — não é atômico. São três escritas em sequência (`sales`,
 * `sale_items`, baixa de estoque) e o PostgREST não tem transação entre
 * chamadas. Se a segunda falhar, a primeira já está gravada. Para o volume de
 * um balcão isso é aceitável, mas o certo é uma função `create_sale` no banco
 * que faça tudo num `BEGIN`. Está na lista do que falta criar.
 */
export async function registrarVenda(
  itens: ItemParaSalvar[],
  pagamento: FormaPagamento,
): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("registrar uma venda");
  if (!sessao.ok) return sessao;

  if (!itens.length) return { ok: false, mensagem: "A venda precisa de pelo menos um item." };

  const { supabase, usuarioId, tenantId } = sessao;
  const total = itens.reduce((a, i) => a + i.qtd * i.preco, 0);

  const { data: venda, error } = await supabase
    .from("sales")
    .insert({
      tenant_id: tenantId,
      user_id: usuarioId,
      total,
      payment_method: PAGAMENTO_DB[pagamento],
      status: STATUS_VENDA.normal,
      sold_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !venda) return { ok: false, mensagem: error?.message ?? "Não foi possível registrar a venda." };

  const { error: erroItens } = await supabase.from("sale_items").insert(
    itens.map((i) => ({
      tenant_id: tenantId,
      sale_id: venda.id,
      product_id: i.produtoId,
      product_name: i.nome,
      quantity: i.qtd,
      unit_price: i.preco,
      subtotal: i.qtd * i.preco,
    })),
  );

  if (erroItens) return { ok: false, mensagem: erroItens.message };

  await baixarEstoque(supabase, itens, venda.id);

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Dá baixa no estoque dos itens que controlam saldo.
 *
 * `apply_stock_movement` SOMA a quantidade recebida — o tipo é só um rótulo na
 * linha. Por isso a venda manda o número negativo.
 */
async function baixarEstoque(
  supabase: Extract<Awaited<ReturnType<typeof exigirCliente>>, { ok: true }>["supabase"],
  itens: ItemParaSalvar[],
  vendaId: string,
) {
  const comProduto = itens.filter((i) => i.produtoId);
  if (!comProduto.length) return;

  const { data: produtos } = await supabase
    .from("products")
    .select("id, tracks_stock")
    .in(
      "id",
      comProduto.map((i) => i.produtoId as string),
    );

  const controla = new Set((produtos ?? []).filter((p) => p.tracks_stock).map((p) => p.id));

  for (const i of comProduto) {
    if (!controla.has(i.produtoId as string)) continue;
    await supabase.rpc("apply_stock_movement", {
      p_product_id: i.produtoId,
      p_type: MOV_DB.venda,
      p_quantity: -i.qtd,
      p_reason: "Baixa por venda",
      p_sale_id: vendaId,
      p_unit_cost: null,
    });
  }
}

/**
 * Estorna: a venda sai do faturamento, o estoque volta, e a linha continua no
 * histórico riscada. Nada é apagado — é o que permite explicar a diferença
 * para o contador depois.
 */
export async function estornarVenda(vendaId: string): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("estornar uma venda");
  if (!sessao.ok) return sessao;
  const { supabase } = sessao;

  const { error } = await supabase
    .from("sales")
    .update({ status: STATUS_VENDA.estornada })
    .eq("id", vendaId);

  if (error) return { ok: false, mensagem: error.message };

  await devolverEstoque(supabase, vendaId, 1);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function desfazerEstorno(vendaId: string): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("desfazer um estorno");
  if (!sessao.ok) return sessao;
  const { supabase } = sessao;

  const { error } = await supabase
    .from("sales")
    .update({ status: STATUS_VENDA.normal })
    .eq("id", vendaId);

  if (error) return { ok: false, mensagem: error.message };

  await devolverEstoque(supabase, vendaId, -1);

  revalidatePath("/", "layout");
  return { ok: true };
}

/** `sinal = 1` devolve à prateleira (estorno); `-1` baixa de novo. */
async function devolverEstoque(
  supabase: Extract<Awaited<ReturnType<typeof exigirCliente>>, { ok: true }>["supabase"],
  vendaId: string,
  sinal: 1 | -1,
) {
  const { data: itens } = await supabase
    .from("sale_items")
    .select("product_id, quantity, products(tracks_stock)")
    .eq("sale_id", vendaId);

  for (const i of itens ?? []) {
    const controla = (i.products as { tracks_stock?: boolean } | null)?.tracks_stock;
    if (!i.product_id || !controla) continue;
    await supabase.rpc("apply_stock_movement", {
      p_product_id: i.product_id,
      p_type: MOV_DB.ajuste,
      p_quantity: sinal * Number(i.quantity),
      p_reason: sinal > 0 ? "Devolução por estorno" : "Baixa por estorno desfeito",
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
export async function editarVenda(
  vendaId: string,
  itens: ItemParaSalvar[],
  pagamento: FormaPagamento,
): Promise<ResultadoAcao> {
  const estorno = await estornarVenda(vendaId);
  if (!estorno.ok) return estorno;
  return registrarVenda(itens, pagamento);
}
