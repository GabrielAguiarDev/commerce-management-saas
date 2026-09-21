import type { CostAPI, CostCreateAPI, CostUpdateAPI, MonthSummaryAPI } from './costsApiTypes';
import type {
  Cost,
  CostChanges,
  CostErrorCode,
  CostFilter,
  CostType,
  MonthlySummary,
} from './costsTypes';
import { currentMessages } from '@i18n/active';

function toTipo(kind: string): CostType {
  // Qualquer valor desconhecido cai em variável: um custo classificado errado
  // ainda aparece na lista; um custo descartado por enum novo some sem aviso.
  return kind === 'fixed' ? 'fixed' : 'variable';
}

/** `2026-09-01` → `09/2026`; qualquer outra coisa → null. */
export function toCompetenceLabel(competence: string | null): string | null {
  const match = competence ? /^(\d{4})-(\d{2})-\d{2}$/.exec(competence) : null;
  return match ? `${match[2]}/${match[1]}` : null;
}

function typeLabelOf(type: CostType, repeating: boolean): string {
  const t = currentMessages().costs.kindLabel;
  if (type !== 'fixed') return t.variable;
  return repeating ? t.fixedMonthly : t.fixed;
}

export function toCost(raw: CostAPI): Cost {
  const type = toTipo(raw.kind);
  const recurring = raw.recurrence_id != null;
  // Só a série ATIVA repete. Um lançamento de série encerrada é história e
  // aparece como um fixo comum.
  const repeating = recurring && raw.series_active === true;
  return {
    id: raw.id,
    name: raw.name,
    amountCents: raw.amount_cents ?? 0,
    type,
    typeLabel: typeLabelOf(type, repeating),
    quando: raw.due_label ?? '—',
    recurring,
    repeating,
    competenceLabel: recurring ? toCompetenceLabel(raw.competence) : null,
    fromStock: raw.from_stock === true,
    costDate: raw.cost_date,
    category: raw.category,
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

export function toCostPayload(
  tenantId: string,
  name: string,
  amountCents: number,
  type: CostType,
  recurring: boolean,
): CostCreateAPI {
  return {
    tenant_id: tenantId,
    name: name.trim(),
    amount_cents: amountCents,
    kind: type,
    recurring: type === 'fixed' && recurring,
  };
}

/**
 * Edição de um custo já lançado.
 *
 * Categoria e data vêm do ORIGINAL: o app não mostra esses campos, e mandar
 * nulo apagaria a categoria que alguém escolheu no portal. Em série a data
 * também não muda — o servidor mantém o dia âncora da repetição.
 */
export function toCostUpdatePayload(cost: Cost, changes: CostChanges): CostUpdateAPI {
  return {
    id: cost.id,
    name: changes.name.trim(),
    amount_cents: changes.amountCents,
    kind: changes.type,
    category: cost.category,
    cost_date: cost.costDate,
    recurring: changes.type === 'fixed' && changes.recurring,
  };
}

/**
 * Erro do Postgres/PostgREST → código do domínio.
 *
 * As RPCs de custo levantam SQLSTATE + mensagem em português. O SQLSTATE
 * separa a família; a mensagem só desempata dentro dela (estoque × permissão,
 * nome × valor). Qualquer coisa sem código conhecido é tratada como rede.
 */
export function toCostErrorCode(error: unknown): CostErrorCode {
  const raw = (error ?? {}) as { code?: unknown; message?: unknown };
  const code = typeof raw.code === 'string' ? raw.code : '';
  const message = typeof raw.message === 'string' ? raw.message.toLowerCase() : '';

  if (code === '42501') return message.includes('estoque') ? 'from_stock' : 'forbidden';
  if (code === 'P0002') return 'not_found';
  if (code === '22023') {
    if (message.includes('o que foi o gasto')) return 'name_required';
    if (message.includes('valor')) return 'invalid_amount';
    return 'invalid_data';
  }
  return 'network';
}

/** Seletor puro dos chips Todos / Fixos / Variáveis. */
export function filterCosts(costs: Cost[], filter: CostFilter): Cost[] {
  if (filter === 'all') return costs;
  const alvo: CostType = filter === 'fixed_only' ? 'fixed' : 'variable';
  return costs.filter((c) => c.type === alvo);
}
