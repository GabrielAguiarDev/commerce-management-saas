/** MODELO DE DOMÍNIO dos relatórios. */

import type { DateRange } from './reportsPeriod';
import { currentMessages } from '@i18n/active';
import type { Messages } from '@i18n/en';

export type ReportPeriod = 'today' | 'week' | 'month' | 'custom';

/** A ordem dos chips. O rótulo de cada um vem do idioma (`periodLabel`). */
export const PERIODS: readonly ReportPeriod[] = ['today', 'week', 'month', 'custom'];

/** Como a variação deve ser lida: crescer despesa não é boa notícia. */
export type TrendTone = 'positive' | 'warning' | 'neutral';

export interface FinanceLine {
  key: string;
  label: string;
  /** Já formatado quando não é dinheiro (ex.: "51,3%" da margem). */
  formattedAmount: string;
  trend: string;
  tone: TrendTone;
  /** 'texto' | 'dinheiro' | 'positive' | 'negative' — decide a cor do valor. */
  highlight: 'neutral' | 'positive' | 'negative';
}

export interface DayBar {
  /**
   * `YYYY-MM-DD`. É a chave da barra: o dia da semana (`dia`) se repete num
   * período de 30 dias, e usá-lo como `key` quebrava a lista.
   */
  key: string;
  /** Dia da semana curto — o rótulo do eixo quando o período cabe numa semana. */
  dia: string;
  /** Dia do mês, sem zero à esquerda — o rótulo do eixo nos períodos longos. */
  diaDoMes: string;
  /** "sex, 04/09" — o que a exportação mostra, onde "sex" sozinho seria ambíguo. */
  rotuloCompleto: string;
  amountCents: number;
  /** Altura relativa 0..1; a tela multiplica pela altura do gráfico. */
  ratio: number;
  /** O maior dia do período ganha o teal cheio. */
  destacada: boolean;
}

export interface TopProduct {
  name: string;
  quantityLabel: string;
  totalCents: number;
}

export interface Report {
  period: ReportPeriod;
  /** As datas que o relatório cobre de fato — o subtítulo e a exportação dizem quais. */
  range: DateRange;
  finance: FinanceLine[];
  bars: DayBar[];
  topProducts: TopProduct[];
}

export function periodLabel(p: ReportPeriod, t: Messages = currentMessages()): string {
  return t.reports.periods[p];
}
