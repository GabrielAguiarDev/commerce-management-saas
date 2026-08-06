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
}
