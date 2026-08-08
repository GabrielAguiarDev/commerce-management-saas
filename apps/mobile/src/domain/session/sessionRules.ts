/**
 * As regras de FORMATO das credenciais — e nada além disso.
 *
 * Vive fora do `sessionService` por um motivo bem concreto: o service importa
 * `@services/secureSessionStorage`, que puxa `react-native` para dentro do
 * grafo. Quem importa o service num teste do jest node quebra na primeira
 * linha, com um erro de sintaxe que não tem nada a ver com o que se queria
 * testar. É a mesma regra do blueprint sobre domínio não importar barrel de UI.
 *
 * Aqui é tudo função pura sobre string. A `passwordRecovery` e o
 * `sessionService` leem daqui para não terem duas peneiras de e-mail
 * divergindo em silêncio no endereço estranho de um cliente só.
 */

/** Suficiente para pegar erro de digitação; a validação real é do servidor. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const SENHA_MINIMA = 6;

export function isValidEmail(email: string): boolean {
  return EMAIL.test(email.trim());
}
