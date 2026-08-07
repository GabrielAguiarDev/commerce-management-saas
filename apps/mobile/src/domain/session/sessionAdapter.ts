import { initials } from '@utils/text';

import type { SessionAPI } from './sessionApiTypes';
import { AuthError, type Session } from './sessionTypes';

/** `profiles.status` — funcionário suspenso continua existindo, mas não entra. */
const ACTIVE = 'active';

/**
 * `SessionAPI` → `Session`.
 *
 * É AQUI que mora a regra de quem pode usar o app, e ela é a mesma do portal
 * (`apps/portal-client/lib/sessao.ts`): precisa ter `tenant_id` e NÃO pode ser
 * admin de plataforma. Ficar no adapter, e não na tela, é o que garante que
 * todo caminho de entrada passe por ela — o login e o relaunch com sessão
 * gravada usam esta mesma função.
 *
 * Cada negativa vira um `AuthError` com código próprio, na fronteira, e não
 * `undefined` explodindo três telas adiante quando ninguém mais lembra de onde
 * veio.
 *
 * Note que a checagem do módulo `app` NÃO está aqui: ela é entitlement do
 * plano, não identidade, e leva a uma tela diferente (bloqueio, não login).
 * Quem a faz é o portão, com `hasAppAccess`.
 */
export function toSession(raw: SessionAPI): Session {
  const { profile } = raw;

  if (profile.is_platform_admin) {
    throw new AuthError('platform_admin');
  }

  if (!profile.tenant_id) {
    throw new AuthError('no_tenant');
  }

  // `null` é tratado como ativo de propósito: a coluna aceita nulo e um perfil
  // antigo sem status preenchido não pode ficar trancado para fora.
  if (profile.status != null && profile.status !== ACTIVE) {
    throw new AuthError('suspended');
  }

  const email = raw.user.email ?? '';
  const name = profile.full_name?.trim() || email.split('@')[0] || 'Você';

  return {
    user: { id: raw.user.id, email, name, initials: initials(name) },
    tenantId: profile.tenant_id,
    roleId: profile.role_id,
  };
}

export function toSignInPayload(email: string, password: string) {
  return { email: email.trim().toLowerCase(), password };
}
