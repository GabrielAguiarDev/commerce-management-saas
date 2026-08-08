import { SessionStorageError } from '@services/secureSessionStorage';

import { toSession, toSignInPayload } from './sessionAdapter';
import * as api from './sessionApi';
import { SENHA_MINIMA, isValidEmail } from './sessionRules';
import { AuthError, type Session } from './sessionTypes';

/**
 * AS REGRAS da autenticação.
 *
 * Valida o que não deve nem sair na rede e normaliza tudo para `AuthError`.
 *
 * O formato de e-mail e o mínimo da senha moram em `sessionRules.ts`, que é
 * puro: este arquivo puxa `react-native` pela porta do `secureSessionStorage` e
 * não pode ser importado de um teste do jest node.
 */

export { SENHA_MINIMA, isValidEmail };

export function validateCredentials(email: string, password: string): AuthError | null {
  if (!isValidEmail(email)) return new AuthError('invalid_email');
  if (password.length < SENHA_MINIMA) return new AuthError('short_password');
  return null;
}

/**
 * Um `AuthError` que já veio do adapter passa intacto — ele carrega o motivo
 * exato da negativa. Só o que é genuinamente desconhecido vira `network`.
 */
function normalize(error: unknown): never {
  if (error instanceof AuthError) throw error;
  throw new AuthError('network', error instanceof Error ? error.message : undefined);
}

export async function signIn(email: string, password: string): Promise<Session> {
  const invalido = validateCredentials(email, password);
  if (invalido) throw invalido;

  let raw;
  try {
    raw = await api.signIn(toSignInPayload(email, password));
  } catch (e) {
    // NÃO colapse tudo em `network`. A falha de gravar a sessão acontece DEPOIS
    // de o servidor ter respondido certo, e dizer "sem conexão" ali manda
    // investigar exatamente o lado que está saudável.
    if (e instanceof SessionStorageError) throw new AuthError('storage', e.message);
    throw new AuthError('network', e instanceof Error ? e.message : undefined);
  }

  if (!raw) throw new AuthError('invalid_credentials');

  try {
    return toSession(raw);
  } catch (e) {
    // Autenticou, mas não pode usar o app (sem tenant, admin de plataforma,
    // suspenso). A sessão do Supabase JÁ EXISTE neste ponto — deixá-la de pé
    // faria o próximo relaunch entrar direto, contornando a regra que acabou de
    // barrar. Encerrar aqui é o que mantém a negativa efetiva.
    await api.signOut().catch(() => undefined);
    return normalize(e);
  }
}

/**
 * A sessão gravada no aparelho, no boot. `null` = ninguém logado.
 *
 * Diferente de `signIn`, uma sessão inválida aqui NÃO é erro para a tela: é
 * simplesmente "vá para o login". Por isso as negativas viram `null` em vez de
 * exceção — o relaunch não tem onde mostrar um toast.
 */
export async function getCurrentSession(): Promise<Session | null> {
  let raw;
  try {
    raw = await api.getCurrentSession();
  } catch {
    // Sem rede no boot: não dá para afirmar que não há sessão. Devolver `null`
    // manda para o login, o que é o comportamento honesto — este app ainda não
    // tem modo offline (fase posterior).
    return null;
  }

  if (!raw) return null;

  try {
    return toSession(raw);
  } catch {
    await api.signOut().catch(() => undefined);
    return null;
  }
}

/**
 * O plano inclui o app?
 *
 * ⚠️ ESTA FUNÇÃO PROPAGA O ERRO DE PROPÓSITO, e já foi o contrário — o que
 * causava um travamento feio: ela devolvia `null` ao falhar, o `useAppAccess`
 * não distinguia "ainda não sei" de "não deu para saber", e o portão devolvia
 * `null` PARA SEMPRE. O app parava numa tela em branco, sem rota, sem mensagem
 * e sem saída.
 *
 * Deixando o erro subir, o react-query o enxerga: tenta de novo sozinho e, se
 * insistir em falhar, expõe o estado de falha para o portão mostrar uma tela
 * com "tentar de novo". Falha visível é sempre melhor que espera infinita.
 */
export async function checkAppAccess(): Promise<boolean> {
  return api.hasAppAccess();
}

export async function signOut(): Promise<void> {
  try {
    await api.signOut();
  } catch {
    // Sair é local: se o servidor não respondeu, a sessão vai embora do
    // aparelho do mesmo jeito. Falhar aqui só prenderia o usuário dentro.
  }
}

export async function recuperarSenha(email: string): Promise<void> {
  if (!isValidEmail(email)) throw new AuthError('invalid_email');
  try {
    await api.requestPasswordReset(email.trim().toLowerCase());
  } catch (e) {
    throw new AuthError('network', e instanceof Error ? e.message : undefined);
  }
}

export { onAuthStateChange } from './sessionApi';
