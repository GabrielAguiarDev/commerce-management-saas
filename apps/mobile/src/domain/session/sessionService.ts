import { toSessao, toSignInPayload } from './sessionAdapter';
import * as api from './sessionApi';
import { AuthError, type Sessao } from './sessionTypes';

/**
 * AS REGRAS da autenticação.
 *
 * Valida o que não deve nem sair na rede e normaliza tudo para `AuthError`.
 */

/** Suficiente para pegar erro de digitação; a validação real é do servidor. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const SENHA_MINIMA = 6;

export function validarCredenciais(email: string, senha: string): AuthError | null {
  if (!EMAIL.test(email.trim())) return new AuthError('email_invalido');
  if (senha.length < SENHA_MINIMA) return new AuthError('senha_curta');
  return null;
}

export async function entrar(email: string, senha: string): Promise<Sessao> {
  const invalido = validarCredenciais(email, senha);
  if (invalido) throw invalido;

  let raw;
  try {
    raw = await api.entrar(toSignInPayload(email, senha));
  } catch (e) {
    throw new AuthError('rede', e instanceof Error ? e.message : undefined);
  }

  if (!raw) throw new AuthError('credenciais_invalidas');
  return toSessao(raw);
}

export async function sair(): Promise<void> {
  try {
    await api.sair();
  } catch {
    // Sair é local: se o servidor não respondeu, a sessão vai embora do
    // aparelho do mesmo jeito. Falhar aqui só prenderia o usuário dentro.
  }
}

export async function recuperarSenha(email: string): Promise<void> {
  if (!EMAIL.test(email.trim())) throw new AuthError('email_invalido');
  try {
    await api.pedirRecuperacaoDeSenha(email.trim().toLowerCase());
  } catch (e) {
    throw new AuthError('rede', e instanceof Error ? e.message : undefined);
  }
}
