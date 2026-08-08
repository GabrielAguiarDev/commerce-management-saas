// De `sessionRules`, e NÃO de `sessionService`: o service importa o
// armazenamento seguro, que puxa `react-native` — e os testes deste arquivo
// rodam no jest node. Ver o cabeçalho de `sessionRules.ts`.
import { SENHA_MINIMA, isValidEmail } from './sessionRules';

/**
 * RECUPERAÇÃO DE SENHA — SIMULAÇÃO.
 *
 * ⚠️ NADA AQUI FALA COM O SERVIDOR. Nenhum e-mail é enviado, nenhum código é
 * gerado do outro lado e nenhuma senha é trocada de verdade. É a casca do fluxo
 * — três telas, as validações e os estados de erro — para o comportamento ser
 * decidido e revisado antes de existir backend para ele.
 *
 * POR QUE ISOLADO NUM ARQUIVO SÓ, e não espalhado pelas telas: quando o fluxo
 * real chegar, é este arquivo que vira `Api` + `Adapter` + `Service` como os
 * outros domínios. As telas chamam `pedirCodigo`/`conferirCodigo`/
 * `redefinirSenha` e não sabem que hoje isso é um `setTimeout` — então trocar o
 * miolo não mexe em nenhuma delas.
 *
 * O que JÁ é definitivo e sobrevive à troca: as regras puras (`mascararEmail`,
 * o tamanho do código, o mínimo da senha, a conferência das duas senhas) e os
 * códigos de erro. É o que está sob teste.
 *
 * O Supabase já tem o primeiro passo pronto — `sessionService.recuperarSenha`
 * dispara o `resetPasswordForEmail`. Ele NÃO é usado por estas telas de
 * propósito: mandar um e-mail de verdade e depois pedir um código inventado
 * deixaria a pessoa com duas recuperações concorrentes na mão, e a real levaria
 * para uma página web fora do app.
 */

/** Quantos dígitos o código tem. O teclado e as caixas leem daqui. */
export const CODE_LENGTH = 4;

/** Segundos de espera até o "Reenviar código" voltar a valer. */
export const RESEND_SECONDS = 60;

/**
 * O código que a simulação aceita.
 *
 * Fixo e ANUNCIADO NA TELA de propósito: um mock que aceita qualquer coisa não
 * tem como mostrar o estado de erro, que é metade do que esta tela precisa
 * provar antes de virar código de verdade.
 */
export const DEMO_CODE = '1234';

/** Quanto a simulação demora, para a tela exercitar mesmo o `loading`. */
const FAKE_DELAY = 700;

export type RecoveryErrorCode =
  | 'invalid_email'
  | 'incomplete_code'
  | 'invalid_code'
  | 'short_password'
  | 'password_mismatch';

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

export function validarCodigo(code: string): RecoveryError | null {
  if (code.length < CODE_LENGTH) return new RecoveryError('incomplete_code');
  if (code !== DEMO_CODE) return new RecoveryError('invalid_code');
  return null;
}

export function validarNovaSenha(senha: string, confirmacao: string): RecoveryError | null {
  if (senha.length < SENHA_MINIMA) return new RecoveryError('short_password');
  // A conferência vem DEPOIS do tamanho: duas senhas curtas e iguais devem
  // reclamar do tamanho, que é o problema real, e não mandar digitar de novo.
  if (senha !== confirmacao) return new RecoveryError('password_mismatch');
  return null;
}

const espera = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Passo 1 — "enviar" o código. Devolve o e-mail já mascarado, que é o que a
 * tela seguinte mostra.
 *
 * Um e-mail que não existe cai aqui EXATAMENTE como um que existe, e isso é
 * deliberado: responder "não temos essa conta" transforma a tela num verificador
 * de quem é cliente. É a mesma decisão do login (ver `sessionApi.signIn`), e
 * vale manter no mock para o fluxo real não nascer diferente.
 */
export async function pedirCodigo(email: string): Promise<string> {
  if (!isValidEmail(email)) throw new RecoveryError('invalid_email');
  await espera(FAKE_DELAY);
  return mascararEmail(email);
}

export async function conferirCodigo(code: string): Promise<void> {
  const invalido = validarCodigo(code);
  if (invalido) throw invalido;
  await espera(FAKE_DELAY);
}

export async function redefinirSenha(senha: string, confirmacao: string): Promise<void> {
  const invalida = validarNovaSenha(senha, confirmacao);
  if (invalida) throw invalida;
  await espera(FAKE_DELAY);
}
