"use server";

import type { ActionResult } from "@/lib/autorizacao";
import { ROUTES } from "@/lib/rotas";
import { createClient, supabaseConfigurado } from "@/lib/supabase/server";

/**
 * Pede ao Supabase o e-mail com o link de redefinição.
 *
 * Roda no SERVIDOR — não porque precise de sessão (não há nenhuma aqui), mas
 * para que o endereço do console saia de `NEXT_PUBLIC_SITE_URL` e não do que o
 * navegador diz ser a sua própria origem. É esse valor que o Supabase escreve
 * no `{{ .RedirectTo }}` do template, e ele precisa bater com a allowlist do
 * painel. Era exatamente aqui que o console errava: mandava
 * `window.location.origin + "/login"`, uma URL que não está autorizada e para a
 * qual não existe handler — o Supabase caía no Site URL do projeto e o link
 * levava o administrador para o portal do cliente.
 *
 * NÃO usa `requireAdmin`: aquilo é o portão das operações da plataforma, e
 * exige sessão de admin. Quem pede um link de recuperação, por definição, não
 * tem sessão nenhuma.
 *
 * SOBRE O SIGILO: a resposta é sempre a mesma, exista ou não conta com aquele
 * e-mail. Diferenciar os dois casos — na mensagem, no tempo de resposta ou num
 * erro na tela — entregaria a quem tenta adivinhar a lista de quem administra a
 * plataforma. É a mesma postura do login, que não separa "e-mail não existe" de
 * "senha errada".
 */
export async function requestPasswordReset(email: string): Promise<ActionResult> {
  const address = email.trim();
  if (!address) return { ok: false, message: "Informe o seu e-mail." };

  if (!supabaseConfigurado()) {
    return { ok: false, message: "Supabase não configurado neste ambiente." };
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) {
    // Sem isto o Supabase cairia no Site URL padrão do projeto e o link do
    // e-mail levaria para outro portal. Melhor falhar aqui, visível.
    return { ok: false, message: "NEXT_PUBLIC_SITE_URL não está configurada neste ambiente." };
  }

  const supabase = await createClient();

  /**
   * O erro é DESCARTADO de propósito.
   *
   * "E-mail não cadastrado" é exatamente o que não podemos contar. O preço é
   * que um limite de envio do Supabase também passa em silêncio — a pessoa vê
   * "enviamos" e o e-mail não chega. É o lado certo do risco: um envio a menos
   * incomoda uma pessoa; a lista de administradores vazada, a plataforma toda.
   */
  await supabase.auth.resetPasswordForEmail(address, {
    redirectTo: `${site}${ROUTES.authConfirmar}`,
  });

  return { ok: true };
}
