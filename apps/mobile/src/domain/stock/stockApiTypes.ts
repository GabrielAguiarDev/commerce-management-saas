/** CONTRATO DO BACKEND das movimentações de estoque. */

export interface StockMovementAPI {
  id: string;
  tenant_id: string;
  product_id: string | null;
  product_name: string;
  /** Assinado: negativo saiu, positivo entrou. */
  delta: number;
  /** 'sale' | 'purchase' | 'loss' | 'manual' */
  reason: string;
  actor_name: string | null;
  happened_label: string;
}

export interface StockMovementCreateAPI {
  tenant_id: string;
  product_id: string | null;
  product_name: string;
  delta: number;
  reason: string;
  /**
   * Quanto custou CADA unidade que entrou, em centavos. `null` na saída.
   *
   * É o que faz a compra virar despesa: sem este número não dá para lançar em
   * `costs`, e a entrada aumentaria o estoque sem tirar nada do caixa — o
   * lucro do relatório ficaria otimista pelo valor exato da compra.
   */
  unit_cost_cents: number | null;
}
