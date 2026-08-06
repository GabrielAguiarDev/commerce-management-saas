import { iniciais } from '@utils/texto';

import type { SessionAPI } from './sessionApiTypes';
import { AuthError, type Sessao } from './sessionTypes';

/**
 * `SessionAPI` → `Sessao`.
 *
 * Achata `user.user_metadata` (dois níveis) num modelo raso, deriva `iniciais`
 * e defende contra os nulos que o Supabase Auth admite em `email` e em
 * `user_metadata`. Sem `tenant_id` não existe app: isso é erro de contrato e
 * vira erro nomeado AQUI, na fronteira — não `undefined` explodindo três telas
 * adiante, quando ninguém mais lembra de onde veio.
 */
export function toSessao(raw: SessionAPI): Sessao {
  const meta = raw.user.user_metadata ?? {};
  const tenantId = meta.tenant_id ?? null;

  if (!tenantId) {
    throw new AuthError('desconhecido', 'Sessão sem negócio associado.');
  }

  const email = raw.user.email ?? '';
  const nome = meta.full_name?.trim() || email.split('@')[0] || 'Você';

  return {
    usuario: { id: raw.user.id, email, nome, iniciais: iniciais(nome) },
    tenantId,
    token: raw.access_token,
  };
}

export function toSignInPayload(email: string, senha: string) {
  return { email: email.trim().toLowerCase(), password: senha };
}
