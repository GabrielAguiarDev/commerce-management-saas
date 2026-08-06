import { USUARIOS_API } from '@data/usuarios';
import { esperar } from '@services/mockLatency';

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
export async function entrar(payload: SignInPayloadAPI): Promise<SessionAPI | null> {
  await esperar(420);

  const registro = USUARIOS_API[payload.email];
  if (!registro || payload.password.length < 6) return null;

  return {
    access_token: `mock.${registro.user.id}.${Date.now()}`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
    user: registro.user,
  };
}

export async function sair(): Promise<void> {
  await esperar(120);
}

export async function pedirRecuperacaoDeSenha(email: string): Promise<void> {
  await esperar(320);
  // No mock não há e-mail enviado — e de propósito não devolvemos se a conta
  // existe: responder "esse e-mail não existe" é enumeração de usuários.
  void email;
}
