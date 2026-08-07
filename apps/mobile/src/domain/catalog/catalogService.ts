import { toProduct, toProductCreatePayload } from './catalogAdapter';
import * as api from './catalogApi';
import { CatalogError, type NewProduct, type Product } from './catalogTypes';

/** AS REGRAS do catálogo. Valida antes da rede, normaliza o erro na saída. */

function normalize(error: unknown): never {
  if (error instanceof CatalogError) throw error;
  throw new CatalogError('network', error instanceof Error ? error.message : undefined);
}

export async function listProducts(tenantId: string): Promise<Product[]> {
  try {
    return (await api.listProducts(tenantId)).map(toProduct);
  } catch (e) {
    return normalize(e);
  }
}

/**
 * Cadastro rápido.
 *
 * A única obrigatoriedade é o nome — exatamente como no protótipo. Preço em
 * branco vale zero (o dono digita depois) e preço negativo é erro: um produto
 * com preço negativo pagaria o cliente para levar.
 */
export function validateNewProduct(novo: NewProduct): CatalogError | null {
  if (!novo.name.trim()) return new CatalogError('name_required');
  if (novo.priceCents < 0) return new CatalogError('invalid_price');
  return null;
}

export async function createProduct(tenantId: string, novo: NewProduct): Promise<Product> {
  const invalido = validateNewProduct(novo);
  if (invalido) throw invalido;

  try {
    const raw = await api.createProduct(toProductCreatePayload(tenantId, novo));
    return toProduct(raw);
  } catch (e) {
    return normalize(e);
  }
}

export async function toggleFavorite(tenantId: string, productId: string): Promise<Product> {
  try {
    const raw = await api.toggleFavorite(tenantId, productId);
    if (!raw) throw new CatalogError('unknown', 'Produto não encontrado.');
    return toProduct(raw);
  } catch (e) {
    return normalize(e);
  }
}

/**
 * `moveStock` FOI REMOVIDO daqui na virada para o Supabase.
 *
 * Ele existia para ajustar o saldo do produto depois de gravar a movimentação —
 * duas escritas que o mock precisava fazer em sequência. No banco real isso é
 * UMA operação: `apply_stock_movement` grava o movimento E ajusta
 * `products.stock_quantity` na mesma transação, que é exatamente o que o
 * comentário antigo do `stockService` pedia.
 *
 * Manter a função seria descontar o estoque DUAS VEZES a cada movimentação.
 */
