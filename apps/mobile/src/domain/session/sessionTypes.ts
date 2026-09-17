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
   * Papel do usuário dentro do negócio. As capacidades do app cruzam este
   * papel com os módulos ativos do plano antes de liberar telas e ações.
   */
  roleId: string | null;
  /** Chaves de módulo autorizadas pelo papel; o dono ignora esta lista. */
  rolePermissions: string[];
  isOwner: boolean;
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
