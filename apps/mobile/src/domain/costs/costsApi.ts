import { CUSTOS_API, RESUMO_MES_API } from '@data/custos';
import { esperar } from '@services/mockLatency';

import type { CostAPI, CostCreateAPI, MonthSummaryAPI } from './costsApiTypes';

/**
 * FRONTEIRA DE REDE dos custos.
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE MUDA COM O SUPABASE.
 */

export async function listarCustos(tenantId: string): Promise<CostAPI[]> {
  await esperar();
  return CUSTOS_API[tenantId] ?? [];
}

export async function buscarResumoDoMes(tenantId: string): Promise<MonthSummaryAPI | null> {
  await esperar();
  return RESUMO_MES_API[tenantId] ?? null;
}

export async function criarCusto(payload: CostCreateAPI): Promise<CostAPI> {
  await esperar(180);

  const novo: CostAPI = {
    id: `cst_${Date.now().toString(36)}`,
    tenant_id: payload.tenant_id,
    name: payload.name,
    amount_cents: payload.amount_cents,
    kind: payload.kind,
    due_label: 'hoje',
    from_stock: false,
  };

  CUSTOS_API[payload.tenant_id] = [novo, ...(CUSTOS_API[payload.tenant_id] ?? [])];

  const resumo = RESUMO_MES_API[payload.tenant_id];
  if (resumo) {
    RESUMO_MES_API[payload.tenant_id] = {
      ...resumo,
      expense_cents: (resumo.expense_cents ?? 0) + payload.amount_cents,
    };
  }

  return novo;
}
