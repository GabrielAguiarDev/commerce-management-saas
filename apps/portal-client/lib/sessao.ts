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

export type Sessao =
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      usuarioId: string;
      tenantId: string;
      nome: string;
      papelId: string | null;
    }
  | { ok: false; mensagem: string };

export async function exigirCliente(acao = "usar o portal"): Promise<Sessao> {
  if (!supabaseConfigurado()) {
    return { ok: false, mensagem: "Supabase não configurado neste ambiente." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, mensagem: "Sessão expirada. Entre novamente para continuar." };

  const { data: perfil, error } = await supabase
    .from("profiles")
    .select("tenant_id, role_id, full_name, is_platform_admin")
    .eq("id", user.id)
    .single();

  // Mensagem deliberadamente seca: não explicamos a quem não pode entrar por
  // que foi negado.
  if (error || !perfil?.tenant_id || perfil.is_platform_admin) {
    return { ok: false, mensagem: `Você não tem permissão para ${acao}.` };
  }

  return {
    ok: true,
    supabase,
    usuarioId: user.id,
    tenantId: perfil.tenant_id,
    nome: perfil.full_name ?? user.email ?? "Você",
    papelId: perfil.role_id ?? null,
  };
}

/** O que toda Server Action do portal devolve para a interface. */
export type ResultadoAcao = { ok: true } | { ok: false; mensagem: string };
