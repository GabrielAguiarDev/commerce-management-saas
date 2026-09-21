import { addDaysDateOnly, daysInclusive, parseDateOnly, todayDateOnly } from '@utils/dates';

import type { ReportPeriod } from './reportsTypes';

/**
 * O INTERVALO de um relatório — dias de calendário locais, `YYYY-MM-DD`, com
 * as duas pontas incluídas.
 *
 * Antes cada período era só um número de dias para trás a partir de hoje:
 * "Este mês" eram os últimos 30 dias (no dia 21, metade do mês passado) e
 * "Personalizado" caía nos mesmos 30, sem seletor — os dois chips mostravam
 * exatamente o mesmo relatório.
 */
export interface DateRange {
  from: string;
  to: string;
}

/**
 * Teto do Personalizado. Um ano de barras ainda rola bem no gráfico; mais que
 * isso é outro tipo de análise, e a consulta de itens vendidos cresce junto.
 */
export const MAX_RANGE_DAYS = 366;

/**
 * Período → intervalo. Função pura: `today` entra por parâmetro para os testes
 * não dependerem do relógio.
 *
 *  - Hoje: só hoje.
 *  - Esta semana: os últimos 7 dias, hoje incluído.
 *  - Este mês: do dia 1 do mês corrente até hoje.
 *  - Personalizado: o que a pessoa escolheu, normalizado; sem escolha, o mês.
 */
export function resolveRange(
  period: ReportPeriod,
  custom: DateRange | null,
  today: string = todayDateOnly(),
): DateRange {
  switch (period) {
    case 'today':
      return { from: today, to: today };
    case 'week':
      return { from: addDaysDateOnly(today, -6), to: today };
    case 'month':
      return { from: `${today.slice(0, 8)}01`, to: today };
    case 'custom':
      return custom ? normalizeRange(custom, today) : resolveRange('month', null, today);
  }
}

/**
 * Pontas na ordem, nada no futuro e no máximo `MAX_RANGE_DAYS`.
 *
 * O calendário já impede quase tudo isso, mas o intervalo também vem de estado
 * guardado — e um "até" amanhã produziria barras de dias que ainda não houve.
 */
export function normalizeRange(range: DateRange, today: string = todayDateOnly()): DateRange {
  let { from, to } = range.from <= range.to ? range : { from: range.to, to: range.from };
  if (to > today) to = today;
  if (from > to) from = to;
  if (daysInclusive(from, to) > MAX_RANGE_DAYS) from = addDaysDateOnly(to, -(MAX_RANGE_DAYS - 1));
  return { from, to };
}

/** A janela do comparativo: o mesmo tamanho, imediatamente antes. */
export function previousRange(range: DateRange): DateRange {
  const length = daysInclusive(range.from, range.to);
  return { from: addDaysDateOnly(range.from, -length), to: addDaysDateOnly(range.from, -1) };
}

/** Cada dia do intervalo, em ordem — um por barra do gráfico. */
export function eachDay(range: DateRange): string[] {
  const days: string[] = [];
  for (let d = range.from; d <= range.to; d = addDaysDateOnly(d, 1)) days.push(d);
  return days;
}

/** "04/09" ou "04/09/2025" quando o ano não é o corrente. */
function shortDate(day: string, currentYear: string): string {
  const [y, m, d] = day.split('-');
  return y === currentYear ? `${d}/${m}` : `${d}/${m}/${y}`;
}

/** "04/09 – 18/09", ou uma data só quando o intervalo é de um dia. */
export function rangeLabel(range: DateRange, today: string = todayDateOnly()): string {
  const year = today.slice(0, 4);
  const from = shortDate(range.from, year);
  return range.from === range.to ? from : `${from} – ${shortDate(range.to, year)}`;
}

/** Nome do mês e ano para o cabeçalho do calendário: "setembro de 2026". */
export function monthTitle(month: string, locale: string): string {
  return parseDateOnly(`${month}-01`).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}
