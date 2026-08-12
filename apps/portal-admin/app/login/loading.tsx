/**
 * A entrada não recebe skeleton — de propósito.
 *
 * Sem este arquivo, quem cobriria o caminho para o `/login` seria o
 * `app/loading.tsx`, com o desenho da Visão: indicadores e tabelas por cima de
 * uma tela que é um cartão centralizado. Uma fronteira que resolve com nada
 * devolve o comportamento de antes — a tela troca quando o servidor responde,
 * sem piscar uma forma que não é a desta tela.
 */
export default function Loading() {
  return null;
}
