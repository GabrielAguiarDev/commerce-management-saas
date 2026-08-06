import { HISTORICO_CAIXA_API, TURNO_ABERTO_API } from '@data/caixa';
import { esperar } from '@services/mockLatency';

import type { CashAdjustmentAPI, CashHistoryAPI, CashShiftAPI } from './cashApiTypes';

/**
 * FRONTEIRA DE REDE do caixa.
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE MUDA COM O SUPABASE.
 */

export async function buscarTurnoAberto(tenantId: string): Promise<CashShiftAPI | null> {
  await esperar();
  return TURNO_ABERTO_API[tenantId] ?? null;
}

export async function listarHistorico(tenantId: string): Promise<CashHistoryAPI[]> {
  await esperar();
  return HISTORICO_CAIXA_API[tenantId] ?? [];
}

export async function abrirTurno(
  tenantId: string,
  aberturaCentavos: number,
): Promise<CashShiftAPI> {
  await esperar(200);

  const novo: CashShiftAPI = {
    id: `shf_${Date.now().toString(36)}`,
    tenant_id: tenantId,
    opened_at: new Date().toISOString(),
    closed_at: null,
    opening_cents: aberturaCentavos,
    drawer_cents: aberturaCentavos,
    method_totals: [
      { method: 'Dinheiro', amount_cents: 0 },
      { method: 'Pix', amount_cents: 0 },
      { method: 'Cartão de débito', amount_cents: 0 },
      { method: 'Cartão de crédito', amount_cents: 0 },
    ],
  };

  TURNO_ABERTO_API[tenantId] = novo;
  return novo;
}

export async function registrarAjuste(
  tenantId: string,
  payload: CashAdjustmentAPI,
): Promise<CashShiftAPI | null> {
  await esperar(180);

  const turno = TURNO_ABERTO_API[tenantId];
  if (!turno) return null;

  const delta = payload.kind === 'withdrawal' ? -payload.amount_cents : payload.amount_cents;
  const atualizado: CashShiftAPI = { ...turno, drawer_cents: turno.drawer_cents + delta };
  TURNO_ABERTO_API[tenantId] = atualizado;
  return atualizado;
}

export async function fecharTurno(
  tenantId: string,
  diferencaCentavos: number,
): Promise<CashHistoryAPI | null> {
  await esperar(240);

  const turno = TURNO_ABERTO_API[tenantId];
  if (!turno) return null;

  const total = turno.method_totals.reduce((s, m) => s + m.amount_cents, 0);
  const agora = new Date();
  const hh = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const encerrado: CashHistoryAPI = {
    id: turno.id,
    date_label: 'Hoje',
    period_label: `${hh(new Date(turno.opened_at))} → ${hh(agora)}`,
    total_cents: total,
    difference_cents: diferencaCentavos,
  };

  TURNO_ABERTO_API[tenantId] = null;
  HISTORICO_CAIXA_API[tenantId] = [encerrado, ...(HISTORICO_CAIXA_API[tenantId] ?? [])];
  return encerrado;
}
