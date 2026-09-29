import { toAjustePayload, toOpenShift, toClosedShift } from './cashAdapter';
import * as api from './cashApi';
import {
  CashError,
  type AdjustmentType,
  type OpenShift,
  type ClosedShift,
} from './cashTypes';
import { throwIfAccessDenied } from '@domain/shared/accessDenied';

/** AS REGRAS do caixa. */

function normalize(error: unknown): never {
  if (error instanceof CashError) throw error;
  throwIfAccessDenied(error);
  throw new CashError('network', error instanceof Error ? error.message : undefined);
}

function isOpenCashConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const postgres = error as { code?: unknown; message?: unknown; details?: unknown };
  const message = [postgres.message, postgres.details]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
  return (
    postgres.code === '23505' &&
    message.includes('cash_registers_one_open_per_tenant')
  );
}

export async function getOpenShift(tenantId: string): Promise<OpenShift | null> {
  try {
    const raw = await api.fetchOpenShift(tenantId);
    // Caixa fechado é um estado legítimo da tela, não um erro.
    return raw ? toOpenShift(raw) : null;
  } catch (e) {
    return normalize(e);
  }
}

/** Quantos turnos o histórico pede por vez. */
export const CASH_HISTORY_PAGE_SIZE = 20;

export interface ClosedShiftsPage {
  shifts: ClosedShift[];
  /** `null` = acabou. */
  nextOffset: number | null;
}

/**
 * Uma página do histórico. Pede um a mais só para saber se há mais — sem
 * consulta de contagem — e descarta o extra.
 */
export async function getHistoryPage(
  tenantId: string,
  offset: number,
  pageSize: number = CASH_HISTORY_PAGE_SIZE,
): Promise<ClosedShiftsPage> {
  try {
    const raw = await api.listHistoryPage(tenantId, offset, pageSize + 1);
    return {
      shifts: raw.slice(0, pageSize).map(toClosedShift),
      nextOffset: raw.length > pageSize ? offset + pageSize : null,
    };
  } catch (e) {
    return normalize(e);
  }
}

/** Abertura padrão do troco quando o dono só toca "Abrir caixa". */
export const ABERTURA_PADRAO_CENTAVOS = 15000;

export async function openCash(
  tenantId: string,
  aberturaCentavos = ABERTURA_PADRAO_CENTAVOS,
): Promise<OpenShift> {
  if (!Number.isFinite(aberturaCentavos) || aberturaCentavos < 0) {
    throw new CashError('invalid_amount');
  }
  try {
    return toOpenShift(await api.openShift(tenantId, aberturaCentavos));
  } catch (e) {
    if (isOpenCashConflict(e)) {
      throw new CashError('cash_already_open', 'Já existe um caixa aberto.');
    }
    return normalize(e);
  }
}

/**
 * Sangria / reforço.
 *
 * Valor precisa ser positivo: o SINAL é decidido pelo tipo do ajuste, não pelo
 * que o dono digitou. Deixar "-50" numa sangria viraria um reforço silencioso.
 */
export async function recordAdjustment(
  tenantId: string,
  shiftId: string,
  type: AdjustmentType,
  amountCents: number,
  motivo: string,
): Promise<OpenShift> {
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new CashError('invalid_amount');
  }

  try {
    const raw = await api.recordAdjustment(
      tenantId,
      toAjustePayload(shiftId, type, amountCents, motivo),
    );
    if (!raw) throw new CashError('cash_closed');
    return toOpenShift(raw);
  } catch (e) {
    return normalize(e);
  }
}

/**
 * FECHAR O CAIXA.
 *
 * Recebe o CONTADO EM DINHEIRO, não a diferença: quem calcula o esperado e a
 * diferença é `close_cash_register`, no banco. A diferença que o app mostra
 * durante a conferência é para o dono entender o que está fazendo; a que fica
 * gravada é a do banco, e as duas não podem sair de contas diferentes.
 */
export async function closeCash(
  tenantId: string,
  shiftId: string,
  contadoEmDinheiroCentavos: number,
  observacao = '',
): Promise<ClosedShift> {
  if (!Number.isFinite(contadoEmDinheiroCentavos) || contadoEmDinheiroCentavos < 0) {
    throw new CashError('invalid_amount');
  }

  try {
    const raw = await api.closeShift(
      tenantId,
      shiftId,
      contadoEmDinheiroCentavos,
      observacao || null,
    );
    if (!raw) throw new CashError('cash_closed');
    return toClosedShift(raw);
  } catch (e) {
    return normalize(e);
  }
}
