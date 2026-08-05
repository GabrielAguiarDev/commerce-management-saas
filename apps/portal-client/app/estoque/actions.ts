"use server";

import { revalidatePath } from "next/cache";
import { STOCK_ORIGIN, COST_TYPE_DB } from "@/lib/dados/custos";
import { MOVEMENT_DB } from "@/lib/dados/estoque";
import { requireCustomer, type ActionResult } from "@/lib/sessao";
import type { StockMovementType } from "@/types/types";

/**
 * Registra uma movimentação de estoque.
 *
 * `quantidade` chega no sentido do formulário — sempre positiva. Quem decide o
 * sinal é aqui, porque `apply_stock_movement` SOMA o que recebe:
 *
 *   entrada → +q          saída → −q          ajuste → (contagem − saldo atual)
 *
 * O ajuste é o único que fala em saldo final: quem conta a prateleira lê o
 * total, não a diferença.
 */
export async function recordStockMovement(data: {
  productId: string;
  type: StockMovementType;
  quantidade: number;
  custoUnitario: number;
  reason: string;
}): Promise<ActionResult> {
  const session = await requireCustomer("movimentar o estoque");
  if (!session.ok) return session;

  const { supabase, tenantId, userId } = session;
  const { productId, type, quantidade, custoUnitario, reason } = data;

  if (!productId) return { ok: false, message: "Escolha o produto." };
  if (!(quantidade >= 0)) return { ok: false, message: "Informe a quantidade." };

  const { data: product } = await supabase
    .from("products")
    .select("id, name, stock_quantity, tracks_stock")
    .eq("id", productId)
    .single();

  if (!product?.tracks_stock) {
    return { ok: false, message: "Este produto não controla estoque." };
  }

  const balance = Number(product.stock_quantity ?? 0);
  const delta =
    type === "in" ? quantidade : type === "out" ? -quantidade : quantidade - balance;

  if (delta === 0) return { ok: true };

  const { error } = await supabase.rpc("apply_stock_movement", {
    p_product_id: productId,
    p_type: MOVEMENT_DB[type],
    p_quantity: delta,
    p_reason: reason.trim() || null,
    p_sale_id: null,
    p_unit_cost: custoUnitario || null,
  });

  if (error) return { ok: false, message: error.message };

  // A função grava o movimento e ajusta o saldo, mas NÃO mexe no custo do
  // produto nem lança a despesa. Compra de mercadoria é dinheiro que saiu:
  // as duas coisas são feitas aqui.
  if (type === "in" && custoUnitario > 0) {
    await supabase.from("products").update({ cost: custoUnitario }).eq("id", productId);

    await supabase.from("costs").insert({
      tenant_id: tenantId,
      user_id: userId,
      description: `Compra — ${product.name}`,
      type: COST_TYPE_DB.variable,
      category: "Materiais",
      amount: Math.round(custoUnitario * quantidade * 100) / 100,
      is_recurring: false,
      origin: STOCK_ORIGIN,
      cost_date: todayIso(),
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Reverte uma movimentação lançada à mão.
 *
 * Não apaga a linha: grava o movimento contrário. O estoque é um livro-caixa —
 * apagar o passado esconderia por que o saldo mudou. Baixa por venda não passa
 * por aqui; quem a desfaz é o estorno da venda.
 */
export async function undoStockMovement(movId: string): Promise<ActionResult> {
  const session = await requireCustomer("reverter uma movimentação");
  if (!session.ok) return session;
  const { supabase } = session;

  const { data: mov } = await supabase
    .from("stock_movements")
    .select("id, product_id, quantity, type, sale_id")
    .eq("id", movId)
    .single();

  if (!mov) return { ok: false, message: "Movimentação não encontrada." };
  if (mov.sale_id) {
    return { ok: false, message: "Baixa por venda se desfaz estornando a venda." };
  }

  const { error } = await supabase.rpc("apply_stock_movement", {
    p_product_id: mov.product_id,
    p_type: MOVEMENT_DB.adjustment,
    p_quantity: -Number(mov.quantity),
    p_reason: "Reversão de movimentação",
    p_sale_id: null,
    p_unit_cost: null,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
