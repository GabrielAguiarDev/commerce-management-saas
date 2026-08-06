/** MODELO DE DOMÍNIO dos relatórios. */

export type ReportPeriod = 'today' | 'week' | 'month' | 'custom';

export const PERIODS: { key: ReportPeriod; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mês' },
  { key: 'custom', label: 'Personalizado' },
];

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
  dia: string;
  amountCents: number;
  /** Altura relativa 0..1; a tela multiplica pela altura do gráfico. */
  ratio: number;
  /** O maior dia da semana ganha o teal cheio. */
  destacada: boolean;
}

export interface TopProduct {
  name: string;
  quantityLabel: string;
  totalCents: number;
}

export interface Report {
  period: ReportPeriod;
  finance: FinanceLine[];
  bars: DayBar[];
  topProducts: TopProduct[];
}

export function periodLabel(p: ReportPeriod): string {
  return PERIODS.find((x) => x.key === p)?.label ?? 'Esta semana';
}
