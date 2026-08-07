import { COST_ORIGIN, COST_TYPES, costTypeFromDb } from '@domain/shared/dbEnums';
import { supabase } from '@services/supabase';
import { daysAgoDateOnly, todayDateOnly } from '@utils/dates';
import { centsToReal, realToCents } from '@utils/money';

import type { CostAPI, CostCreateAPI, MonthSummaryAPI } from './costsApiTypes';

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
export async function listCosts(tenantId: string): Promise<CostAPI[]> {
  void tenantId; // O RLS já isola pelo tenant do usuário logado.

  const { data, error } = await supabase
    .from('costs')
    .select('id, tenant_id, description, type, category, amount, is_recurring, origin, cost_date')
    .gte('cost_date', daysAgoDateOnly(HISTORY_DAYS))
    .order('cost_date', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((c) => ({
    id: c.id,
    tenant_id: c.tenant_id,
    name: c.description,
    amount_cents: realToCents(c.amount),
    kind: costTypeFromDb(c.type),
    due_label: dueLabel(c.cost_date, c.is_recurring),
    // Custo que nasceu de uma entrada de estoque. A tela usa isto para explicar
    // por que a despesa apareceu sem ninguém digitar.
    from_stock: c.origin === COST_ORIGIN.stock,
  }));
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
  return isRecurring ? `dia ${Number(day)}` : `${day}/${month}`;
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

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/** `v_monthly_result.month` chega como data do primeiro dia do mês. */
function monthLabel(month: string): string {
  const [, m] = String(month).split('-');
  return MONTHS[Number(m) - 1] ?? String(month);
}

function rangeLabel(month: string): string {
  const [year, m] = String(month).split('-');
  const monthIndex = Number(m);
  if (!year || !monthIndex) return '';
  // Dia 0 do mês seguinte é o último dia deste — evita a tabela de 28/30/31 e
  // acerta fevereiro bissexto sozinho.
  const lastDay = new Date(Number(year), monthIndex, 0).getDate();
  return `01/${String(monthIndex).padStart(2, '0')} a ${lastDay}/${String(monthIndex).padStart(2, '0')}`;
}

export async function createCost(payload: CostCreateAPI): Promise<CostAPI> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('costs')
    .insert({
      tenant_id: payload.tenant_id,
      user_id: user?.id ?? null,
      description: payload.name,
      type: payload.kind === COST_TYPES.fixed ? COST_TYPES.fixed : COST_TYPES.variable,
      category: null,
      amount: centsToReal(payload.amount_cents),
      is_recurring: payload.kind === COST_TYPES.fixed,
      origin: COST_ORIGIN.manual,
      cost_date: todayDateOnly(),
    })
    .select('id, tenant_id, description, type, amount, is_recurring, origin, cost_date')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    name: data.description,
    amount_cents: realToCents(data.amount),
    kind: costTypeFromDb(data.type),
    due_label: dueLabel(data.cost_date, data.is_recurring),
    from_stock: false,
  };
}
