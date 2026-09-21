import "server-only";

import { redirect } from "next/navigation";
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

/**
 * Sessão perdida no meio do painel: sai de verdade e volta para o login.
 *
 * Não é erro de uma ação — nenhuma outra vai funcionar até entrar de novo.
 * Antes isto voltava como toast, e o painel continuava aberto empilhando o
 * mesmo aviso a cada clique. O `signOut` limpa o que sobrou do cookie, e o
 * login explica o motivo (`?erro=sessao-expirada`).
 *
 * `redirect` numa Server Action vira navegação no cliente. Ele LANÇA, então
 * não pode ficar dentro de um `try/catch` de quem chama.
 */
export async function endExpiredSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<never> {
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  redirect("/login?erro=sessao-expirada");
}

export type ActionResult = { ok: true } | { ok: false; message: string };

export type Authorized =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
  | { ok: false; message: string };

export async function requireAdmin(action = "executar esta operação"): Promise<Authorized> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ok: false, message: "Supabase não configurado neste ambiente." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return endExpiredSession(supabase);

  const { data: perfil, error } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (error || !perfil?.is_platform_admin) {
    // Mensagem deliberadamente seca: não confirmamos a quem não é admin se a
    // operação existe ou por que foi negada.
    return { ok: false, message: `Você não tem permissão para ${action}.` };
  }

  return { ok: true, supabase, userId: user.id };
}
