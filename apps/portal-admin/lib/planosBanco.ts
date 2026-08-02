import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Plano } from "@/types/types";

/**
 * Catálogo de planos, lido da tabela `plans`.
 *
 * A oferta era regra em código (`PACOTES_FIXOS`, `MENSALIDADE_PADRAO`,
 * `ROTULO_PLANO`). Agora é dado: nome, preço, descrição e composição vêm daqui,
 * e a tela de Planos edita a linha de verdade.
 *
 * SEGURANÇA: leitura com o cliente de sessão, sob RLS — a política
 * `is_platform_admin` da tabela já faz o recorte. A `service_role` fica para as
 * Server Actions que escrevem.
 */

/** A linha crua, para quem precisa da regra e não do formato de tela. */
export interface LinhaPlano {
  key: string;
  name: string;
  description: string | null;
  price: number | string | null;
  is_custom: boolean;
  module_keys: string[] | null;
}

const SELECT = "key, name, description, price, is_custom, module_keys";

const umTexto = (t: string) => ({ pt: t, en: t });

/** "R$ 89" — o formato que as telas já consumiam. `null` vira "sob consulta". */
function formatarPreco(preco: number | string | null): string | null {
  if (preco === null || preco === undefined) return null;
  const n = typeof preco === "string" ? Number(preco) : preco;
  if (!Number.isFinite(n)) return null;
  // Sem centavos quando o valor é redondo, que é o caso de toda a tabela hoje.
  return "R$ " + (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ","));
}

export function paraPlano(linha: LinhaPlano): Plano {
  return {
    k: linha.key,
    nome: umTexto(linha.name),
    // `is_custom` é a coluna que decide se a grade de módulos é editável.
    tipo: linha.is_custom ? ("custom" as const) : ("fixo" as const),
    preco: linha.is_custom ? null : formatarPreco(linha.price),
    desc: umTexto(linha.description ?? "—"),
    mods: linha.module_keys ?? [],
  };
}

export interface ResultadoPlanos {
  planos: Plano[];
  erro: string | null;
}

export async function listarPlanos(): Promise<ResultadoPlanos> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { planos: [], erro: "Supabase não configurado." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("plans")
    .select(SELECT)
    // Só a oferta vigente aparece no painel; um plano descontinuado some da
    // tela sem precisar apagar a linha (clientes antigos ainda apontam para ela).
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    console.error("[listarPlanos] falha ao ler plans:", error.message);
    return { planos: [], erro: `Não foi possível carregar os planos: ${error.message}` };
  }

  return { planos: (data as LinhaPlano[]).map(paraPlano), erro: null };
}
