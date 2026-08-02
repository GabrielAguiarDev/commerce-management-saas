"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin, type ResultadoAcao } from "@/lib/autorizacao";

/**
 * Grava um ajuste em `platform_settings`.
 *
 * A tabela é um chaveiro `key`/`value` (jsonb), então o valor vai como veio da
 * tela — lista, número ou texto — e o `upsert` cria a chave se ela ainda não
 * existir. A leitura e a forma de cada ajuste ficam em `lib/configuracoes.ts`.
 */

/** As chaves que o painel administra. Qualquer outra é recusada. */
const CHAVES_PERMITIDAS = new Set([
  "default_modules",
  "trial_days",
  "inactivity_notify",
  "default_language",
]);

export async function salvarConfiguracao(
  chave: string,
  valor: string | number | string[],
): Promise<ResultadoAcao> {
  const auth = await exigirAdmin("alterar configurações");
  if (!auth.ok) return auth;

  // Sem esta lista, uma chamada forjada poderia criar chaves arbitrárias na
  // tabela de configurações da plataforma.
  if (!CHAVES_PERMITIDAS.has(chave)) {
    return { ok: false, mensagem: "Configuração desconhecida." };
  }

  if (chave === "trial_days" && (typeof valor !== "number" || valor < 0)) {
    return { ok: false, mensagem: "O período de teste precisa ser um número de dias." };
  }

  if (chave === "default_modules" && !Array.isArray(valor)) {
    return { ok: false, mensagem: "Selecione os módulos padrão." };
  }

  const { error } = await auth.supabase
    .from("platform_settings")
    .upsert({ key: chave, value: valor, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) {
    console.error("[salvarConfiguracao] falha:", error.message);
    return { ok: false, mensagem: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
