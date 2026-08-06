import { CATALOG_API, CATEGORIA_ESPECIAL } from '@data/catalog';
import { delay } from '@services/mockLatency';

import type { ProductAPI, ProductCreateAPI } from './catalogApiTypes';

/**
 * FRONTEIRA DE REDE do catálogo.
 *
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE MUDA COM O SUPABASE.
 * Só aqui há relógio (`Date.now`) e geração de id.
 */

export async function listProducts(tenantId: string): Promise<ProductAPI[]> {
  await delay();
  return CATALOG_API[tenantId] ?? [];
}

export async function createProduct(payload: ProductCreateAPI): Promise<ProductAPI> {
  await delay();

  const novo: ProductAPI = {
    id: `prd_${Date.now().toString(36)}`,
    tenant_id: payload.tenant_id,
    name: payload.name,
    sku: null,
    price_cents: payload.price_cents,
    cost_cents: payload.cost_cents,
    is_service: payload.is_service,
    is_favorite: true,
    stock_qty: payload.stock_qty,
    stock_min: payload.stock_min,
    category: null,
    created_at: new Date().toISOString(),
    updated_at: null,
  };

  CATALOG_API[payload.tenant_id] = [novo, ...(CATALOG_API[payload.tenant_id] ?? [])];
  return novo;
}

export async function toggleFavorite(
  tenantId: string,
  productId: string,
): Promise<ProductAPI | null> {
  await delay(80);
  const list = CATALOG_API[tenantId] ?? [];
  const alvo = list.find((p) => p.id === productId);
  if (!alvo) return null;

  const updated: ProductAPI = { ...alvo, is_favorite: !(alvo.is_favorite ?? true) };
  CATALOG_API[tenantId] = list.map((p) => (p.id === productId ? updated : p));
  return updated;
}

/**
 * Baixa de estoque por venda. `delta` negativo tira, positivo repõe.
 * Produtos que não controlam estoque são ignorados sem erro — vender um
 * serviço não pode falhar por causa de estoque que ele não tem.
 */
export async function moveStock(
  tenantId: string,
  productId: string,
  delta: number,
): Promise<ProductAPI | null> {
  await delay(80);
  const list = CATALOG_API[tenantId] ?? [];
  const alvo = list.find((p) => p.id === productId);
  if (!alvo || alvo.stock_qty === null) return null;

  const updated: ProductAPI = {
    ...alvo,
    stock_qty: Math.max(0, alvo.stock_qty + delta),
    updated_at: new Date().toISOString(),
  };
  CATALOG_API[tenantId] = list.map((p) => (p.id === productId ? updated : p));
  return updated;
}

export function tenantSpecialCategory(tenantId: string): string | null {
  return CATEGORIA_ESPECIAL[tenantId] ?? null;
}
