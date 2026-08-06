import { formatBRL } from '@utils/money';

import type { ReportAPI, ReportBarAPI, ReportRowAPI } from './reportsApiTypes';
import type {
  DayBar,
  FinanceLine,
  ReportPeriod,
  Report,
  TrendTone,
} from './reportsTypes';

function toTom(tone: string | null): TrendTone {
  if (tone === 'up_bad') return 'warning';
  if (tone === 'flat') return 'neutral';
  return 'positive';
}

/**
 * A cor do VALOR (não da variação) segue o significado da linha, não o sinal
 * do número: "Saiu" é sempre vermelho mesmo caindo, "Sobrou" é sempre verde
 * mesmo baixo. É como o dono lê a tabela — vermelho = dinheiro que foi embora.
 */
function toDestaque(key: string): FinanceLine['highlight'] {
  if (key === 'expense') return 'negative';
  if (key === 'profit') return 'positive';
  return 'neutral';
}

function toLinha(raw: ReportRowAPI): FinanceLine {
  return {
    key: raw.key,
    label: raw.label,
    formattedAmount: raw.text_value ?? formatBRL(raw.amount_cents ?? 0),
    trend: raw.variation_label ?? '',
    tone: toTom(raw.variation_tone),
    highlight: toDestaque(raw.key),
  };
}

/**
 * Barras do gráfico "Vendas por dia".
 *
 * A PROPORÇÃO é calculada aqui, no adapter, e não na tela: a tela recebe
 * 0..1 e multiplica pela altura que ela tiver. Foi assim que o gráfico deixou
 * de depender dos 130px fixos do protótipo e passou a funcionar em qualquer
 * largura de aparelho.
 *
 * Semana inteira zerada não pode virar divisão por zero: cai em proporção 0.
 */
export function toBarras(raws: ReportBarAPI[]): DayBar[] {
  const maior = raws.reduce((m, b) => Math.max(m, b.amount_cents), 0);

  return raws.map((b) => ({
    dia: b.day_label,
    amountCents: b.amount_cents,
    ratio: maior > 0 ? b.amount_cents / maior : 0,
    destacada: maior > 0 && b.amount_cents === maior,
  }));
}

export function toReport(raw: ReportAPI, period: ReportPeriod): Report {
  return {
    period,
    finance: raw.rows.map(toLinha),
    bars: toBarras(raw.daily_bars),
    topProducts: raw.top_products.map((t) => ({
      name: t.name,
      quantityLabel: t.qty_label,
      totalCents: t.amount_cents,
    })),
  };
}
