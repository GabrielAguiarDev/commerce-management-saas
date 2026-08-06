/** CONTRATO DO BACKEND das vendas. */

export interface SaleItemAPI {
  product_id: string;
  product_name: string;
  qty: number;
  unit_price_cents: number;
}

export interface SaleAPI {
  id: string;
  tenant_id: string;
  /** ISO 8601 em UTC — o adapter é quem transforma em "10:52". */
  created_at: string;
  total_cents: number;
  payment_method: string;
  items: SaleItemAPI[];
  /** `false` = registrada offline, ainda não confirmada pelo servidor. */
  is_synced: boolean | null;
}

export interface DailySummaryAPI {
  date: string;
  gross_cents: number | null;
  profit_cents: number | null;
  sale_count: number | null;
  item_count: number | null;
  top_product_name: string | null;
  top_product_qty: number | null;
}

export interface SaleCreateAPI {
  tenant_id: string;
  payment_method: string;
  total_cents: number;
  items: SaleItemAPI[];
  is_synced: boolean;
}
