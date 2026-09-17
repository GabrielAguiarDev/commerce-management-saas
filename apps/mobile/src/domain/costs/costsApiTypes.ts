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
  /** Série mensal explícita; nulo em custo avulso/estoque. */
  recurrence_id: string | null;
  /** A série ainda gera lançamentos; false quando foi encerrada. */
  series_active: boolean | null;
  /** `YYYY-MM-01`: o mês que este lançamento da série representa. */
  competence: string | null;
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
  recurring: boolean;
}
