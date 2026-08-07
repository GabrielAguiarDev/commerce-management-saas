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
  /**
   * Papel do usuário dentro do negócio. Ainda não restringe nada no app — está
   * aqui porque a sessão é onde ele chega, e porque o dia em que os
   * funcionários entrarem, a permissão vai ser lida daqui e não de uma segunda
   * consulta espalhada pelas telas.
   */
  roleId: string | null;
}

/**
 * Os códigos de erro da autenticação.
 *
 * Os três últimos são NEGATIVAS DE ACESSO, não falhas: quem cai neles digitou a
 * senha certa. Separá-los de `invalid_credentials` é o que permite dizer a
 * coisa certa — mandar "confira sua senha" para um admin de plataforma o faria
 * tentar de novo para sempre.
 */
export type AuthErrorCode =
  | 'invalid_email'
  | 'short_password'
  | 'invalid_credentials'
  | 'no_tenant'
  | 'platform_admin'
  | 'suspended'
  | 'network'
  /**
   * Autenticou, mas não deu para GRAVAR a sessão no aparelho. Separado de
   * `network` porque manda investigar o lugar oposto: o servidor respondeu
   * perfeitamente. Ver `SessionStorageError`.
   */
  | 'storage'
  | 'unknown';

/**
 * Erro tipado: a tela mapeia `codigo → mensagem` e nunca vê um erro de rede
 * cru. Mensagem em pt-BR fica em `@i18n`, não aqui — domínio não faz copy.
 */
export class AuthError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AuthError';
  }
}
