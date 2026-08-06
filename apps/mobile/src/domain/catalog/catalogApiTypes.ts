/**
 * CONTRATO DO BACKEND do catálogo.
 *
 * Inglês, snake_case, quase tudo anulável — como uma tabela `products` de
 * verdade. Repare que o preço vem em CENTAVOS inteiros (`price_cents`): é o que
 * evita float em dinheiro do banco até a tela.
 */

export interface ProductAPI {
  id: string;
  tenant_id: string;
  name: string;
  sku: string | null;
  price_cents: number | null;
  cost_cents: number | null;
  is_service: boolean | null;
  is_favorite: boolean | null;
  /** `null` = este produto não controla estoque. Zero é diferente de nulo. */
  stock_qty: number | null;
  stock_min: number | null;
  category: string | null;
  created_at: string;
  /** Coluna que o app não usa — está aqui para provar que o adapter descarta. */
  updated_at: string | null;
}

export interface ProductCreateAPI {
  tenant_id: string;
  name: string;
  price_cents: number;
  cost_cents: number | null;
  stock_qty: number | null;
  stock_min: number | null;
  is_service: boolean;
}
