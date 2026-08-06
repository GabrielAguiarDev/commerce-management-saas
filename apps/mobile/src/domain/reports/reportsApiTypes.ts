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
  day_label: string;
  amount_cents: number;
}

export interface ReportTopProductAPI {
  name: string;
  qty_label: string;
  amount_cents: number;
}

export interface ReportAPI {
  period: string;
  rows: ReportRowAPI[];
  daily_bars: ReportBarAPI[];
  top_products: ReportTopProductAPI[];
}
