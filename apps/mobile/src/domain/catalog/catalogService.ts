import { toProduct, toProductCreatePayload, toProductUpdatePayload } from './catalogAdapter';
import * as api from './catalogApi';
import {
  CatalogError,
  type NewProduct,
  type Product,
  type ProductUpdate,
} from './catalogTypes';

/** AS REGRAS do catálogo. Valida antes da rede, normaliza o erro na saída. */

function normalize(error: unknown): never {
  if (error instanceof CatalogError) throw error;
  // Violação de unicidade do Postgres. Só acontece nas escritas que carregam
  // código de barras, e chega aqui como erro de rede se não for separada —
  // mandando o dono "tentar de novo" para sempre num conflito que só ele pode
  // resolver, trocando o código.
  if (isUniqueViolation(error)) throw new CatalogError('duplicate_code');
  throw new CatalogError('network', error instanceof Error ? error.message : undefined);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === '23505'
  );
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

/**
 * Edição pela lista de produtos.
 *
 * Mesmas duas regras do cadastro — nome obrigatório, preço não negativo —, e
 * de propósito na MESMA função: quem edita não pode conseguir deixar o produto
 * num estado que o cadastro recusaria.
 */
export function validateProductUpdate(mudanca: ProductUpdate): CatalogError | null {
  if (!mudanca.name.trim()) return new CatalogError('name_required');
  if (mudanca.priceCents < 0) return new CatalogError('invalid_price');
  return null;
}

export async function updateProduct(
  productId: string,
  mudanca: ProductUpdate,
): Promise<Product> {
  const invalido = validateProductUpdate(mudanca);
  if (invalido) throw invalido;

  try {
    const raw = await api.updateProduct(productId, toProductUpdatePayload(mudanca));
    if (!raw) throw new CatalogError('unknown', 'Produto não encontrado.');
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
