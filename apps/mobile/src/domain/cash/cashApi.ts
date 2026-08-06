import { CASH_HISTORY_API, OPEN_SHIFT_API } from '@data/cash';
import { delay } from '@services/mockLatency';

import type { CashAdjustmentAPI, CashHistoryAPI, CashShiftAPI } from './cashApiTypes';

/**
 * FRONTEIRA DE REDE do caixa.
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE MUDA COM O SUPABASE.
 */

export async function fetchOpenShift(tenantId: string): Promise<CashShiftAPI | null> {
  await delay();
  return OPEN_SHIFT_API[tenantId] ?? null;
}

export async function listHistory(tenantId: string): Promise<CashHistoryAPI[]> {
  await delay();
  return CASH_HISTORY_API[tenantId] ?? [];
}

export async function openShift(
  tenantId: string,
  aberturaCentavos: number,
): Promise<CashShiftAPI> {
  await delay(200);

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

  OPEN_SHIFT_API[tenantId] = novo;
  return novo;
}

export async function recordAdjustment(
  tenantId: string,
  payload: CashAdjustmentAPI,
): Promise<CashShiftAPI | null> {
  await delay(180);

  const shift = OPEN_SHIFT_API[tenantId];
  if (!shift) return null;

  const delta = payload.kind === 'withdrawal' ? -payload.amount_cents : payload.amount_cents;
  const updated: CashShiftAPI = { ...shift, drawer_cents: shift.drawer_cents + delta };
  OPEN_SHIFT_API[tenantId] = updated;
  return updated;
}

export async function closeShift(
  tenantId: string,
  diferencaCentavos: number,
): Promise<CashHistoryAPI | null> {
  await delay(240);

  const shift = OPEN_SHIFT_API[tenantId];
  if (!shift) return null;

  const total = shift.method_totals.reduce((s, m) => s + m.amount_cents, 0);
  const agora = new Date();
  const hh = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const encerrado: CashHistoryAPI = {
    id: shift.id,
    date_label: 'Hoje',
    period_label: `${hh(new Date(shift.opened_at))} → ${hh(agora)}`,
    total_cents: total,
    difference_cents: diferencaCentavos,
  };

  OPEN_SHIFT_API[tenantId] = null;
  CASH_HISTORY_API[tenantId] = [encerrado, ...(CASH_HISTORY_API[tenantId] ?? [])];
  return encerrado;
}
