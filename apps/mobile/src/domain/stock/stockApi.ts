import { MOVEMENTS_API } from '@data/stock';
import { delay } from '@services/mockLatency';

import type { StockMovementAPI, StockMovementCreateAPI } from './stockApiTypes';

/**
 * FRONTEIRA DE REDE das movimentações de estoque.
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE MUDA COM O SUPABASE.
 */

export async function listStockMovements(tenantId: string): Promise<StockMovementAPI[]> {
  await delay();
  return MOVEMENTS_API[tenantId] ?? [];
}

export async function createStockMovement(
  payload: StockMovementCreateAPI,
): Promise<StockMovementAPI> {
  await delay(180);

  const nova: StockMovementAPI = {
    id: `mov_${Date.now().toString(36)}`,
    tenant_id: payload.tenant_id,
    product_id: payload.product_id,
    product_name: payload.product_name,
    delta: payload.delta,
    reason: payload.reason,
    actor_name: null,
    happened_label: 'agora',
  };

  MOVEMENTS_API[payload.tenant_id] = [nova, ...(MOVEMENTS_API[payload.tenant_id] ?? [])];
  return nova;
}
