/** CONTRATO DO BANCO LOCAL da fila de vendas offline. */

/**
 * O estado de uma venda na fila. Não existe `done`: quando a venda entra no
 * Supabase ela SAI da fila. Guardá-la aqui como "concluída" criaria uma segunda
 * lista de vendas no aparelho, que envelheceria em silêncio e acabaria
 * divergindo do sistema — e a pergunta que a tela faz é "o que falta subir?",
 * não "o que já subiu?".
 */
export type PendingSaleStatus = 'pending' | 'error';

export interface OfflineSaleRow {
  local_id: string;
  tenant_id: string;
  payment_method: string;
  total_cents: number;
  /** ISO 8601 do momento em que a venda foi FEITA, não em que subiu. */
  sold_at: string;
  status: PendingSaleStatus;
  error_message: string | null;
}

export interface OfflineSaleItemRow {
  local_id: string;
  product_id: string | null;
  product_name: string;
  qty: number;
  unit_price_cents: number;
}

/** Uma venda da fila com os itens já reunidos. */
export interface QueuedSaleRow {
  sale: OfflineSaleRow;
  items: OfflineSaleItemRow[];
}
