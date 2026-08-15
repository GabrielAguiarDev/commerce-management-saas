import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente do SERVIDOR com a sessão do usuário logado (lida dos cookies).
 *
 * Segurança: usa a chave pública e roda sob o RLS, no contexto de quem está
 * logado. É este cliente que responde "quem é o usuário desta requisição?" —
 * por isso ele é quem autoriza a operação, antes de qualquer uso do cliente
 * admin. Ver `lib/supabase/admin.ts`.
 */
/**
 * Se este ambiente tem credenciais do Supabase.
 *
 * O console roda com dados de exemplo enquanto o `.env.local` não existe (ver
 * `proxy.ts`), então as rotas de recuperação de senha precisam saber a
 * diferença entre "o link falhou" e "não há Supabase aqui" antes de tentar
 * qualquer chamada.
 */
export function supabaseConfigurado(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado de um Server Component, que não pode escrever cookies.
            // Pode ignorar: o middleware é quem renova a sessão.
          }
        },
      },
    },
  );
}
