import { supabase } from '@services/supabase';

/**
 * FRONTEIRA DE REDE da recuperação de senha.
 *
 * ⚠️ ÚNICO ARQUIVO DESTE FLUXO QUE FALA COM O SUPABASE. Ele não valida nada e
 * não traduz erro nenhum — quem faz isso é `recoveryService`.
 *
 * ┌─ POR QUE CÓDIGO, E NÃO O LINK DO E-MAIL ───────────────────────────────┐
 * │ O `resetPasswordForEmail` manda um e-mail que contém as DUAS coisas: um │
 * │ link (`{{ .ConfirmationURL }}`) e um código (`{{ .Token }}`). O link    │
 * │ abre uma página WEB, fora do app — e devolver alguém para o navegador   │
 * │ no meio de um fluxo do celular é perdê-lo ali.                         │
 * │                                                                        │
 * │ Com o código, as três telas do app resolvem tudo sem sair do app.      │
 * │                                                                        │
 * │ ⚠️ DEPENDE DO TEMPLATE DO PROJETO. O modelo padrão do Supabase traz só  │
 * │ o link. O template de "Reset Password" precisa conter `{{ .Token }}`,   │
 * │ senão o e-mail chega sem o número e não há o que digitar na tela 2.    │
 * └────────────────────────────────────────────────────────────────────────┘
 */

/**
 * Passo 1 — dispara o e-mail com o código.
 *
 * Sem `redirectTo`: não usamos o link, e apontá-lo para um deep link que o app
 * não trata deixaria quem tocasse nele num beco.
 */
export async function sendRecoveryCode(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

/**
 * Passo 2 — confere o código.
 *
 * ⚠️ ISTO CRIA UMA SESSÃO. É assim que o Supabase funciona: provar que você
 * abriu o e-mail da conta é provar quem você é, e `verifyOtp` devolve tokens
 * como um login devolveria. Não é brecha — é a mesma prova que o fluxo web
 * usa —, mas tem uma consequência que o passo 3 precisa resolver: sem cuidado,
 * a pessoa acabaria DENTRO do app com a senha antiga ainda valendo.
 */
export async function verifyRecoveryCode(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
  if (error) throw error;
}

/** Passo 3 — troca a senha do usuário da sessão criada no passo 2. */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

/**
 * Encerra a sessão que o passo 2 abriu.
 *
 * Chamada tanto no fim feliz quanto na desistência: a senha nova só vale
 * depois de ser digitada no login, e uma recuperação abandonada não pode
 * deixar o aparelho logado com a senha que a pessoa justamente esqueceu.
 */
export async function discardRecoverySession(): Promise<void> {
  await supabase.auth.signOut();
}
