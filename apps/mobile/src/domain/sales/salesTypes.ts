import type { PendingSaleStatus } from './offlineQueueTypes';

/** MODELO DE DOMÍNIO das vendas. */

export type { PendingSaleStatus };

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

/**
 * Uma venda que está NA FILA do aparelho, esperando entrar no sistema.
 *
 * Deliberadamente parecida com `Sale`, mas NÃO é a mesma coisa, e misturar as
 * duas seria o erro mais caro deste domínio: `Sale` é um fato registrado no
 * servidor; `PendingSale` é um fato que só este aparelho conhece. A identidade
 * dela é `localId`, não `id` — ela ainda não tem id de banco.
 */
export interface PendingSale {
  localId: string;
  /** `HH:mm` da hora em que a venda foi FEITA — não da sincronização. */
  time: string;
  /** "hoje" ou "12/08" — a fila pode atravessar a virada do dia. */
  day: string;
  items: SoldItem[];
  itemsSummary: string;
  paymentMethod: string;
  totalCents: number;
  status: PendingSaleStatus;
  /** Por que a última tentativa falhou. `null` enquanto nunca falhou. */
  failure: SyncFailure | null;
}

/** O que fazer com uma venda que voltou com erro. */
export type SyncErrorCode =
  | 'insufficient_stock'
  | 'product_missing'
  | 'not_allowed'
  | 'offline'
  | 'unknown';

export interface SyncFailure {
  code: SyncErrorCode;
  /**
   * A mensagem CRUA do servidor, quando há uma.
   *
   * Guardada mesmo nos casos que sabemos traduzir, e mostrada na tela quando o
   * código é `unknown`. Um "algo deu errado" sem detalhe deixa o dono do
   * negócio sem nada para nos contar quando ligar para o suporte — e é
   * exatamente ele quem tem a venda travada.
   */
  detail: string | null;
}

/** O balanço de uma sincronização, para o resumo do fim. */
export interface SyncSummary {
  synced: number;
  failed: number;
}

export type SaleErrorCode = 'empty_cart' | 'no_payment_method' | 'network' | 'unknown';

export class SaleError extends Error {
  constructor(readonly code: SaleErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'VendaError';
  }
}
