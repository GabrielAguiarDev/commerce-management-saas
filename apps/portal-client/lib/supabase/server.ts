import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente do SERVIDOR com a sessão do usuário logado (lida dos cookies).
 *
 * É este cliente que responde "quem é o usuário desta requisição?" — e é por
 * ele que passa toda leitura e escrita do portal. O RLS resolve o isolamento:
 * nenhuma consulta daqui precisa (nem deve) filtrar por `tenant_id` à mão.
 */
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

/** `true` quando o ambiente tem as credenciais do Supabase configuradas. */
export function supabaseConfigurado(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
