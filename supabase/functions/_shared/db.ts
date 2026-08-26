import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

/**
 * O cliente das Edge Functions fiscais.
 *
 * `service_role` — e é o único lugar do sistema onde ela aparece. As funções
 * `fiscal_document_payload` e `mark_fiscal_document` tiveram o EXECUTE revogado
 * de `authenticated` justamente para que só daqui se chame: escrever o status
 * de uma nota é afirmar o que a SEFAZ respondeu, e isso não pode ser uma
 * afirmação do navegador.
 *
 * `persistSession: false` porque não há sessão nenhuma: cada invocação nasce e
 * morre sozinha.
 */
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    throw new Error("Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na função.");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Cliente com o JWT de QUEM CHAMOU — o oposto do de cima.
 *
 * Serve para uma coisa só: provar que o usuário logado é dono do documento
 * que ele mandou emitir. A prova é a própria policy de select de
 * `fiscal_documents`, que já existe e já filtra por tenant — perguntar ao RLS
 * é melhor do que reescrever a regra aqui e arriscar que as duas divirjam.
 */
export function userClient(authHeader: string): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");

  if (!url || !anon) {
    throw new Error("Faltam SUPABASE_URL e SUPABASE_ANON_KEY na função.");
  }

  return createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
}

/** A chamada veio da chave de serviço (a `fiscal-retry`, ou um cron)? */
export function isServiceCall(authHeader: string): boolean {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return !!key && authHeader === `Bearer ${key}`;
}

/** Resposta JSON curta — as três funções respondem no mesmo formato. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
