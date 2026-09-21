import * as api from './costsApi';
import {
  toCost,
  toCostErrorCode,
  toCostPayload,
  toCostUpdatePayload,
  toMonthlySummary,
} from './costsAdapter';
import {
  CostError,
  type Cost,
  type CostChanges,
  type CostType,
  type MonthlySummary,
} from './costsTypes';
import { throwIfAccessDenied } from '@domain/shared/accessDenied';

/** AS REGRAS dos custos. */

function normalize(error: unknown): never {
  if (error instanceof CostError) throw error;
  throwIfAccessDenied(error);
  const message = (error as { message?: unknown } | null)?.message;
  throw new CostError(toCostErrorCode(error), typeof message === 'string' ? message : undefined);
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

function validate(name: string, amountCents: number): void {
  if (!name.trim()) throw new CostError('name_required');
  if (!(amountCents > 0)) throw new CostError('invalid_amount');
}

export async function recordCost(
  tenantId: string,
  name: string,
  amountCents: number,
  type: CostType,
  recurring: boolean,
): Promise<Cost> {
  validate(name, amountCents);

  try {
    return toCost(await api.createCost(toCostPayload(tenantId, name, amountCents, type, recurring)));
  } catch (e) {
    return normalize(e);
  }
}

/**
 * Edita um custo lançado à mão.
 *
 * Custo de estoque é barrado ANTES da rede: ele espelha uma entrada de
 * mercadoria e só se corrige pela movimentação. O servidor recusa do mesmo
 * jeito; aqui é para a mensagem ser a certa sem esperar a ida e volta.
 */
export async function updateCost(cost: Cost, changes: CostChanges): Promise<void> {
  if (cost.fromStock) throw new CostError('from_stock');
  validate(changes.name, changes.amountCents);

  try {
    await api.updateCost(toCostUpdatePayload(cost, changes));
  } catch (e) {
    return normalize(e);
  }
}

/**
 * Exclui um custo lançado à mão. Em série, encerra a repetição a partir deste
 * mês e preserva os anteriores (regra da RPC).
 */
export async function deleteCost(cost: Cost): Promise<void> {
  if (cost.fromStock) throw new CostError('from_stock');

  try {
    await api.deleteCost({ id: cost.id, name: cost.name, stops_repeating: cost.recurring });
  } catch (e) {
    return normalize(e);
  }
}
