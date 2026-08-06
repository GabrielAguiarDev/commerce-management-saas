import { MOVIMENTACOES_API } from '@data/estoque';
import { esperar } from '@services/mockLatency';

import type { StockMovementAPI, StockMovementCreateAPI } from './stockApiTypes';

/**
 * FRONTEIRA DE REDE das movimentações de estoque.
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE MUDA COM O SUPABASE.
 */

export async function listarMovimentacoes(tenantId: string): Promise<StockMovementAPI[]> {
  await esperar();
  return MOVIMENTACOES_API[tenantId] ?? [];
}

export async function criarMovimentacao(
  payload: StockMovementCreateAPI,
): Promise<StockMovementAPI> {
  await esperar(180);

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

  MOVIMENTACOES_API[payload.tenant_id] = [nova, ...(MOVIMENTACOES_API[payload.tenant_id] ?? [])];
  return nova;
}
