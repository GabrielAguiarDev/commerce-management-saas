import { CATALOGO_API, CATEGORIA_ESPECIAL } from '@data/catalogo';
import { esperar } from '@services/mockLatency';

import type { ProductAPI, ProductCreateAPI } from './catalogApiTypes';

/**
 * FRONTEIRA DE REDE do catálogo.
 *
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE MUDA COM O SUPABASE.
 * Só aqui há relógio (`Date.now`) e geração de id.
 */

export async function listarProdutos(tenantId: string): Promise<ProductAPI[]> {
  await esperar();
  return CATALOGO_API[tenantId] ?? [];
}

export async function criarProduto(payload: ProductCreateAPI): Promise<ProductAPI> {
  await esperar();

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

  CATALOGO_API[payload.tenant_id] = [novo, ...(CATALOGO_API[payload.tenant_id] ?? [])];
  return novo;
}

export async function alternarFavorito(
  tenantId: string,
  produtoId: string,
): Promise<ProductAPI | null> {
  await esperar(80);
  const lista = CATALOGO_API[tenantId] ?? [];
  const alvo = lista.find((p) => p.id === produtoId);
  if (!alvo) return null;

  const atualizado: ProductAPI = { ...alvo, is_favorite: !(alvo.is_favorite ?? true) };
  CATALOGO_API[tenantId] = lista.map((p) => (p.id === produtoId ? atualizado : p));
  return atualizado;
}

/**
 * Baixa de estoque por venda. `delta` negativo tira, positivo repõe.
 * Produtos que não controlam estoque são ignorados sem erro — vender um
 * serviço não pode falhar por causa de estoque que ele não tem.
 */
export async function movimentarEstoque(
  tenantId: string,
  produtoId: string,
  delta: number,
): Promise<ProductAPI | null> {
  await esperar(80);
  const lista = CATALOGO_API[tenantId] ?? [];
  const alvo = lista.find((p) => p.id === produtoId);
  if (!alvo || alvo.stock_qty === null) return null;

  const atualizado: ProductAPI = {
    ...alvo,
    stock_qty: Math.max(0, alvo.stock_qty + delta),
    updated_at: new Date().toISOString(),
  };
  CATALOGO_API[tenantId] = lista.map((p) => (p.id === produtoId ? atualizado : p));
  return atualizado;
}

export function categoriaEspecialDoTenant(tenantId: string): string | null {
  return CATEGORIA_ESPECIAL[tenantId] ?? null;
}
