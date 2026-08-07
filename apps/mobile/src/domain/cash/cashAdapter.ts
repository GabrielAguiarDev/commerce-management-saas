import { parseCents } from '@utils/money';

import type { CashAdjustmentAPI, CashHistoryAPI, CashShiftAPI } from './cashApiTypes';
import type {
  CloseOutDifference,
  CountLine,
  AdjustmentType,
  OpenShift,
  ClosedShift,
} from './cashTypes';

function localTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** O rótulo que o dono usa para "dinheiro vivo" no turno. */
export const CASH_METHOD = 'Dinheiro';

export function toOpenShift(raw: CashShiftAPI): OpenShift {
  const receipts = raw.method_totals.map((m) => ({
    method: m.method,
    amountCents: m.amount_cents,
  }));

  return {
    id: raw.id,
    openedAt: localTime(raw.opened_at),
    aberturaCentavos: raw.opening_cents,
    gavetaCentavos: raw.drawer_cents,
    cashSalesCents:
      receipts.find((r) => r.method === CASH_METHOD)?.amountCents ?? 0,
    receipts,
  };
}

export function toClosedShift(raw: CashHistoryAPI): ClosedShift {
  return {
    id: raw.id,
    dateLabel: raw.date_label,
    periodLabel: raw.period_label,
    totalCents: raw.total_cents,
    diferencaCentavos: raw.difference_cents ?? 0,
  };
}

export function toAjustePayload(
  shiftId: string,
  type: AdjustmentType,
  amountCents: number,
  motivo: string,
): CashAdjustmentAPI {
  return {
    shift_id: shiftId,
    kind: type === 'withdrawal' ? 'withdrawal' : 'deposit',
    amount_cents: amountCents,
    reason: motivo.trim() || null,
  };
}

/**
 * As linhas que o dono confere ao fechar o caixa.
 *
 * NÃO é a lista de formas de pagamento: os dois cartões (débito e crédito)
 * viram UMA linha "Cartão", porque a maquininha entrega um extrato só e é
 * assim que ele confere na prática. E "Dinheiro" não é a venda em dinheiro, é
 * a GAVETA — inclui o troco de abertura e os ajustes de sangria/reforço.
 *
 * Função pura: dado o turno, produz sempre a mesma conferência.
 */
export function countRows(shift: OpenShift): CountLine[] {
  const porForma = new Map(shift.receipts.map((r) => [r.method, r.amountCents]));

  const card = shift.receipts
    .filter((r) => r.method.toLowerCase().startsWith('cartão'))
    .reduce((s, r) => s + r.amountCents, 0);

  const rows: CountLine[] = [
    { method: CASH_METHOD, esperadoCentavos: shift.gavetaCentavos },
  ];

  const pix = porForma.get('Pix');
  if (pix !== undefined) rows.push({ method: 'Pix', esperadoCentavos: pix });
  if (card > 0) rows.push({ method: 'Cartão', esperadoCentavos: card });

  return rows;
}

/**
 * A DIFERENÇA DO FECHAMENTO, em tempo real.
 *
 * Soma, para cada linha PREENCHIDA, `conferido − esperado`. Linha em branco é
 * ignorada — e não conta como zero. Se contasse, abrir a gaveta e digitar só o
 * dinheiro acusaria uma falta gigante de Pix e cartão, assustando o dono no
 * meio do fechamento. É o comportamento do protótipo (`difValor`, linha 1139)
 * e é o correto.
 *
 * Enquanto nenhuma linha foi preenchida, `informado` é `false` e a tela mostra
 * R$ 0,00 neutro em vez de um saldo negativo do total do turno.
 */
export function computeDifference(
  rows: readonly CountLine[],
  conferido: Readonly<Record<string, string>>,
): CloseOutDifference {
  let diferenca = 0;
  let informado = false;

  for (const row of rows) {
    const digitado = conferido[row.method];
    if (digitado === undefined || digitado.trim() === '') continue;
    informado = true;
    diferenca += (parseCents(digitado) ?? 0) - row.esperadoCentavos;
  }

  return { informado, diferencaCentavos: informado ? diferenca : 0 };
}

/**
 * O DINHEIRO CONTADO na gaveta — o único número que o fechamento manda ao banco.
 *
 * `close_cash_register` recebe o CONTADO EM ESPÉCIE e calcula o esperado e a
 * diferença por conta própria. Pix e cartão não entram: eles caem na conta,
 * não na gaveta, e são conferidos no extrato.
 *
 * `null` quando a linha do dinheiro não foi preenchida — e isso é diferente de
 * zero. Zero significa "a gaveta está vazia", uma afirmação e tanto para
 * carimbar no fechamento de quem só queria conferir o Pix. Quem decide o que
 * fazer com o `null` é a tela.
 */
export function countedCashCents(
  conferido: Readonly<Record<string, string>>,
): number | null {
  const digitado = conferido[CASH_METHOD];
  if (digitado === undefined || digitado.trim() === '') return null;
  return parseCents(digitado) ?? 0;
}

/** Rótulo da diferença no histórico: "sem diferença" / "faltou X" / "sobrou X". */
export function labelDifference(
  centavos: number,
  formatar: (c: number) => string,
): { text: string; tone: 'neutral' | 'warning' } {
  if (centavos === 0) return { text: 'sem diferença', tone: 'neutral' };
  if (centavos < 0) return { text: `faltou ${formatar(-centavos)}`, tone: 'warning' };
  return { text: `sobrou ${formatar(centavos)}`, tone: 'warning' };
}
