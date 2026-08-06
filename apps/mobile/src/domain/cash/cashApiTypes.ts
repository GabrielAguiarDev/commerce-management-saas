/** CONTRATO DO BACKEND do caixa. */

export interface CashMethodTotalAPI {
  method: string;
  amount_cents: number;
}

export interface CashShiftAPI {
  id: string;
  tenant_id: string;
  /** ISO 8601. `closed_at` nulo = turno em andamento. */
  opened_at: string;
  closed_at: string | null;
  opening_cents: number;
  drawer_cents: number;
  method_totals: CashMethodTotalAPI[];
}

export interface CashHistoryAPI {
  id: string;
  date_label: string;
  period_label: string;
  total_cents: number;
  /** Positivo sobrou, negativo faltou, zero bateu. */
  difference_cents: number | null;
}

export interface CashAdjustmentAPI {
  shift_id: string;
  /** 'withdrawal' (sangria) ou 'deposit' (reforço). */
  kind: 'withdrawal' | 'deposit';
  amount_cents: number;
  reason: string | null;
}
