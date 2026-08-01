import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente do NAVEGADOR — usado em Client Components.
 *
 * Segurança: usa apenas a chave pública (anon/publishable). Quem protege os
 * dados aqui é o RLS do Supabase. A `service_role` NUNCA passa por este
 * arquivo — ele é empacotado e enviado ao navegador.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
