/** MODELO DE DOMÍNIO das movimentações de estoque. */

export interface StockMovement {
  id: string;
  productName: string;
  /** Negativo é saída, positivo é entrada. Zero nunca é gravado. */
  delta: number;
  /** "−3" / "+20", já com o traço tipográfico do design. */
  sinal: string;
  /** "saída automática por venda", "perda registrada por Maria". */
  origem: string;
  quando: string;
}

export type StockErrorCode = 'product_required' | 'invalid_quantity' | 'network';

export class StockError extends Error {
  constructor(readonly code: StockErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'EstoqueError';
  }
}
