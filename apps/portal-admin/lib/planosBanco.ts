import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Plan } from "@/types/types";

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
export interface PlanRow {
  key: string;
  name: string;
  description: string | null;
  price: number | string | null;
  is_custom: boolean;
  module_keys: string[] | null;
}

const SELECT = "key, name, description, price, is_custom, module_keys";

const umTexto = (t: string) => ({ pt: t, en: t });

/**
 * "R$ 89,00". `null` vira "sob consulta" na tela.
 *
 * OS CENTAVOS SÃO OBRIGATÓRIOS, mesmo em valor redondo: `lib/money.ts` lê
 * dinheiro tirando os não-dígitos e dividindo por 100, então "R$ 89" viraria
 * R$ 0,89. É o mesmo formato de `Cliente.valor`, e os dois se cruzam quando a
 * ficha do cliente troca de plano.
 */
function formatPrice(price: number | string | null): string | null {
  if (price === null || price === undefined) return null;
  const n = typeof price === "string" ? Number(price) : price;
  if (!Number.isFinite(n)) return null;
  return "R$ " + n.toFixed(2).replace(".", ",");
}

export function toPlan(linha: PlanRow): Plan {
  return {
    k: linha.key,
    name: umTexto(linha.name),
    // `is_custom` é a coluna que decide se a grade de módulos é editável.
    type: linha.is_custom ? ("custom" as const) : ("fixed" as const),
    price: linha.is_custom ? null : formatPrice(linha.price),
    desc: umTexto(linha.description ?? "—"),
    mods: linha.module_keys ?? [],
  };
}

export interface PlansResult {
  plans: Plan[];
  error: string | null;
}

export async function listPlans(): Promise<PlansResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { plans: [], error: "Supabase não configurado." };
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
    return { plans: [], error: `Não foi possível carregar os planos: ${error.message}` };
  }

  return { plans: (data as PlanRow[]).map(toPlan), error: null };
}
