"use server";

import { revalidatePath } from "next/cache";
import { MOVEMENT_DB } from "@/lib/dados/estoque";
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
 * ATENÇÃO — não é atômico. São duas escritas em sequência (`sales` e
 * `sale_items`) e o PostgREST não tem transação entre chamadas: se a segunda
 * falhar, fica uma venda sem itens. Para o volume de um balcão é tolerável,
 * mas o certo é uma função `create_sale` no banco. Está na lista do que falta
 * criar.
 */
export async function recordSale(
  items: ItemToSave[],
  payment: PaymentMethod,
): Promise<ActionResult> {
  const session = await requireCustomer("registrar uma venda");
  if (!session.ok) return session;

  if (!items.length) return { ok: false, message: "A venda precisa de pelo menos um item." };

  const { supabase, userId, tenantId } = session;
  const total = items.reduce((a, i) => a + i.qtd * i.price, 0);

  const { data: sale, error } = await supabase
    .from("sales")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      total,
      payment_method: PAYMENT_DB[payment],
      status: SALE_STATUS.normal,
      sold_at: new Date().toISOString(),
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

  // A baixa de estoque NÃO é feita aqui. Um trigger em `sale_items` já desconta
  // o saldo e grava o `stock_movements` do tipo 'sale' — verificado no banco:
  // inserir um item de 3 unidades leva o saldo de 100 para 97 sozinho.
  // Descontar de novo daqui tiraria o dobro de cada venda.

  revalidatePath("/", "layout");
  return { ok: true };
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
): Promise<ActionResult> {
  const refund = await refundSale(vendaId);
  if (!refund.ok) return refund;
  return recordSale(items, payment);
}
