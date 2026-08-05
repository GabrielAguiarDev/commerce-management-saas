import "server-only";

import { createClient, supabaseConfigurado } from "@/lib/supabase/server";

/**
 * Porta de entrada de toda leitura e escrita do portal.
 *
 * POR QUE EXISTE: uma Server Action é um endpoint HTTP. Qualquer pessoa pode
 * chamá-la, com qualquer corpo, sem passar pela nossa interface. Estar "dentro
 * do portal" não prova nada — quem prova é esta consulta.
 *
 * Devolve o cliente COM SESSÃO, nunca uma chave privilegiada: o RLS já isola
 * cada tenant, e continuar sob ele é a segunda tranca. O `tenantId` que sai
 * daqui serve para exibir e para escolher caminhos na interface — não para
 * filtrar consulta. Filtrar à mão daria a falsa impressão de que a segurança
 * está no `where`, quando está na política do banco.
 */

export type Session =
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      userId: string;
      tenantId: string;
      name: string;
      roleId: string | null;
    }
  | { ok: false; message: string };

export async function requireCustomer(action = "usar o portal"): Promise<Session> {
  if (!supabaseConfigurado()) {
    return { ok: false, message: "Supabase não configurado neste ambiente." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Sessão expirada. Entre novamente para continuar." };

  const { data: perfil, error } = await supabase
    .from("profiles")
    .select("tenant_id, role_id, full_name, is_platform_admin")
    .eq("id", user.id)
    .single();

  // Mensagem deliberadamente seca: não explicamos a quem não pode entrar por
  // que foi negado.
  if (error || !perfil?.tenant_id || perfil.is_platform_admin) {
    return { ok: false, message: `Você não tem permissão para ${action}.` };
  }

  return {
    ok: true,
    supabase,
    userId: user.id,
    tenantId: perfil.tenant_id,
    name: perfil.full_name ?? user.email ?? "Você",
    roleId: perfil.role_id ?? null,
  };
}

/** O que toda Server Action do portal devolve para a interface. */
export type ActionResult = { ok: true } | { ok: false; message: string };
