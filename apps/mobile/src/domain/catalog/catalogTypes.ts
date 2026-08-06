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
  priceCents: number;
  costCents: number | null;
  initialStock: number | null;
  minimumStock: number | null;
}

export type CatalogErrorCode = 'name_required' | 'invalid_price' | 'network' | 'unknown';

export class CatalogError extends Error {
  constructor(readonly code: CatalogErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'CatalogoError';
  }
}
