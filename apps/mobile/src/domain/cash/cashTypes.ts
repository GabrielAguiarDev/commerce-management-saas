/** MODELO DE DOMÍNIO do caixa. */

export interface ReceiptsByMethod {
  method: string;
  amountCents: number;
}

export interface OpenShift {
  id: string;
  /** "08:12" — hora local já formatada pelo adapter. */
  openedAt: string;
  aberturaCentavos: number;
  /** O que deveria estar fisicamente na gaveta agora. */
  gavetaCentavos: number;
  cashSalesCents: number;
  receipts: ReceiptsByMethod[];
}

export interface ClosedShift {
  id: string;
  /** "Ontem, 25/07". */
  dateLabel: string;
  /** "08:05 → 18:40". */
  periodLabel: string;
  totalCents: number;
  diferencaCentavos: number;
}

export interface CountLine {
  /** "Dinheiro" | "Pix" | "Cartão" — o agrupamento que o dono confere. */
  method: string;
  esperadoCentavos: number;
}

export interface CloseOutDifference {
  /** `false` enquanto nenhum campo foi preenchido: a tela mostra R$ 0,00. */
  informado: boolean;
  diferencaCentavos: number;
}

export type AdjustmentType = 'withdrawal' | 'topUp';

export type CashErrorCode =
  | 'cash_closed'
  | 'cash_already_open'
  | 'invalid_amount'
  | 'network'
  | 'unknown';

export class CashError extends Error {
  constructor(readonly code: CashErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'CaixaError';
  }
}
