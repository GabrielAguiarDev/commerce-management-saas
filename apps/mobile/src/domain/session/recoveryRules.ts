import { SENHA_MINIMA } from './sessionRules';

/**
 * REGRAS PURAS da recuperação de senha — sem rede, sem React, sem Supabase.
 *
 * Separadas do resto do domínio pelo mesmo motivo de `sessionRules`: os testes
 * deste arquivo rodam no jest node, e importar a fronteira de rede puxaria o
 * cliente Supabase (e `react-native` atrás dele) para dentro deles.
 */

/**
 * Quantos dígitos o código tem.
 *
 * SEIS, e não um número escolhido por nós: quem gera este código é o Supabase,
 * e o token de e-mail dele tem seis dígitos. As caixas da tela leem daqui, e o
 * dia em que o `mailer_otp_length` do projeto mudar, é esta linha que muda.
 */
export const CODE_LENGTH = 6;

/**
 * Segundos até o "Reenviar código" voltar a valer.
 *
 * Sessenta porque é o intervalo mínimo que o próprio Supabase impõe entre dois
 * e-mails de recuperação para o mesmo endereço. Um botão que pudesse ser
 * tocado antes disso só renderia erro de limite — e a pessoa leria "algo deu
 * errado" tendo feito tudo certo.
 */
export const RESEND_SECONDS = 60;

export type RecoveryErrorCode =
  | 'invalid_email'
  | 'incomplete_code'
  | 'invalid_code'
  | 'short_password'
  | 'password_mismatch'
  | 'same_password'
  | 'expired_flow'
  | 'network';

/** Mesmo desenho do `AuthError`: a tela mapeia `code → mensagem` do `@i18n`. */
export class RecoveryError extends Error {
  constructor(readonly code: RecoveryErrorCode) {
    super(code);
    this.name = 'RecoveryError';
  }
}

/**
 * `gabriel@gmail.com` → `ga••••@gmail.com`.
 *
 * A tela do código precisa CONFIRMAR para onde o código foi sem reimprimir o
 * endereço inteiro — quem está com o celular na mão numa fila não é
 * necessariamente quem deveria ler aquele e-mail.
 *
 * A quantidade de pontos é FIXA, e não o tamanho do que foi escondido: um
 * `a••••••••••@` conta quantas letras tem a parte local, que é justamente o que
 * se está tentando não dizer.
 */
export function mascararEmail(email: string): string {
  const limpo = email.trim().toLowerCase();
  const arroba = limpo.lastIndexOf('@');

  // Sem arroba não há o que mascarar sem inventar. Devolve como veio: quem
  // chama já validou o formato, e mascarar lixo esconderia o erro de digitação.
  if (arroba < 1) return limpo;

  const local = limpo.slice(0, arroba);
  const dominio = limpo.slice(arroba);
  const visivel = local.slice(0, Math.min(2, local.length));

  return `${visivel}••••${dominio}`;
}

/**
 * Só o que dá para conferir SEM o servidor: se o código está completo.
 *
 * Quem diz se ele CONFERE é o Supabase — este aparelho não tem, e não pode
 * ter, o número que foi para o e-mail. Antes isto comparava com um código de
 * demonstração fixo; agora a validação de verdade acontece na rede, e o que
 * sobra aqui é evitar uma ida à rede que já se sabe inútil.
 */
export function validarCodigo(code: string): RecoveryError | null {
  if (code.length < CODE_LENGTH) return new RecoveryError('incomplete_code');
  return null;
}

export function validarNovaSenha(senha: string, confirmacao: string): RecoveryError | null {
  if (senha.length < SENHA_MINIMA) return new RecoveryError('short_password');
  // A conferência vem DEPOIS do tamanho: duas senhas curtas e iguais devem
  // reclamar do tamanho, que é o problema real, e não mandar digitar de novo.
  if (senha !== confirmacao) return new RecoveryError('password_mismatch');
  return null;
}
