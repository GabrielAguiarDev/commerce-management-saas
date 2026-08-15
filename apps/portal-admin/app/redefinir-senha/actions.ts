"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/autorizacao";
import { ROUTES } from "@/lib/rotas";
import { passwordProblem } from "@/lib/senha";
import { createClient, supabaseConfigurado } from "@/lib/supabase/server";

/**
 * Grava a nova senha de quem chegou pelo link do e-mail.
 *
 * A sessão que autoriza isto foi criada em `app/auth/confirmar/route.ts`, com o
 * token de uso único. O `updateUser` age sobre o dono da sessão — não recebe
 * nem aceita um id de usuário —, então não há como esta ação trocar a senha de
 * outra pessoa, venha o que vier no corpo da requisição.
 *
 * NÃO usa `requireAdmin`: aquilo é o portão das operações da PLATAFORMA, e
 * exige perfil com `is_platform_admin`. Aqui a operação é sobre a própria
 * conta, e trocar a senha da própria conta não depende de ter permissão de
 * administrador. O que é indispensável — haver sessão — está checado logo
 * abaixo.
 */
export async function setNewPassword(
  password: string,
  confirmation: string,
): Promise<ActionResult> {
  // A mesma regra da tela, de novo: uma Server Action é um endpoint HTTP, e
  // quem a chama direto não passou por formulário nenhum.
  const problem = passwordProblem(password, confirmation);
  if (problem) return { ok: false, message: problem };

  if (!supabaseConfigurado()) {
    return { ok: false, message: "Supabase não configurado neste ambiente." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O link de recuperação tem prazo. Passou dele com a tela aberta, a sessão
  // não existe mais e a pessoa precisa pedir outro.
  if (!user) redirect(ROUTES.esqueciSenha);

  const { error } = await supabase.auth.updateUser({ password });

  // Aqui a mensagem do Supabase vem inteira: é a rede de segurança para uma
  // exigência do painel mais dura que a nossa (`passwordProblem`), e a pessoa
  // precisa saber o que corrigir.
  if (error) return { ok: false, message: error.message };

  /**
   * Sai da sessão antes de mandar para o login.
   *
   * A sessão do link de recuperação nasceu de um e-mail, não de uma senha
   * digitada. Deixá-la de pé entregaria o console a quem tivesse acesso àquela
   * caixa de entrada — e este console enxerga todos os tenants. Entrar de novo
   * com a senha nova custa dez segundos e confirma, para a própria pessoa, que
   * a troca funcionou.
   */
  await supabase.auth.signOut();

  redirect(`${ROUTES.login}?senha_alterada=1`);
}
