/** CONTRATO DO BACKEND dos relatórios. */

export interface ReportRowAPI {
  key: string;
  label: string;
  amount_cents: number | null;
  /** Preenchido quando a linha não é dinheiro (margem em %). */
  text_value: string | null;
  variation_label: string | null;
  /** 'up_good' | 'up_bad' | 'flat' */
  variation_tone: string | null;
}

export interface ReportBarAPI {
  /** O dia de calendário, `YYYY-MM-DD` — único dentro do período. */
  day: string;
  day_label: string;
  amount_cents: number;
}

export interface ReportTopProductAPI {
  name: string;
  qty_label: string;
  amount_cents: number;
}

export interface ReportAPI {
  rows: ReportRowAPI[];
  daily_bars: ReportBarAPI[];
  top_products: ReportTopProductAPI[];
}
