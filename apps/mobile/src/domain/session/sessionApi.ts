import { USERS_API } from '@data/users';
import { delay } from '@services/mockLatency';

import type { SessionAPI, SignInPayloadAPI } from './sessionApiTypes';

/**
 * FRONTEIRA DE REDE da autenticação.
 *
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE MUDA COM O SUPABASE: `entrar` vira
 * `supabase.auth.signInWithPassword(payload)` e devolve a mesma `SessionAPI`.
 *
 * Só aqui existem relógio (`Date.now`) e geração de token.
 */

/** `null` = credencial inválida. Erro de verdade sobe como exceção. */
export async function signIn(payload: SignInPayloadAPI): Promise<SessionAPI | null> {
  await delay(420);

  const registro = USERS_API[payload.email];
  if (!registro || payload.password.length < 6) return null;

  return {
    access_token: `mock.${registro.user.id}.${Date.now()}`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
    user: registro.user,
  };
}

export async function signOut(): Promise<void> {
  await delay(120);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await delay(320);
  // No mock não há e-mail enviado — e de propósito não devolvemos se a conta
  // existe: responder "esse e-mail não existe" é enumeração de usuários.
  void email;
}
