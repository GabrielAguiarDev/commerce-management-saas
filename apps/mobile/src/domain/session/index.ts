export type { AuthErrorCode, Session, User } from './sessionTypes';
export { AuthError } from './sessionTypes';
export { SENHA_MINIMA, isValidEmail, recuperarSenha, validateCredentials } from './sessionService';

// A recuperação de senha é uma SIMULAÇÃO — ver o cabeçalho do arquivo.
export type { RecoveryErrorCode } from './passwordRecovery';
export {
  CODE_LENGTH,
  DEMO_CODE,
  RESEND_SECONDS,
  RecoveryError,
  conferirCodigo,
  mascararEmail,
  pedirCodigo,
  redefinirSenha,
  validarCodigo,
  validarNovaSenha,
} from './passwordRecovery';
export { sessionKeys, useAppAccess } from './useCases/useAppAccess';

/**
 * O LOGIN não tem `useCases/`, de propósito.
 *
 * Autenticação não é dado de servidor cacheável: é uma transição de estado do
 * app inteiro (entra/sai). Quem guarda isso é o `sessionStore`, que já expõe
 * `signIn`/`signOut` como cascas finas sobre o service. Envolver o mesmo fluxo
 * num `useMutation` só acrescentaria uma camada sem cache para gerenciar.
 *
 * O `useAppAccess` é a exceção que confirma a regra: ele NÃO é autenticação, é
 * uma leitura de entitlement no servidor — cacheável, revalidável, e consumida
 * por render. Exatamente o que o react-query existe para fazer.
 */
