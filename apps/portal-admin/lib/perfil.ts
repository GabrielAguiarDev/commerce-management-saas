import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * O admin logado — quem é você, para o rodapé da barra lateral.
 *
 * O painel mostrava "Rafael Aguiar" escrito à mão desde o protótipo. O nome
 * real está em `profiles.full_name`, e o RLS já garante que a consulta só
 * enxergue o próprio perfil.
 */
export interface PerfilAdmin {
  nome: string | null;
  email: string | null;
}

export async function perfilAtual(): Promise<PerfilAdmin | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  if (error) {
    // Não é motivo para derrubar o painel: a barra lateral cai no e-mail.
    console.error("[perfilAtual] falha ao ler o perfil:", error.message);
    return { nome: null, email: user.email ?? null };
  }

  return { nome: data?.full_name ?? null, email: user.email ?? null };
}
