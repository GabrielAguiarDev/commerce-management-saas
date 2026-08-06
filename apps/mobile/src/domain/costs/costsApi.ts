import { COSTS_API, MONTHLY_SUMMARY_API } from '@data/costs';
import { delay } from '@services/mockLatency';

import type { CostAPI, CostCreateAPI, MonthSummaryAPI } from './costsApiTypes';

/**
 * FRONTEIRA DE REDE dos custos.
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE MUDA COM O SUPABASE.
 */

export async function listCosts(tenantId: string): Promise<CostAPI[]> {
  await delay();
  return COSTS_API[tenantId] ?? [];
}

export async function fetchMonthlySummary(tenantId: string): Promise<MonthSummaryAPI | null> {
  await delay();
  return MONTHLY_SUMMARY_API[tenantId] ?? null;
}

export async function createCost(payload: CostCreateAPI): Promise<CostAPI> {
  await delay(180);

  const novo: CostAPI = {
    id: `cst_${Date.now().toString(36)}`,
    tenant_id: payload.tenant_id,
    name: payload.name,
    amount_cents: payload.amount_cents,
    kind: payload.kind,
    due_label: 'today',
    from_stock: false,
  };

  COSTS_API[payload.tenant_id] = [novo, ...(COSTS_API[payload.tenant_id] ?? [])];

  const summary = MONTHLY_SUMMARY_API[payload.tenant_id];
  if (summary) {
    MONTHLY_SUMMARY_API[payload.tenant_id] = {
      ...summary,
      expense_cents: (summary.expense_cents ?? 0) + payload.amount_cents,
    };
  }

  return novo;
}
