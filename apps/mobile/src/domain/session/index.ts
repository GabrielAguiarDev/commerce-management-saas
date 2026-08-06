export type { AuthErrorCode, Session, User } from './sessionTypes';
export { AuthError } from './sessionTypes';
export { SENHA_MINIMA, recuperarSenha, validateCredentials } from './sessionService';

/**
 * Sem `useCases/` neste domínio, de propósito.
 *
 * Autenticação não é dado de servidor cacheável: é uma transição de estado do
 * app inteiro (entra/sai). Quem guarda isso é o `sessaoStore`, que já expõe
 * `entrar`/`sair` como cascas finas sobre o service. Envolver o mesmo fluxo num
 * `useMutation` só acrescentaria uma camada sem cache para gerenciar.
 *
 * FASE BACKEND: continua assim. O que muda é o corpo de `sessionApi.ts`.
 */
