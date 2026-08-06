/** MODELO DE DOMÍNIO das vendas. */

export interface CartItem {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
}

export interface SoldItem {
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Sale {
  id: string;
  /** `HH:mm` já formatado pelo adapter — a tela não faz conta com data. */
  time: string;
  items: SoldItem[];
  /** "2× Acarajé completo · 1× Água" — resumo pronto para a linha da lista. */
  itemsSummary: string;
  paymentMethod: string;
  totalCents: number;
  /** Venda feita offline e ainda não confirmada pelo servidor. */
  pendingSync: boolean;
}

export interface TopSeller {
  name: string;
  /**
   * The COUNT, not a rendered sentence. The adapter used to return
   * "24 unidades hoje", which baked pt-BR copy into the domain and made the
   * line impossible to translate. The screen renders it via
   * `t.units.soldToday(quantity)`.
   */
  quantity: number;
}

export interface DailySummary {
  totalCents: number;
  profitCents: number;
  saleCount: number;
  soldItems: number;
  averageTicketCents: number;
  maisVendido: TopSeller | null;
}

export type SaleErrorCode = 'empty_cart' | 'no_payment_method' | 'network' | 'unknown';

export class SaleError extends Error {
  constructor(readonly code: SaleErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'VendaError';
  }
}
