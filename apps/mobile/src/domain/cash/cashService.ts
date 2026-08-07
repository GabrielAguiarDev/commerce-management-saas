import { toAjustePayload, toOpenShift, toClosedShift } from './cashAdapter';
import * as api from './cashApi';
import {
  CashError,
  type AdjustmentType,
  type OpenShift,
  type ClosedShift,
} from './cashTypes';

/** AS REGRAS do caixa. */

function normalize(error: unknown): never {
  if (error instanceof CashError) throw error;
  throw new CashError('network', error instanceof Error ? error.message : undefined);
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

export async function getHistory(tenantId: string): Promise<ClosedShift[]> {
  try {
    return (await api.listHistory(tenantId)).map(toClosedShift);
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
  if (aberturaCentavos < 0) throw new CashError('invalid_amount');
  try {
    return toOpenShift(await api.openShift(tenantId, aberturaCentavos));
  } catch (e) {
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
  if (amountCents <= 0) throw new CashError('invalid_amount');

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
  if (contadoEmDinheiroCentavos < 0) throw new CashError('invalid_amount');

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
