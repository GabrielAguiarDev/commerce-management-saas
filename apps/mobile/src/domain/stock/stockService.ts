import { moveStock as adjustProductBalance } from '@domain/catalog/catalogService';

import * as api from './stockApi';
import { toStockMovement, toStockMovementPayload } from './stockAdapter';
import { StockError, type StockMovement } from './stockTypes';

/** AS REGRAS das movimentações de estoque. */

function normalize(error: unknown): never {
  if (error instanceof StockError) throw error;
  throw new StockError('network', error instanceof Error ? error.message : undefined);
}

export async function listStockMovements(tenantId: string): Promise<StockMovement[]> {
  try {
    return (await api.listStockMovements(tenantId)).map(toStockMovement);
  } catch (e) {
    return normalize(e);
  }
}

/**
 * Registra a movimentação E ajusta o saldo do produto.
 *
 * Duas escritas que precisam andar juntas: no Supabase isso vira uma função
 * SQL única (como `admin_create_tenant` faz no portal), justamente para não
 * existir movimentação sem saldo ou saldo sem histórico. Enquanto é mock, o
 * service é quem garante a ordem — e o comentário fica aqui para que ninguém
 * "simplifique" tirando o segundo passo.
 */
export async function recordStockMovement(
  tenantId: string,
  productId: string | null,
  productName: string,
  delta: number,
): Promise<StockMovement> {
  if (!productName.trim()) throw new StockError('product_required');
  if (!Number.isInteger(delta) || delta === 0) throw new StockError('invalid_quantity');

  try {
    const raw = await api.createStockMovement(
      toStockMovementPayload(tenantId, productId, productName, delta),
    );
    if (productId) await adjustProductBalance(tenantId, productId, delta);
    return toStockMovement(raw);
  } catch (e) {
    return normalize(e);
  }
}
