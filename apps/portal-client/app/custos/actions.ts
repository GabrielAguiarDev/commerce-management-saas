"use server";

import { revalidatePath } from "next/cache";
import { MANUAL_ORIGIN, COST_TYPE_DB } from "@/lib/dados/custos";
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
  const session = await requireCustomer("lançar um custo");
  if (!session.ok) return session;

  if (!c.description.trim()) return { ok: false, message: "Escreva o que foi o gasto." };
  if (!(c.amount > 0)) return { ok: false, message: "Informe um valor maior que zero." };

  const { supabase, tenantId, userId } = session;

  const fields = {
    description: c.description.trim(),
    type: COST_TYPE_DB[c.type],
    category: c.category.trim() || null,
    amount: c.amount,
    // Só custo fixo repete: um saco de feijão não volta sozinho todo mês.
    is_recurring: c.type === "fixed" ? c.recurring : false,
    cost_date: c.data,
  };

  const { error } = c.id
    ? await supabase.from("costs").update(fields).eq("id", c.id)
    : await supabase
        .from("costs")
        .insert({ tenant_id: tenantId, user_id: userId, origin: MANUAL_ORIGIN, ...fields });

  if (error) return { ok: false, message: error.message };

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
  const session = await requireCustomer("excluir um custo");
  if (!session.ok) return session;
  const { supabase } = session;

  const { data: cost } = await supabase.from("costs").select("origin").eq("id", id).single();

  if (cost?.origin === "stock") {
    return {
      ok: false,
      message: "Este custo veio de uma entrada no Estoque. Ajuste a movimentação por lá.",
    };
  }

  const { error } = await supabase.from("costs").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
