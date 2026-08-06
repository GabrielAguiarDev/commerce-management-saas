import * as api from './costsApi';
import { toCost, toCostPayload, toMonthlySummary } from './costsAdapter';
import { CostError, type Cost, type MonthlySummary } from './costsTypes';

/** AS REGRAS dos custos. */

function normalize(error: unknown): never {
  if (error instanceof CostError) throw error;
  throw new CostError('network', error instanceof Error ? error.message : undefined);
}

export async function listCosts(tenantId: string): Promise<Cost[]> {
  try {
    return (await api.listCosts(tenantId)).map(toCost);
  } catch (e) {
    return normalize(e);
  }
}

const EMPTY_SUMMARY: MonthlySummary = {
  mes: '—',
  period: '—',
  entrouCentavos: 0,
  saiuCentavos: 0,
  sobrouCentavos: 0,
};

export async function getMonthlySummary(tenantId: string): Promise<MonthlySummary> {
  try {
    const raw = await api.fetchMonthlySummary(tenantId);
    return raw ? toMonthlySummary(raw) : EMPTY_SUMMARY;
  } catch (e) {
    return normalize(e);
  }
}

export async function recordCost(
  tenantId: string,
  name: string,
  amountCents: number,
): Promise<Cost> {
  if (!name.trim()) throw new CostError('name_required');
  if (amountCents <= 0) throw new CostError('invalid_amount');

  try {
    return toCost(await api.createCost(toCostPayload(tenantId, name, amountCents)));
  } catch (e) {
    return normalize(e);
  }
}
