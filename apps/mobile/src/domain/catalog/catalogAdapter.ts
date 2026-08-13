import type { ProductAPI, ProductCreateAPI, ProductUpdateAPI } from './catalogApiTypes';
import type { NewProduct, Product, ProductUpdate, StockStatus } from './catalogTypes';

/**
 * Regra de saúde do estoque, isolada porque três telas dependem dela:
 * o badge em Produtos, a barra colorida em Estoque e os contadores do topo.
 *
 * Zerado tem precedência sobre baixo. `minimo` 0 significa "não me avise":
 * com mínimo 0 e quantidade 1, a situação é em dia, não baixo.
 */
export function stockStatus(quantity: number, minimo: number): StockStatus {
  if (quantity <= 0) return 'out';
  if (minimo > 0 && quantity <= minimo) return 'low';
  return 'ok';
}

/**
 * `ProductAPI` → `Produto`.
 *
 * O que acontece aqui, e em nenhum outro lugar:
 *  - renomeia (`sku` → `codigo`, `is_service` → `ehServico`);
 *  - defende contra nulo (`price_cents: null` → 0; `is_favorite: null` → true,
 *    porque no protótipo o produto nasce favorito e some da grade só depois de
 *    ser desfavoritado à mão);
 *  - achata `stock_qty`/`stock_min` num objeto `estoque` e deriva a situação;
 *  - descarta `tenant_id`, `created_at` e `updated_at`, que a UI não usa.
 *
 * `stock_qty: null` e `stock_qty: 0` são coisas DIFERENTES: nulo é "não
 * controla estoque" (some o badge), zero é "acabou" (badge vermelho).
 */
export function toProduct(raw: ProductAPI): Product {
  const ehServico = raw.is_service === true;
  const tracksStock = !ehServico && raw.stock_qty !== null && raw.stock_qty !== undefined;
  const quantity = raw.stock_qty ?? 0;
  const minimo = raw.stock_min ?? 0;

  return {
    id: raw.id,
    name: raw.name,
    code: raw.sku,
    priceCents: raw.price_cents ?? 0,
    costCents: raw.cost_cents,
    ehServico,
    favorite: raw.is_favorite ?? true,
    stock: tracksStock
      ? { quantity, minimo, status: stockStatus(quantity, minimo) }
      : null,
    category: raw.category,
  };
}

/**
 * Código em branco vira `null`, e nunca `''`.
 *
 * A coluna `barcode` é anulável e a busca por código compara texto: uma string
 * vazia gravada faria "produto sem código" virar um código que casa com
 * qualquer busca vazia, além de brigar com o índice único quando dois produtos
 * ficassem com o mesmo `''`.
 */
function toSku(code: string | null): string | null {
  const trimmed = code?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

/** Domínio → payload de escrita. O caminho de volta do adapter. */
export function toProductCreatePayload(tenantId: string, novo: NewProduct): ProductCreateAPI {
  return {
    tenant_id: tenantId,
    name: novo.name.trim(),
    sku: toSku(novo.code),
    price_cents: novo.priceCents,
    cost_cents: novo.costCents,
    stock_qty: novo.initialStock,
    stock_min: novo.minimumStock,
    is_service: false,
  };
}

/** Domínio → payload de edição. Mesmas regras de aparo do cadastro. */
export function toProductUpdatePayload(mudanca: ProductUpdate): ProductUpdateAPI {
  return {
    name: mudanca.name.trim(),
    sku: toSku(mudanca.code),
    price_cents: mudanca.priceCents,
    cost_cents: mudanca.costCents,
    stock_min: mudanca.minimumStock,
  };
}
