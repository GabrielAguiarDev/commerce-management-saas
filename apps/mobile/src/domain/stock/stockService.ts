import * as api from './stockApi';
import { toStockMovement, toStockMovementPayload } from './stockAdapter';
import { StockError, type StockMovement } from './stockTypes';
import { throwIfAccessDenied } from '@domain/shared/accessDenied';

/** AS REGRAS das movimentações de estoque. */

function normalize(error: unknown): never {
  if (error instanceof StockError) throw error;
  throwIfAccessDenied(error);
  throw new StockError('network', error instanceof Error ? error.message : undefined);
}

/** Quantas movimentações o histórico pede por vez. */
export const MOVEMENTS_PAGE_SIZE = 20;

export interface StockMovementsPage {
  movements: StockMovement[];
  /** `null` = acabou. */
  nextOffset: number | null;
}

/** Uma página do histórico. Pede um a mais só para saber se há próxima. */
export async function listStockMovementsPage(
  tenantId: string,
  offset: number,
  pageSize: number = MOVEMENTS_PAGE_SIZE,
): Promise<StockMovementsPage> {
  try {
    const raw = await api.listStockMovementsPage(tenantId, offset, pageSize + 1);
    return {
      movements: raw.slice(0, pageSize).map(toStockMovement),
      nextOffset: raw.length > pageSize ? offset + pageSize : null,
    };
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
  unitCostCents: number | null = null,
): Promise<StockMovement> {
  if (!productName.trim()) throw new StockError('product_required');
  if (!Number.isInteger(delta) || delta === 0) throw new StockError('invalid_quantity');

  // Custo NEGATIVO é erro de digitação, e passaria batido: viraria uma despesa
  // negativa, que na prática é receita — o lucro do mês subiria por causa de
  // uma compra. Zero e vazio continuam válidos: nem toda entrada é compra.
  if (unitCostCents !== null && unitCostCents < 0) throw new StockError('invalid_cost');

  try {
    const raw = await api.createStockMovement(
      toStockMovementPayload(tenantId, productId, productName, delta, unitCostCents),
    );
    return toStockMovement(raw);
  } catch (e) {
    return normalize(e);
  }
}
