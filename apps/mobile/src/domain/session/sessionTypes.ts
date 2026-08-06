/** MODELO DE DOMÍNIO da sessão. */

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  /** Já calculada aqui: a tela não deve saber derivar iniciais de nome. */
  iniciais: string;
}

export interface Sessao {
  usuario: Usuario;
  tenantId: string;
  token: string;
}

export type CodigoErroAuth =
  | 'email_invalido'
  | 'senha_curta'
  | 'credenciais_invalidas'
  | 'rede'
  | 'desconhecido';

/**
 * Erro tipado: a tela mapeia `codigo → mensagem` e nunca vê um erro de rede
 * cru. Mensagem em pt-BR fica em `@i18n`, não aqui — domínio não faz copy.
 */
export class AuthError extends Error {
  constructor(readonly codigo: CodigoErroAuth, mensagem?: string) {
    super(mensagem ?? codigo);
    this.name = 'AuthError';
  }
}
