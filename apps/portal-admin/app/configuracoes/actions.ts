"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/autorizacao";
import { normalizeWhatsapp } from "@/lib/telefone";

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
  "whatsapp_contact",
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

  // O que vai para o banco. Só o WhatsApp mexe nisto: o campo é de texto livre,
  // e é AQUI que o número vira a forma internacional só com dígitos. Normalizar
  // na tela não bastaria — quem lê a chave depois (o app mobile, pelo
  // `platform_whatsapp_contact()`) monta um `wa.me` direto com o que estiver
  // gravado, então a garantia do formato tem que ficar do lado do servidor.
  let value: string | number | string[] = amount;

  if (key === "whatsapp_contact") {
    const phone = normalizeWhatsapp(amount);
    if (!phone.ok) return { ok: false, message: phone.message };
    value = phone.value;
  }

  const { error } = await auth.supabase
    .from("platform_settings")
    .upsert({ key: key, value: value, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) {
    console.error("[salvarConfiguracao] falha:", error.message);
    return { ok: false, message: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
