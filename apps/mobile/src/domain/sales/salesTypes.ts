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
  /**
   * O instante ISO em que a venda foi feita.
   *
   * A lista de hoje não precisa dele; o HISTÓRICO precisa, porque é ele que
   * decide em qual dia a venda cai. Agrupar por `time` seria juntar as 14h de
   * hoje com as 14h da semana passada.
   */
  soldAt: string;
  items: SoldItem[];
  /** "2× Acarajé completo · 1× Água" — resumo pronto para a linha da lista. */
  itemsSummary: string;
  paymentMethod: string;
  totalCents: number;
  /**
   * ESTORNADA: continua no histórico, riscada, fora de todo total.
   *
   * O nome é `refunded` e não `cancelled` porque é o que o banco guarda e o
   * que o portal escreve — as duas telas falam da mesma linha.
   */
  refunded: boolean;
  /** Venda feita offline e ainda não confirmada pelo servidor. */
  pendingSync: boolean;
}

/**
 * Um DIA do histórico: o cabeçalho e as vendas embaixo dele.
 *
 * Montado por `groupSalesByDay`, que é função pura. O rótulo visível ("Hoje",
 * "12 de agosto") NÃO vem daqui de propósito — vem da tela, pelo i18n. O que o
 * domínio entrega é o fato: qual dia é, e se ele é hoje ou ontem.
 */
export interface SaleDay {
  /** `YYYY-MM-DD` no fuso do aparelho — a identidade do grupo. */
  key: string;
  /** O ISO da primeira venda do dia, para a tela formatar a data. */
  iso: string;
  /** `today` e `yesterday` ganham nome próprio na tela; o resto vira data. */
  relative: 'today' | 'yesterday' | null;
  sales: Sale[];
  /** Soma do dia SEM as estornadas — o que de fato entrou. */
  totalCents: number;
  /** Quantas contam para o total (estornadas não contam). */
  saleCount: number;
  refundedCount: number;
}

/**
 * O RESUMO de um recorte do histórico — o cabeçalho que muda com o filtro.
 *
 * Vem do banco sobre o período INTEIRO, não da página carregada. Ver
 * `salesApi.fetchSalesTotals`.
 */
export interface SalesTotals {
  saleCount: number;
  totalCents: number;
  refundedCount: number;
}

/** Uma página do histórico, do jeito que a rolagem infinita consome. */
export interface SalesPage {
  sales: Sale[];
  /** Onde a próxima página começa. `null` = acabou. */
  nextOffset: number | null;
}

/**
 * O que sobrou de um estorno.
 *
 * `stockFailures > 0` significa que a venda FOI estornada mas o saldo de algum
 * item não se moveu. Não é erro da operação — é uma pendência que a tela
 * precisa dizer em voz alta, porque só quem está ali pode ajustar o estoque.
 */
export interface RefundResult {
  stockFailures: number;
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
