import { RESUMO_DIA_API, VENDAS_API } from '@data/vendas';
import { esperar } from '@services/mockLatency';

import type { DailySummaryAPI, SaleAPI, SaleCreateAPI } from './salesApiTypes';

/**
 * FRONTEIRA DE REDE das vendas.
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE MUDA COM O SUPABASE.
 */

export async function listarVendasDoDia(tenantId: string, limite = 3): Promise<SaleAPI[]> {
  await esperar();
  return (VENDAS_API[tenantId] ?? []).slice(0, limite);
}

export async function buscarResumoDoDia(tenantId: string): Promise<DailySummaryAPI | null> {
  await esperar();
  return RESUMO_DIA_API[tenantId] ?? null;
}

export async function registrarVenda(payload: SaleCreateAPI): Promise<SaleAPI> {
  await esperar(260);

  const nova: SaleAPI = {
    id: `sal_${Date.now().toString(36)}`,
    tenant_id: payload.tenant_id,
    created_at: new Date().toISOString(),
    total_cents: payload.total_cents,
    payment_method: payload.payment_method,
    items: payload.items,
    is_synced: payload.is_synced,
  };

  VENDAS_API[payload.tenant_id] = [nova, ...(VENDAS_API[payload.tenant_id] ?? [])];

  // O resumo do dia é uma view materializada no banco real; aqui somamos à mão
  // para que o card do Início reaja à venda que acabou de acontecer.
  const resumo = RESUMO_DIA_API[payload.tenant_id];
  if (resumo) {
    RESUMO_DIA_API[payload.tenant_id] = {
      ...resumo,
      gross_cents: (resumo.gross_cents ?? 0) + payload.total_cents,
      sale_count: (resumo.sale_count ?? 0) + 1,
      item_count: (resumo.item_count ?? 0) + payload.items.reduce((s, i) => s + i.qty, 0),
    };
  }

  return nova;
}
