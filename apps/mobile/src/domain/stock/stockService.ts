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
 * Registra a movimentação E ajusta o saldo do produto — em UMA operação.
 *
 * Na fase de mock isto eram duas escritas em sequência, e havia um comentário
 * aqui pedindo que virassem uma função SQL única. Virou: `apply_stock_movement`
 * grava o movimento e atualiza `products.stock_quantity` na mesma transação.
 *
 * ⚠️ NÃO acrescente de volta um segundo passo ajustando o saldo pela aplicação
 * (o antigo `catalogService.moveStock`, hoje removido). Ele descontaria o
 * estoque DUAS VEZES por movimentação.
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
    return toStockMovement(raw);
  } catch (e) {
    return normalize(e);
  }
}
