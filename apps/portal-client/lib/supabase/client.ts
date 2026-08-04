import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente do NAVEGADOR — usado em Client Components.
 *
 * Segurança: usa apenas a chave pública (anon/publishable). Quem protege os
 * dados é o RLS, que filtra tudo pelo tenant do usuário logado.
 *
 * O portal do cliente NÃO tem um `admin.ts`: nenhuma operação daqui precisa
 * ignorar o RLS. Se algum dia parecer que precisa, a operação pertence ao
 * painel admin ou a uma Edge Function — não a este projeto.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
