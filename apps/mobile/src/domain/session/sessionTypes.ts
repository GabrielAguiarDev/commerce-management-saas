/** MODELO DE DOMÍNIO da sessão. */

export interface User {
  id: string;
  email: string;
  name: string;
  /** Já calculada aqui: a tela não deve saber derivar iniciais de nome. */
  initials: string;
}

export interface Session {
  user: User;
  tenantId: string;
  token: string;
}

export type AuthErrorCode =
  | 'invalid_email'
  | 'short_password'
  | 'invalid_credentials'
  | 'network'
  | 'unknown';

/**
 * Erro tipado: a tela mapeia `codigo → mensagem` e nunca vê um erro de rede
 * cru. Mensagem em pt-BR fica em `@i18n`, não aqui — domínio não faz copy.
 */
export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AuthError';
  }
}
