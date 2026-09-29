/** MODELO DE DOMÍNIO do catálogo. */

export type StockStatus = 'ok' | 'low' | 'out';

export interface ProductStock {
  quantity: number;
  minimo: number;
  /** Derivada no adapter para que a tela não recalcule regra de estoque. */
  status: StockStatus;
}

export interface Product {
  id: string;
  name: string;
  /** Código de barras / SKU. Serviço não tem. */
  code: string | null;
  priceCents: number;
  costCents: number | null;
  ehServico: boolean;
  favorite: boolean;
  /** `null` = produto que não controla estoque (serviço, ou módulo desligado). */
  stock: ProductStock | null;
  category: string | null;
}

/** Chips da tela Produtos. `especial` é "Serviços" ou "Bebidas" conforme o ramo. */
export type CatalogFilter = 'all' | 'favorites' | 'special';

export interface CatalogSortKey {
  search: string;
  filter: CatalogFilter;
  /** Rótulo do chip especial, que também define o critério aplicado. */
  specialCategory: string | null;
}

export interface NewProduct {
  name: string;
  /** Código de barras / SKU. Opcional: em branco vira `null`. */
  code: string | null;
  priceCents: number;
  costCents: number | null;
  initialStock: number | null;
  minimumStock: number | null;
}

/**
 * O que a edição pela lista pode mudar.
 *
 * Repare no que NÃO está aqui: a quantidade em estoque. Saldo só se move por
 * movimentação (`apply_stock_movement`, que grava o motivo e ajusta o produto
 * na mesma transação) — deixar o formulário sobrescrever `stock_quantity`
 * apagaria a entrada do livro e o dono perderia o rastro do ajuste. O mínimo,
 * esse sim, é configuração do produto e muda aqui.
 */
export interface ProductUpdate {
  name: string;
  code: string | null;
  priceCents: number;
  /**
   * `undefined` = o formulário não tem o campo (sem permissão de ver custo) e o
   * custo gravado fica como está. `null` = o dono apagou o custo.
   */
  costCents?: number | null;
  minimumStock: number | null;
}

export type CatalogErrorCode =
  | 'name_required'
  | 'invalid_price'
  /** Já existe outro produto com o mesmo código de barras. */
  | 'duplicate_code'
  | 'network'
  | 'unknown';

export class CatalogError extends Error {
  constructor(readonly code: CatalogErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'CatalogoError';
  }
}

/** Uma página da lista de Produtos ou de Estoque. `nextOffset: null` = acabou. */
export interface ProductsPage {
  products: Product[];
  nextOffset: number | null;
}

/**
 * O que a tela pede ao banco: a busca e o chip. `stock` é a lista da tela
 * Estoque (só quem controla estoque).
 */
export interface ProductPageQuery {
  search: string;
  filter: CatalogFilter | 'stock';
  /** O rótulo do 3º chip, quando `filter` é `special`. */
  specialCategory: string | null;
}

/** Contadores da tela Estoque — sobre o catálogo inteiro. */
export interface StockCounts {
  emDia: number;
  low: number;
  out: number;
}

/** O catálogo inteiro em números — o que não cabe numa página. */
export interface CatalogFacets {
  total: number;
  /** O rótulo do 3º chip ("Serviços", "Bebidas"…), ou `null`. */
  specialCategory: string | null;
  stock: StockCounts;
}

/** O que decide o rótulo do 3º chip. Ver `specialCategoryFrom`. */
export interface CategoryFacets {
  hasServices: boolean;
  /** Mais comum primeiro. */
  categories: { name: string; count: number }[];
}
