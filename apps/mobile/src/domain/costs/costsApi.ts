import { COST_ORIGIN, COST_TYPES, costTypeFromDb } from '@domain/shared/dbEnums';
import { supabase } from '@services/supabase';
import { logActivity } from '@domain/shared/activityLog';
import { daysAgoDateOnly, todayDateOnly } from '@utils/dates';
import { centsToReal, realToCents } from '@utils/money';

import type {
  CostAPI,
  CostCreateAPI,
  CostDeleteAPI,
  CostUpdateAPI,
  MonthSummaryAPI,
} from './costsApiTypes';
import { currentLocale, currentMessages } from '@i18n/active';

/**
 * FRONTEIRA DE REDE dos custos.
 *
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE FALA COM O SUPABASE.
 */

/** 180 dias: cobre o comparativo de 90 dias dos relatórios com folga. */
const HISTORY_DAYS = 180;

/**
 * `costs.cost_date` é uma coluna `date` PURA, sem fuso.
 *
 * Por isso a comparação usa `YYYY-MM-DD` no fuso LOCAL, e nunca
 * `toISOString()`: às 21h de Brasília o ISO já aponta para o dia seguinte, e um
 * custo lançado à noite cairia fora do mês em que foi pago.
 */
const COST_COLUMNS =
  'id, tenant_id, description, type, category, amount, origin, cost_date, recurrence_id, competence, series:cost_recurrence_series(active)';

let generation: Promise<void> | null = null;

/**
 * GERA OS MESES QUE FALTAM das séries mensais antes de ler.
 *
 * Não há cron: a RPC materializa as competências vencidas e é idempotente no
 * banco (uma linha por série + mês), então retry e leituras concorrentes não
 * duplicam. A lista e o resumo do mês carregam juntos; a promessa em voo é
 * compartilhada para não chamar a RPC duas vezes na mesma tela.
 *
 * Falhar aqui não derruba a leitura: o que já foi lançado continua na tela e
 * a próxima leitura tenta gerar de novo.
 */
function generateRecurringCosts(): Promise<void> {
  generation ??= (async () => {
    try {
      const { error } = await supabase.rpc('generate_recurring_costs');
      if (error) console.warn('generate_recurring_costs', error.message);
    } catch (e) {
      console.warn('generate_recurring_costs', e);
    } finally {
      generation = null;
    }
  })();
  return generation;
}

interface CostRow {
  id: string;
  tenant_id: string;
  description: string;
  type: string | null;
  category: string | null;
  amount: number | null;
  origin: string | null;
  cost_date: string;
  recurrence_id: string | null;
  competence: string | null;
  series: { active: boolean | null } | { active: boolean | null }[] | null;
}

function toCostAPI(c: CostRow): CostAPI {
  // O embed many-to-one vem como objeto; o client sem tipos não garante.
  const series = Array.isArray(c.series) ? c.series[0] : c.series;
  const seriesActive = c.recurrence_id != null && series?.active === true;
  return {
    id: c.id,
    tenant_id: c.tenant_id,
    name: c.description,
    amount_cents: realToCents(c.amount),
    kind: costTypeFromDb(c.type),
    due_label: dueLabel(c.cost_date, seriesActive),
    // Custo que nasceu de uma entrada de estoque. A tela usa isto para explicar
    // por que a despesa apareceu sem ninguém digitar.
    from_stock: c.origin === COST_ORIGIN.stock,
    recurrence_id: c.recurrence_id,
    series_active: seriesActive,
    competence: c.competence,
    cost_date: c.cost_date,
    category: c.category,
  };
}

export async function listCosts(tenantId: string): Promise<CostAPI[]> {
  void tenantId; // O RLS já isola pelo tenant do usuário logado.

  await generateRecurringCosts();

  const { data, error } = await supabase
    .from('costs')
    .select(COST_COLUMNS)
    .gte('cost_date', daysAgoDateOnly(HISTORY_DAYS))
    .order('cost_date', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as CostRow[]).map(toCostAPI);
}

/**
 * "dia 5" para custo recorrente, "22/07" para o resto.
 *
 * Recorrente é mensal: o que importa é o DIA do mês em que ele volta, não a
 * data do último lançamento. Mostrar "22/07" num aluguel faria parecer uma
 * despesa avulsa daquele dia.
 */
function dueLabel(costDate: string, isRecurring: boolean | null): string | null {
  const [, month, day] = costDate.split('-');
  if (!month || !day) return null;
  return isRecurring ? currentMessages().costs.dueDay(Number(day)) : `${day}/${month}`;
}

/**
 * O RESULTADO DO MÊS — o card "sobrou" da tela de Custos.
 *
 * Vem de `v_monthly_result`, a MESMA view que o portal usa. Somar as vendas e
 * os custos aqui no cliente daria um segundo número que pode discordar do que
 * o dono vê no navegador — e "quanto sobrou" é justamente o número que ele
 * confere entre as duas telas.
 *
 * A view devolve uma linha por mês; queremos a do mês corrente. `profit` é
 * ignorado de propósito: o contrato deste domínio é receita × despesa, e o
 * "sobrou" é derivado no adapter a partir dos dois — um lugar só para a conta.
 */
export async function fetchMonthlySummary(tenantId: string): Promise<MonthSummaryAPI | null> {
  void tenantId;

  // Esta consulta pode correr antes da lista na tela. Gerar aqui também evita
  // que o card mensal mostre um total sem o mês que acabou de vencer.
  await generateRecurringCosts();

  const { data, error } = await supabase
    .from('v_monthly_result')
    .select('month, revenue, total_costs')
    .order('month', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    month_label: monthLabel(data.month),
    range_label: rangeLabel(data.month),
    income_cents: realToCents(data.revenue),
    expense_cents: realToCents(data.total_costs),
  };
}


/**
 * `v_monthly_result.month` chega como data do primeiro dia do mês. O nome do
 * mês vem do `Intl`, no idioma do app ("Julho" / "July").
 */
function monthLabel(month: string): string {
  const [y, m] = String(month).split('-').map(Number);
  if (!y || !m) return String(month);
  const name = new Date(y, m - 1, 1).toLocaleDateString(currentLocale(), { month: 'long' });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function rangeLabel(month: string): string {
  const [year, m] = String(month).split('-');
  const monthIndex = Number(m);
  if (!year || !monthIndex) return '';
  // Dia 0 do mês seguinte é o último dia deste — evita a tabela de 28/30/31 e
  // acerta fevereiro bissexto sozinho.
  const lastDay = new Date(Number(year), monthIndex, 0).getDate();
  const mm = String(monthIndex).padStart(2, '0');
  return currentMessages().costs.monthRange(`01/${mm}`, `${lastDay}/${mm}`);
}

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export async function createCost(payload: CostCreateAPI): Promise<CostAPI> {
  const costDate = todayDateOnly();

  const { data: savedId, error: saveError } = await supabase.rpc('save_manual_cost', {
    p_id: null,
    p_description: payload.name,
    p_type: payload.kind === COST_TYPES.fixed ? COST_TYPES.fixed : COST_TYPES.variable,
    p_category: null,
    p_amount: centsToReal(payload.amount_cents),
    p_cost_date: costDate,
    p_is_recurring: payload.recurring,
  });

  if (saveError) throw saveError;

  const { data, error } = await supabase
    .from('costs')
    .select(COST_COLUMNS)
    .eq('id', savedId)
    .single();

  if (error) throw error;
  const row = data as unknown as CostRow;

  logActivity('cost.created', {
    entityId: row.id,
    summary: `${payload.name} · ${brl(payload.amount_cents)}`,
  });

  return toCostAPI(row);
}

/**
 * Edita um custo manual. A RPC decide o alcance: em série ativa vale para este
 * mês e os seguintes; desligar a repetição encerra a série e mantém este mês;
 * custo de estoque é recusado no servidor.
 */
export async function updateCost(payload: CostUpdateAPI): Promise<void> {
  const { error } = await supabase.rpc('save_manual_cost', {
    p_id: payload.id,
    p_description: payload.name,
    p_type: payload.kind === COST_TYPES.fixed ? COST_TYPES.fixed : COST_TYPES.variable,
    p_category: payload.category,
    p_amount: centsToReal(payload.amount_cents),
    p_cost_date: payload.cost_date,
    p_is_recurring: payload.recurring,
  });

  if (error) throw error;

  logActivity('cost.updated', {
    entityId: payload.id,
    summary: `${payload.name} · ${brl(payload.amount_cents)}`,
  });
}

/**
 * Exclui um custo manual. Em série, a RPC encerra a repetição na competência
 * escolhida: ela e as seguintes saem, as anteriores ficam como histórico.
 */
export async function deleteCost(payload: CostDeleteAPI): Promise<void> {
  const { error } = await supabase.rpc('delete_manual_cost', { p_id: payload.id });

  if (error) throw error;

  // Mesmo resumo que o portal grava para a mesma ação.
  logActivity('cost.deleted', {
    entityId: payload.id,
    summary: `${payload.name}${payload.stops_repeating ? ' · parou de repetir' : ''}`,
  });
}
