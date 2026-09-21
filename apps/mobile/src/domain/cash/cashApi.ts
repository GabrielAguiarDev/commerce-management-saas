import {
  PAYMENT_METHODS,
  REGISTER_STATUS,
  SALE_STATUS,
  paymentFromDb,
  registerMovementFromDb,
} from '@domain/shared/dbEnums';
import { supabase } from '@services/supabase';
import { logActivity } from '@domain/shared/activityLog';
import { daysAgoISO, daysSince } from '@utils/dates';
import { centsToReal, realToCents } from '@utils/money';

import type { CashAdjustmentAPI, CashHistoryAPI, CashShiftAPI } from './cashApiTypes';
import { currentMessages } from '@i18n/active';

/**
 * FRONTEIRA DE REDE do caixa.
 *
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE FALA COM O SUPABASE.
 *
 * A REGRA QUE GOVERNA ESTE ARQUIVO: **só dinheiro entra na gaveta.** Pix e
 * cartão caem na conta bancária e são conferidos no extrato, não no
 * fechamento. É a mesma regra da função `expected_cash_for_register` do banco,
 * e é por isso que `drawer_cents` soma apenas as vendas em `cash`.
 */

/** Quantos dias de turnos fechados a tela de histórico mostra. */
const HISTORY_DAYS = 60;

const REGISTER_COLUMNS =
  'id, tenant_id, opening_amount, status, expected_cash, counted_cash, difference, opened_at, closed_at, cash_movements(id, type, amount, reason, created_at)';

interface RegisterRow {
  id: string;
  tenant_id: string;
  opening_amount: number | null;
  status: string | null;
  expected_cash: number | null;
  counted_cash: number | null;
  difference: number | null;
  opened_at: string;
  closed_at: string | null;
  cash_movements: { id: string; type: string | null; amount: number | null }[] | null;
}

/** Reforço entra na gaveta, sangria sai dela. */
function movementsBalanceCents(row: RegisterRow): number {
  return (row.cash_movements ?? []).reduce((total, m) => {
    const cents = realToCents(m.amount);
    return total + (registerMovementFromDb(m.type) === 'deposit' ? cents : -cents);
  }, 0);
}

/** Quanto cada forma de pagamento rendeu numa janela de tempo. */
async function salesByMethodCents(from: string, to: string | null) {
  const query = supabase
    .from('sales')
    .select('total, payment_method')
    .eq('status', SALE_STATUS.completed)
    .gte('sold_at', from);

  // Turno aberto não tem fim: tudo desde a abertura conta.
  const { data, error } = to ? await query.lte('sold_at', to) : await query;
  if (error) throw error;

  const totals = new Map<string, number>();
  for (const method of PAYMENT_METHODS) totals.set(method, 0);

  for (const sale of data ?? []) {
    const method = paymentFromDb(sale.payment_method);
    totals.set(method, (totals.get(method) ?? 0) + realToCents(sale.total));
  }

  return totals;
}

/**
 * O TURNO ABERTO, se houver.
 *
 * A `drawer_cents` (o que deveria estar na gaveta agora) é composta aqui, e não
 * lida de uma coluna, porque não existe coluna: `cash_registers.expected_cash`
 * só é preenchida NO FECHAMENTO, por `close_cash_register`. Enquanto o turno
 * corre, o esperado é abertura + vendas em dinheiro + reforços − sangrias.
 */
export async function fetchOpenShift(tenantId: string): Promise<CashShiftAPI | null> {
  const { data, error } = await supabase
    .from('cash_registers')
    .select(REGISTER_COLUMNS)
    .eq('status', REGISTER_STATUS.open)
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as RegisterRow;
  const totals = await salesByMethodCents(row.opened_at, null);
  const openingCents = realToCents(row.opening_amount);

  return {
    id: row.id,
    tenant_id: tenantId,
    opened_at: row.opened_at,
    closed_at: null,
    opening_cents: openingCents,
    // Só `cash`: Pix e cartão não passam pela gaveta.
    drawer_cents: openingCents + (totals.get('cash') ?? 0) + movementsBalanceCents(row),
    // A CHAVE (`cash`, `pix`…), não o rótulo: o nome exibido é do idioma e
    // quem o escolhe é o adapter.
    method_totals: PAYMENT_METHODS.map((method) => ({
      method,
      amount_cents: totals.get(method) ?? 0,
    })),
  };
}

/**
 * O histórico de turnos fechados.
 *
 * O `total_cents` é o que ENTROU no turno somando todas as formas — é o número
 * que a linha do histórico mostra. Vem de uma consulta por turno; são poucos
 * (60 dias de um comércio pequeno) e cada um precisa da própria janela de
 * tempo, que o PostgREST não sabe agrupar numa ida só.
 */
export async function listHistory(tenantId: string): Promise<CashHistoryAPI[]> {
  void tenantId;

  const { data, error } = await supabase
    .from('cash_registers')
    .select(REGISTER_COLUMNS)
    .neq('status', REGISTER_STATUS.open)
    .not('closed_at', 'is', null)
    .gte('opened_at', daysAgoISO(HISTORY_DAYS))
    .order('opened_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as RegisterRow[];

  return Promise.all(
    rows.map(async (row) => {
      const totals = await salesByMethodCents(row.opened_at, row.closed_at);
      let total = 0;
      for (const value of totals.values()) total += value;

      return {
        id: row.id,
        date_label: dateLabel(row.opened_at),
        period_label: `${clock(row.opened_at)} → ${clock(row.closed_at)}`,
        total_cents: total,
        // A diferença vem CARIMBADA por `close_cash_register`. Recalcular aqui
        // criaria uma segunda conta que pode discordar da que ficou gravada —
        // e a gravada é a que o dono viu no momento de fechar.
        difference_cents: row.difference == null ? null : realToCents(row.difference),
      };
    }),
  );
}

function clock(iso: string | null): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function dateLabel(iso: string): string {
  const days = daysSince(iso);
  if (days === 0) return currentMessages().time.today;
  if (days === 1) return currentMessages().cash.yesterday;
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * ABRIR O CAIXA.
 *
 * O índice parcial do banco recusa uma segunda abertura. Não fazemos uma
 * leitura antes do insert: ela teria uma corrida entre dois aparelhos.
 */
export async function openShift(
  tenantId: string,
  aberturaCentavos: number,
): Promise<CashShiftAPI> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('cash_registers')
    .insert({
      tenant_id: tenantId,
      opened_by: user?.id ?? null,
      opening_amount: centsToReal(aberturaCentavos),
      status: REGISTER_STATUS.open,
      opened_at: new Date().toISOString(),
    })
    .select('id, opened_at')
    .single();

  if (error) throw error;

  logActivity('register.opened', {
    entityId: data.id,
    summary: `Troco de ${moeda(aberturaCentavos)}`,
  });

  return {
    id: data.id,
    tenant_id: tenantId,
    opened_at: data.opened_at,
    closed_at: null,
    opening_cents: aberturaCentavos,
    drawer_cents: aberturaCentavos,
    method_totals: PAYMENT_METHODS.map((method) => ({ method, amount_cents: 0 })),
  };
}

/** Sangria ou reforço. O valor é sempre positivo; o TIPO é que dá o sentido. */
export async function recordAdjustment(
  tenantId: string,
  payload: CashAdjustmentAPI,
): Promise<CashShiftAPI | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('cash_movements').insert({
    tenant_id: tenantId,
    cash_register_id: payload.shift_id,
    user_id: user?.id ?? null,
    type: payload.kind,
    amount: centsToReal(payload.amount_cents),
    reason: payload.reason?.trim() || null,
    created_at: new Date().toISOString(),
  });

  if (error) throw error;

  logActivity(payload.kind === 'deposit' ? 'register.deposit' : 'register.withdrawal', {
    entityId: payload.shift_id,
    summary: moeda(payload.amount_cents),
  });

  // Relê o turno para devolver a gaveta já recalculada — a conta de quanto há
  // na gaveta mora num lugar só (`fetchOpenShift`), e duplicá-la aqui é como
  // as duas metades passam a discordar.
  return fetchOpenShift(tenantId);
}

/**
 * FECHAR O CAIXA.
 *
 * ⚠️ Quem calcula o esperado e a diferença é o BANCO, em `close_cash_register`.
 * Esta função manda o que foi CONTADO EM DINHEIRO, não a diferença que o app
 * calculou. O motivo é direto: a conta que fica gravada no histórico não pode
 * depender do que o celular achava que sabia sobre as vendas do turno.
 *
 * O app continua calculando a diferença para MOSTRAR na hora da conferência
 * (`calcularDiferenca`, função pura e testada) — mas o que vale é o carimbo.
 */
export async function closeShift(
  tenantId: string,
  shiftId: string,
  contadoEmDinheiroCentavos: number,
  observacao: string | null,
): Promise<CashHistoryAPI | null> {
  const { error } = await supabase.rpc('close_cash_register', {
    p_register_id: shiftId,
    p_counted_cash: centsToReal(contadoEmDinheiroCentavos),
    p_note: observacao?.trim() || null,
  });

  if (error) throw error;

  logActivity('register.closed', {
    entityId: shiftId,
    summary: `Contado em dinheiro: ${moeda(contadoEmDinheiroCentavos)}`,
  });

  const history = await listHistory(tenantId);
  return history.find((h) => h.id === shiftId) ?? null;
}

/** Centavos → `R$ 12,34`, gravado pronto no histórico — ver `logActivity`. */
function moeda(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
