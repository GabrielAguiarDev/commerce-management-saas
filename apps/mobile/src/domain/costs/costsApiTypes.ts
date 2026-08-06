/** CONTRATO DO BACKEND dos custos. */

export interface CostAPI {
  id: string;
  tenant_id: string;
  name: string;
  amount_cents: number | null;
  /** 'fixed' | 'variable' no banco. */
  kind: string;
  /** "dia 5", "22/07". */
  due_label: string | null;
  /** Custo criado automaticamente por entrada de estoque. */
  from_stock: boolean | null;
}

export interface MonthSummaryAPI {
  month_label: string;
  range_label: string;
  income_cents: number | null;
  expense_cents: number | null;
}

export interface CostCreateAPI {
  tenant_id: string;
  name: string;
  amount_cents: number;
  kind: string;
}
