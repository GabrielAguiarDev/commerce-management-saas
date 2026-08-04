"use server";

import { revalidatePath } from "next/cache";
import { ORIGEM_MANUAL, TIPO_CUSTO_DB } from "@/lib/dados/custos";
import { exigirCliente, type ResultadoAcao } from "@/lib/sessao";
import type { TipoCusto } from "@/types/types";

export interface CustoParaSalvar {
  id: string | null;
  tipo: TipoCusto;
  descricao: string;
  categoria: string;
  valor: number;
  /** 'YYYY-MM-DD'. */
  data: string;
  recorrente: boolean;
}

export async function salvarCusto(c: CustoParaSalvar): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("lançar um custo");
  if (!sessao.ok) return sessao;

  if (!c.descricao.trim()) return { ok: false, mensagem: "Escreva o que foi o gasto." };
  if (!(c.valor > 0)) return { ok: false, mensagem: "Informe um valor maior que zero." };

  const { supabase, tenantId, usuarioId } = sessao;

  const campos = {
    description: c.descricao.trim(),
    type: TIPO_CUSTO_DB[c.tipo],
    category: c.categoria.trim() || null,
    amount: c.valor,
    // Só custo fixo repete: um saco de feijão não volta sozinho todo mês.
    is_recurring: c.tipo === "fixo" ? c.recorrente : false,
    cost_date: c.data,
  };

  const { error } = c.id
    ? await supabase.from("costs").update(campos).eq("id", c.id)
    : await supabase
        .from("costs")
        .insert({ tenant_id: tenantId, user_id: usuarioId, origin: ORIGEM_MANUAL, ...campos });

  if (error) return { ok: false, mensagem: error.message };

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
export async function excluirCusto(id: string): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("excluir um custo");
  if (!sessao.ok) return sessao;
  const { supabase } = sessao;

  const { data: custo } = await supabase.from("costs").select("origin").eq("id", id).single();

  if (custo?.origin === "stock") {
    return {
      ok: false,
      mensagem: "Este custo veio de uma entrada no Estoque. Ajuste a movimentação por lá.",
    };
  }

  const { error } = await supabase.from("costs").delete().eq("id", id);
  if (error) return { ok: false, mensagem: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
