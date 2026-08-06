import { toSession, toSignInPayload } from './sessionAdapter';
import * as api from './sessionApi';
import { AuthError, type Session } from './sessionTypes';

/**
 * AS REGRAS da autenticação.
 *
 * Valida o que não deve nem sair na rede e normaliza tudo para `AuthError`.
 */

/** Suficiente para pegar erro de digitação; a validação real é do servidor. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const SENHA_MINIMA = 6;

export function validateCredentials(email: string, password: string): AuthError | null {
  if (!EMAIL.test(email.trim())) return new AuthError('invalid_email');
  if (password.length < SENHA_MINIMA) return new AuthError('short_password');
  return null;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const invalido = validateCredentials(email, password);
  if (invalido) throw invalido;

  let raw;
  try {
    raw = await api.signIn(toSignInPayload(email, password));
  } catch (e) {
    throw new AuthError('network', e instanceof Error ? e.message : undefined);
  }

  if (!raw) throw new AuthError('invalid_credentials');
  return toSession(raw);
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
  if (!EMAIL.test(email.trim())) throw new AuthError('invalid_email');
  try {
    await api.requestPasswordReset(email.trim().toLowerCase());
  } catch (e) {
    throw new AuthError('network', e instanceof Error ? e.message : undefined);
  }
}
