import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente ADMINISTRATIVO — usa a `service_role`.
 *
 * ⚠️  SEGURANÇA — leia antes de usar ⚠️
 *
 * A `service_role` IGNORA o RLS e pode ler, escrever e apagar qualquer linha de
 * qualquer tenant, além de administrar o Auth. Ela equivale a acesso total ao
 * banco.
 *
 * Três proteções mantêm essa chave longe do navegador:
 *
 * 1. `import "server-only"` (primeira linha): se algum Client Component
 *    importar este arquivo, mesmo por engano, o build FALHA. É a rede de
 *    segurança que não depende de disciplina de ninguém.
 * 2. A variável NÃO tem o prefixo `NEXT_PUBLIC_`, então o Next.js jamais a
 *    injeta no bundle do cliente.
 * 3. A leitura de `process.env` acontece dentro da função, não no topo do
 *    módulo — importar o arquivo não basta para tocar no segredo.
 *
 * REGRA DE USO: só chame isto dentro de uma Server Action ou Route Handler, e
 * somente DEPOIS de já ter confirmado que quem pediu a operação é admin da
 * plataforma. Este cliente não sabe quem é o usuário logado — ele executa o que
 * mandarem. A autorização é responsabilidade de quem o chama.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      "Supabase admin não configurado: defina NEXT_PUBLIC_SUPABASE_URL e " +
        "SUPABASE_SERVICE_ROLE_KEY no .env.local do portal-admin.",
    );
  }

  return createSupabaseClient(url, serviceRole, {
    auth: {
      // Este cliente não representa uma pessoa: nada de sessão, nada de
      // renovar token, nada de gravar cookie.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
