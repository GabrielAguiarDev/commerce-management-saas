import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Porta de entrada de toda Server Action do painel.
 *
 * POR QUE EXISTE: uma Server Action é um endpoint HTTP. Qualquer pessoa na
 * internet pode chamá-la, com qualquer corpo, sem passar pela nossa interface.
 * Estar "dentro do painel admin" não prova nada — quem prova é esta consulta.
 *
 * Devolve o cliente COM SESSÃO, e não a `service_role`: as tabelas de
 * plataforma (`plans`, `platform_payments`, `platform_settings`) já têm
 * política `is_platform_admin`, então o RLS continua valendo como segunda
 * tranca. A `service_role` fica reservada ao que só ela consegue fazer —
 * administrar o Auth, em `app/clientes/actions.ts`.
 */

export type ResultadoAcao = { ok: true } | { ok: false; mensagem: string };

export type Autorizado =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; usuarioId: string }
  | { ok: false; mensagem: string };

export async function exigirAdmin(acao = "executar esta operação"): Promise<Autorizado> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ok: false, mensagem: "Supabase não configurado neste ambiente." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, mensagem: "Sessão expirada. Entre novamente para continuar." };

  const { data: perfil, error } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (error || !perfil?.is_platform_admin) {
    // Mensagem deliberadamente seca: não confirmamos a quem não é admin se a
    // operação existe ou por que foi negada.
    return { ok: false, mensagem: `Você não tem permissão para ${acao}.` };
  }

  return { ok: true, supabase, usuarioId: user.id };
}
