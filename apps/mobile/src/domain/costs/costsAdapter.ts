import type { CostAPI, CostCreateAPI, MonthSummaryAPI } from './costsApiTypes';
import type { Cost, CostFilter, MonthlySummary, CostType } from './costsTypes';

function toTipo(kind: string): CostType {
  // Qualquer valor desconhecido cai em variável: um custo classificado errado
  // ainda aparece na lista; um custo descartado por enum novo some sem aviso.
  return kind === 'fixed' ? 'fixed' : 'variable';
}

export function toCost(raw: CostAPI): Cost {
  const type = toTipo(raw.kind);
  return {
    id: raw.id,
    name: raw.name,
    amountCents: raw.amount_cents ?? 0,
    type,
    typeLabel: type === 'fixed' ? 'Fixo · todo mês' : 'Variável',
    quando: raw.due_label ?? '—',
    fromStock: raw.from_stock === true,
  };
}

/**
 * `MonthSummaryAPI` → `ResumoDoMes`.
 *
 * "Sobrou" é DERIVADO (entrou − saiu), não lido do servidor. Se viesse pronto,
 * existiriam duas contas para o mesmo número e um dia elas discordariam na
 * tela — que é exatamente o tipo de erro que destrói a confiança do dono nos
 * próprios relatórios.
 */
export function toMonthlySummary(raw: MonthSummaryAPI): MonthlySummary {
  const entrou = raw.income_cents ?? 0;
  const saiu = raw.expense_cents ?? 0;
  return {
    mes: raw.month_label,
    period: raw.range_label,
    entrouCentavos: entrou,
    saiuCentavos: saiu,
    sobrouCentavos: entrou - saiu,
  };
}

export function toCostPayload(tenantId: string, name: string, amountCents: number): CostCreateAPI {
  return { tenant_id: tenantId, name: name.trim(), amount_cents: amountCents, kind: 'variable' };
}

/** Seletor puro dos chips Todos / Fixos / Variáveis. */
export function filterCosts(costs: Cost[], filter: CostFilter): Cost[] {
  if (filter === 'all') return costs;
  const alvo: CostType = filter === 'fixed_only' ? 'fixed' : 'variable';
  return costs.filter((c) => c.type === alvo);
}
