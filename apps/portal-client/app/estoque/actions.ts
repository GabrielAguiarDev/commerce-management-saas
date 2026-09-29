"use server";

import { revalidatePath } from "next/cache";
import { MOVEMENT_DB } from "@/lib/dados/estoque";
import { logActivity } from "@/lib/historico";
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
  const session = await requireCustomer("movimentar o estoque", "stock");
  if (!session.ok) return session;

  const { supabase } = session;
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

  // Compra de mercadoria (entrada com custo) é dinheiro que saiu: movimento,
  // saldo, custo do produto e despesa entram JUNTOS em `record_stock_purchase`
  // — ou nenhum. Antes eram três chamadas, e a despesa podia faltar em silêncio.
  const purchase = type === "in" && custoUnitario > 0;
  const { error } = purchase
    ? await supabase.rpc("record_stock_purchase", {
        p_product_id: productId,
        p_quantity: delta,
        p_unit_cost: custoUnitario,
        p_reason: reason.trim() || null,
        p_cost_date: todayIso(),
      })
    : await supabase.rpc("apply_stock_movement", {
        p_product_id: productId,
        p_type: MOVEMENT_DB[type],
        p_quantity: delta,
        p_reason: reason.trim() || null,
        p_sale_id: null,
        p_unit_cost: custoUnitario || null,
      });

  if (error) return { ok: false, message: error.message };

  // O saldo DE DEPOIS vai no resumo porque é a pergunta que se faz ao olhar o
  // histórico: "quanto ficou". Recalcular na tela daria o saldo de hoje.
  await logActivity(supabase, "stock.moved", {
    entityId: productId,
    summary: `${product.name}: ${delta > 0 ? "+" : ""}${delta} · saldo ${balance + delta}`,
    metadata: { type: MOVEMENT_DB[type], delta, reason: reason.trim() || null },
  });

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
  const session = await requireCustomer("reverter uma movimentação", "stock");
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

  await logActivity(supabase, "stock.reverted", {
    entityId: mov.product_id,
    summary: `Reversão de ${Number(mov.quantity) > 0 ? "+" : ""}${mov.quantity}`,
    metadata: { movementId: movId },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
