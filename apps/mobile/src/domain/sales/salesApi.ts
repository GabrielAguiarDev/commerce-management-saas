import { DAILY_SUMMARY_API, SALES_API } from '@data/sales';
import { delay } from '@services/mockLatency';

import type { DailySummaryAPI, SaleAPI, SaleCreateAPI } from './salesApiTypes';

/**
 * FRONTEIRA DE REDE das vendas.
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE MUDA COM O SUPABASE.
 */

export async function listDailySales(tenantId: string, limite = 3): Promise<SaleAPI[]> {
  await delay();
  return (SALES_API[tenantId] ?? []).slice(0, limite);
}

export async function fetchDailySummary(tenantId: string): Promise<DailySummaryAPI | null> {
  await delay();
  return DAILY_SUMMARY_API[tenantId] ?? null;
}

export async function recordSale(payload: SaleCreateAPI): Promise<SaleAPI> {
  await delay(260);

  const nova: SaleAPI = {
    id: `sal_${Date.now().toString(36)}`,
    tenant_id: payload.tenant_id,
    created_at: new Date().toISOString(),
    total_cents: payload.total_cents,
    payment_method: payload.payment_method,
    items: payload.items,
    is_synced: payload.is_synced,
  };

  SALES_API[payload.tenant_id] = [nova, ...(SALES_API[payload.tenant_id] ?? [])];

  // O resumo do dia é uma view materializada no banco real; aqui somamos à mão
  // para que o card do Início reaja à venda que acabou de acontecer.
  const summary = DAILY_SUMMARY_API[payload.tenant_id];
  if (summary) {
    DAILY_SUMMARY_API[payload.tenant_id] = {
      ...summary,
      gross_cents: (summary.gross_cents ?? 0) + payload.total_cents,
      sale_count: (summary.sale_count ?? 0) + 1,
      item_count: (summary.item_count ?? 0) + payload.items.reduce((s, i) => s + i.qty, 0),
    };
  }

  return nova;
}
