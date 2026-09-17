"use server";

import { revalidatePath } from "next/cache";
import { COST_TYPE_DB } from "@/lib/dados/custos";
import { logActivity } from "@/lib/historico";
import { requireCustomer, type ActionResult } from "@/lib/sessao";
import type { CostType } from "@/types/types";

export interface CostToSave {
  id: string | null;
  type: CostType;
  description: string;
  category: string;
  amount: number;
  /** 'YYYY-MM-DD'. */
  data: string;
  recurring: boolean;
}

export async function saveCost(c: CostToSave): Promise<ActionResult> {
  const session = await requireCustomer("lançar um custo", "costs");
  if (!session.ok) return session;

  if (!c.description.trim()) return { ok: false, message: "Escreva o que foi o gasto." };
  if (!(c.amount > 0)) return { ok: false, message: "Informe um valor maior que zero." };

  const { supabase } = session;
  const description = c.description.trim();
  const recurring = c.type === "fixed" ? c.recurring : false;

  // A RPC cria/edita a série e o lançamento na mesma transação. Editar um mês
  // de uma série altera aquele mês e os seguintes; os anteriores não mudam.
  const { data: savedId, error } = await supabase.rpc("save_manual_cost", {
    p_id: c.id,
    p_description: description,
    p_type: COST_TYPE_DB[c.type],
    p_category: c.category.trim() || null,
    p_amount: c.amount,
    p_cost_date: c.data,
    p_is_recurring: recurring,
  });

  if (error) return { ok: false, message: error.message };

  await logActivity(supabase, c.id ? "cost.updated" : "cost.created", {
    entityId: savedId ?? c.id ?? null,
    summary: `${description} · ${c.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Exclui um custo lançado à mão.
 *
 * Custo vindo do Estoque não é excluído aqui: ele espelha uma entrada de
 * mercadoria, e apagá-lo sozinho deixaria a compra sem despesa. Quem corrige é
 * a reversão da movimentação.
 */
export async function deleteCost(id: string): Promise<ActionResult> {
  const session = await requireCustomer("excluir um custo", "costs");
  if (!session.ok) return session;
  const { supabase } = session;

  // `description` vem junto só para o histórico: depois do delete não há de
  // onde tirá-la, e "custo excluído" sem dizer qual não explica nada.
  const { data: cost } = await supabase
    .from("costs")
    .select("origin, description, recurrence_id")
    .eq("id", id)
    .single();

  if (cost?.origin === "stock") {
    return {
      ok: false,
      message: "Este custo veio de uma entrada no Estoque. Ajuste a movimentação por lá.",
    };
  }

  // Para uma série, a RPC preserva competências anteriores e remove a
  // escolhida e as seguintes. Para um avulso, remove somente a linha.
  const { error } = await supabase.rpc("delete_manual_cost", { p_id: id });
  if (error) return { ok: false, message: error.message };

  await logActivity(supabase, "cost.deleted", {
    entityId: id,
    summary: cost
      ? `${cost.description}${cost.recurrence_id ? " · parou de repetir" : ""}`
      : null,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
