import { SALE_STATUS } from '@domain/shared/dbEnums';
import { supabase } from '@services/supabase';
import { addDaysDateOnly, startOfDayISO } from '@utils/dates';
import { formatAmount, realToCents } from '@utils/money';

import type { ReportAPI, ReportBarAPI, ReportRowAPI } from './reportsApiTypes';
import { eachDay, previousRange, type DateRange } from './reportsPeriod';
import { currentMessages } from '@i18n/active';

/**
 * FRONTEIRA DE REDE dos relatórios.
 *
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE FALA COM O SUPABASE.
 *
 * A ESTRATÉGIA: `v_daily_sales` é a fonte do faturamento — a mesma view que o
 * portal usa, e a mesma que o Início usa. Os custos vêm de `costs`. O
 * comparativo ("+12% vs. período anterior") sai de uma segunda janela do MESMO
 * tamanho, imediatamente anterior: é a única comparação honesta, e é a que o
 * design pede.
 *
 * O que este arquivo NÃO faz: puxar `sales` cru e refazer as somas. Foi o que o
 * portal fez, e o levantamento registrou como a maior economia disponível —
 * cresce junto com o negócio e duplica em TypeScript uma conta que o banco já
 * sabe fazer.
 */

interface Window {
  revenueCents: number;
  costCents: number;
  byDay: Map<string, number>;
}

/**
 * Faturamento e custo de uma janela de dias.
 *
 * `v_daily_sales.day` é uma coluna `date`, e `costs.cost_date` também — por
 * isso os dois filtros usam `YYYY-MM-DD` LOCAL, nunca `toISOString()`. Às 21h
 * de Brasília o ISO já aponta para amanhã, e o relatório perderia o próprio dia
 * que está sendo lido.
 */
async function readWindow(fromDay: string, toDay: string): Promise<Window> {
  const [salesResult, costsResult] = await Promise.all([
    supabase
      .from('v_daily_sales')
      .select('day, revenue')
      .gte('day', fromDay)
      .lte('day', toDay)
      .order('day'),
    supabase.from('costs').select('amount').gte('cost_date', fromDay).lte('cost_date', toDay),
  ]);

  if (salesResult.error) throw salesResult.error;
  if (costsResult.error) throw costsResult.error;

  const byDay = new Map<string, number>();
  let revenueCents = 0;

  for (const row of salesResult.data ?? []) {
    const cents = realToCents(row.revenue);
    revenueCents += cents;
    byDay.set(String(row.day), cents);
  }

  let costCents = 0;
  for (const row of costsResult.data ?? []) costCents += realToCents(row.amount);

  return { revenueCents, costCents, byDay };
}

/**
 * A variação entre duas janelas, já como rótulo e tom.
 *
 * `up_bad` existe porque crescer NÃO é sempre boa notícia: despesa subindo é
 * âmbar, não verde. Quem decide o tom é o significado da linha, não o sinal.
 *
 * Período anterior zerado não vira "+∞%": sem base de comparação, a variação
 * some da tela. Um "+100%" inventado sobre uma base zero é pior que nada.
 */
function variation(
  current: number,
  previous: number,
  higherIsBetter: boolean,
): { label: string | null; tone: string } {
  if (previous === 0) return { label: null, tone: 'flat' };

  const percent = Math.round(((current - previous) / Math.abs(previous)) * 100);
  const t = currentMessages().reports;
  if (percent === 0) return { label: t.samePrevious, tone: 'flat' };

  const sign = percent > 0 ? '+' : '−';
  const label = t.vsPrevious(`${sign}${Math.abs(percent)}%`);
  const good = percent > 0 === higherIsBetter;

  return { label, tone: good ? 'up_good' : 'up_bad' };
}

function dayLabel(day: string): string {
  const [y, m, d] = String(day).split('-').map(Number);
  if (!y || !m || !d) return String(day);
  // Construção local (e não `new Date('2026-08-06')`, que é interpretado como
  // UTC) — senão o rótulo do dia sai trocado no fuso do Brasil.
  return currentMessages().reports.weekdays[new Date(y, m - 1, d).getDay()] ?? '';
}

/**
 * Os mais vendidos do período.
 *
 * Sai de `sale_items` e não de `v_product_sales`: aquela view não tem coluna de
 * data, é um acumulado de todo o histórico — serviria para "os campeões de
 * sempre", nunca para "os desta semana".
 */
async function topProducts(range: DateRange) {
  const { data, error } = await supabase
    .from('sale_items')
    // `!inner` para que o filtro na venda REMOVA o item. Sem ele, itens de
    // vendas estornadas voltariam com `sales: null` e entrariam na soma.
    .select('product_name, quantity, subtotal, sales!inner(sold_at, status)')
    .gte('sales.sold_at', startOfDayISO(range.from))
    // Teto exclusivo na meia-noite do dia SEGUINTE ao fim. Antes só havia o
    // piso: um Personalizado no passado somaria tudo o que veio depois dele.
    .lt('sales.sold_at', startOfDayISO(addDaysDateOnly(range.to, 1)))
    .eq('sales.status', SALE_STATUS.completed);

  if (error) throw error;

  const totals = new Map<string, { qty: number; cents: number }>();
  for (const item of data ?? []) {
    const current = totals.get(item.product_name) ?? { qty: 0, cents: 0 };
    current.qty += Number(item.quantity ?? 0);
    current.cents += realToCents(item.subtotal);
    totals.set(item.product_name, current);
  }

  return [...totals.entries()]
    .sort((a, b) => b[1].cents - a[1].cents)
    .slice(0, 5)
    .map(([name, t]) => ({
      name,
      qty_label: currentMessages().reports.units(t.qty),
      amount_cents: t.cents,
    }));
}

export async function fetchReport(tenantId: string, range: DateRange): Promise<ReportAPI | null> {
  void tenantId; // O RLS já isola pelo tenant do usuário logado.

  // Anterior: a janela do mesmo tamanho imediatamente antes — para a
  // comparação valer.
  const previous = previousRange(range);

  const [current, before, top] = await Promise.all([
    readWindow(range.from, range.to),
    readWindow(previous.from, previous.to),
    topProducts(range),
  ]);

  const profit = current.revenueCents - current.costCents;
  const previousProfit = before.revenueCents - before.costCents;

  const revenueVar = variation(current.revenueCents, before.revenueCents, true);
  // Despesa: `higherIsBetter = false` — gastar mais não é boa notícia.
  const costVar = variation(current.costCents, before.costCents, false);
  const profitVar = variation(profit, previousProfit, true);

  const margin = current.revenueCents > 0 ? (profit / current.revenueCents) * 100 : 0;
  const previousMargin =
    before.revenueCents > 0 ? (previousProfit / before.revenueCents) * 100 : 0;

  const rows: ReportRowAPI[] = [
    {
      key: 'income',
      label: currentMessages().reports.rows.income,
      amount_cents: current.revenueCents,
      text_value: null,
      variation_label: revenueVar.label,
      variation_tone: revenueVar.tone,
    },
    {
      key: 'expense',
      label: currentMessages().reports.rows.expense,
      amount_cents: current.costCents,
      text_value: null,
      variation_label: costVar.label,
      variation_tone: costVar.tone,
    },
    {
      key: 'profit',
      label: currentMessages().reports.rows.profit,
      amount_cents: profit,
      text_value: null,
      variation_label: profitVar.label,
      variation_tone: profitVar.tone,
    },
    {
      key: 'margin',
      label: currentMessages().reports.rows.margin,
      amount_cents: null,
      // Margem não é dinheiro: vai como texto para o adapter não formatá-la em
      // reais. É exatamente para isso que `text_value` existe no contrato.
      text_value: `${formatAmount(Math.round(margin * 100))}%`,
      variation_label: variation(
        Math.round(margin * 100),
        Math.round(previousMargin * 100),
        true,
      ).label,
      variation_tone: variation(
        Math.round(margin * 100),
        Math.round(previousMargin * 100),
        true,
      ).tone,
    },
  ];

  // As barras vêm de dias REAIS, na ordem do calendário. Dia sem venda não
  // aparece na view — e precisa aparecer no gráfico como barra zerada, senão o
  // gráfico "pula" o domingo e mente sobre o ritmo da semana.
  const bars: ReportBarAPI[] = eachDay(range).map((day) => ({
    day,
    day_label: dayLabel(day),
    amount_cents: current.byDay.get(day) ?? 0,
  }));

  return { rows, daily_bars: bars, top_products: top };
}
