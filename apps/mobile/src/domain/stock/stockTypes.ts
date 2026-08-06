/** MODELO DE DOMÍNIO das movimentações de estoque. */

export interface Movimentacao {
  id: string;
  produtoNome: string;
  /** Negativo é saída, positivo é entrada. Zero nunca é gravado. */
  delta: number;
  /** "−3" / "+20", já com o traço tipográfico do design. */
  sinal: string;
  /** "saída automática por venda", "perda registrada por Maria". */
  origem: string;
  quando: string;
}

export type CodigoErroEstoque = 'produto_obrigatorio' | 'quantidade_invalida' | 'rede';

export class EstoqueError extends Error {
  constructor(readonly codigo: CodigoErroEstoque, mensagem?: string) {
    super(mensagem ?? codigo);
    this.name = 'EstoqueError';
  }
}
