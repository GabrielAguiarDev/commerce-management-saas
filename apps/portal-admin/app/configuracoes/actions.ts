"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/autorizacao";

/**
 * Grava um ajuste em `platform_settings`.
 *
 * A tabela é um chaveiro `key`/`value` (jsonb), então o valor vai como veio da
 * tela — lista, número ou texto — e o `upsert` cria a chave se ela ainda não
 * existir. A leitura e a forma de cada ajuste ficam em `lib/configuracoes.ts`.
 */

/** As chaves que o painel administra. Qualquer outra é recusada. */
const ALLOWED_KEYS = new Set([
  "default_modules",
  "trial_days",
  "inactivity_notify",
  "default_language",
]);

export async function saveSetting(
  key: string,
  amount: string | number | string[],
): Promise<ActionResult> {
  const auth = await requireAdmin("alterar configurações");
  if (!auth.ok) return auth;

  // Sem esta lista, uma chamada forjada poderia criar chaves arbitrárias na
  // tabela de configurações da plataforma.
  if (!ALLOWED_KEYS.has(key)) {
    return { ok: false, message: "Configuração desconhecida." };
  }

  if (key === "trial_days" && (typeof amount !== "number" || amount < 0)) {
    return { ok: false, message: "O período de teste precisa ser um número de dias." };
  }

  if (key === "default_modules" && !Array.isArray(amount)) {
    return { ok: false, message: "Selecione os módulos padrão." };
  }

  const { error } = await auth.supabase
    .from("platform_settings")
    .upsert({ key: key, value: amount, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) {
    console.error("[salvarConfiguracao] falha:", error.message);
    return { ok: false, message: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
