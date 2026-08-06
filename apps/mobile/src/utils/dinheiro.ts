/**
 * Dinheiro no Aguiar One é SEMPRE inteiro em centavos.
 *
 * Motivo: `0.1 + 0.2 !== 0.3`. Um carrinho de 30 itens somado em reais como
 * float acumula erro e o total da tela deixa de bater com o total do recibo.
 * A conversão para reais acontece só na formatação, uma vez, no fim.
 *
 * O protótipo formatava com `Number(n).toFixed(2).replace('.', ',')`, sem
 * separador de milhar — `R$ 28460,00`. O BRIEF pede `R$ 1.234,56`, que é a
 * forma correta em pt-BR e o que os valores altos do app exigem para serem
 * legíveis. Ficou com separador de milhar; é o único desvio deliberado do
 * protótipo na formatação de moeda.
 */

const AGRUPADOR = /\B(?=(\d{3})+(?!\d))/g;

/** `123456` → `"R$ 1.234,56"`. */
export function formatarBRL(centavos: number): string {
  return `R$ ${formatarValor(centavos)}`;
}

/** Igual a `formatarBRL`, mas sem o prefixo — para campos de entrada. */
export function formatarValor(centavos: number): string {
  const n = Math.round(Number.isFinite(centavos) ? centavos : 0);
  const negativo = n < 0;
  const abs = Math.abs(n);
  const inteiros = String(Math.floor(abs / 100)).replace(AGRUPADOR, '.');
  const decimais = String(abs % 100).padStart(2, '0');
  return `${negativo ? '-' : ''}${inteiros},${decimais}`;
}

/**
 * Assinado com o traço tipográfico do design (`−`, U+2212, não o hífen ASCII).
 * Usado na diferença do fechamento de caixa e nas movimentações de estoque.
 */
export function formatarBRLAssinado(centavos: number): string {
  const sinal = centavos >= 0 ? '+' : '−';
  return `${sinal}${formatarBRL(Math.abs(centavos))}`;
}

/**
 * Lê o que o usuário digitou num campo de dinheiro e devolve centavos.
 *
 * Regras, nesta ordem:
 *  - tudo que não for dígito, vírgula ou ponto é descartado (`R$`, espaço);
 *  - se houver vírgula, ela é O separador decimal e os pontos são milhar
 *    (`1.234,56` → 123456);
 *  - se houver só ponto, ele é decimal apenas quando separa 1 ou 2 dígitos no
 *    fim (`12.5` → 1250); caso contrário é milhar (`1.234` → 123400). É a
 *    interpretação que acerta tanto quem digita à brasileira quanto quem cola
 *    um valor vindo de teclado numérico.
 *
 * Devolve `null` para entrada vazia ou sem nenhum dígito — quem chama decide
 * se isso é erro ou "campo não preenchido". Nunca devolve `NaN`.
 */
export function lerCentavos(texto: string): number | null {
  const limpo = String(texto ?? '').replace(/[^\d.,-]/g, '');
  if (!/\d/.test(limpo)) return null;

  const negativo = limpo.trimStart().startsWith('-');
  const semSinal = limpo.replace(/-/g, '');

  let inteiro: string;
  let decimal: string;

  if (semSinal.includes(',')) {
    const partes = semSinal.split(',');
    decimal = partes.pop() ?? '';
    inteiro = partes.join('').replace(/\./g, '');
  } else {
    const pontos = semSinal.split('.');
    const ultimo = pontos.length > 1 ? (pontos[pontos.length - 1] ?? '') : '';
    if (pontos.length > 1 && ultimo.length > 0 && ultimo.length <= 2) {
      decimal = ultimo;
      inteiro = pontos.slice(0, -1).join('');
    } else {
      decimal = '';
      inteiro = pontos.join('');
    }
  }

  const centavos =
    Number(inteiro.replace(/\D/g, '') || '0') * 100 +
    Number(decimal.replace(/\D/g, '').slice(0, 2).padEnd(2, '0') || '0');

  return negativo ? -centavos : centavos;
}

/** Reais decimais vindos de uma API (`189.9`) → centavos (`18990`). */
export function reaisParaCentavos(reais: number): number {
  return Math.round(reais * 100);
}
