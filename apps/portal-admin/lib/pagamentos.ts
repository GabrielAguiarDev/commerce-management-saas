import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Payment, MonthlyRevenue, PaymentStatus } from "@/types/types";

/**
 * Financeiro da plataforma, lido de `platform_payments`.
 *
 * É a mensalidade que cada tenant paga à Aguiar One — não confundir com o
 * faturamento do comércio do cliente, que vive em `sales` e na view
 * `v_monthly_result`. São coisas diferentes e nunca devem se misturar.
 *
 * SEGURANÇA: cliente de sessão, sob RLS (a tabela tem política
 * `is_platform_admin`). Só leitura aqui; as escritas ficam nas Server Actions.
 */

interface PaymentRow {
  id: string;
  tenant_id: string;
  amount: number | string;
  reference_month: string;
  status: string | null;
  paid_at: string | null;
  due_date: string | null;
}

const SELECT = "id, tenant_id, amount, reference_month, status, paid_at, due_date";

/** Quantos meses o gráfico de receita mostra. */
const CHART_MONTHS = 6;

const MONTH_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toNumber(v: number | string | null): number {
  const n = typeof v === "string" ? Number(v) : (v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** dd/mm/aaaa a partir de um `date` ou `timestamptz`. */
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** mm/aaaa a partir do `reference_month` (aaaa-mm-dd). */
function formatMonth(iso: string | null): string {
  if (!iso) return "—";
  const [ano, month] = iso.split("-");
  return ano && month ? `${month}/${ano}` : "—";
}

function formatAmount(v: number): string {
  return "R$ " + v.toFixed(2).replace(".", ",");
}

/**
 * Traduz o status da linha para o vocabulário da tela.
 *
 * "Atrasado" é DERIVADO, não lido: uma cobrança pendente cujo vencimento já
 * passou está atrasada, mesmo que ninguém tenha rodado uma rotina para marcar
 * isso na coluna. Confiar só no `status` deixaria inadimplência invisível até
 * alguém lembrar de atualizar o banco.
 */
function paraStatus(linha: PaymentRow, today: Date): PaymentStatus {
  if (linha.status === "paid") return "emdia";
  if (linha.status === "overdue" || linha.status === "late") return "atrasado";

  if (linha.due_date) {
    const due = new Date(linha.due_date + "T00:00:00Z");
    if (!Number.isNaN(due.getTime()) && due < today) return "atrasado";
  }
  return "pendente";
}

export interface BillingResult {
  /** Situação atual de cada cliente, chaveada pelo id do tenant. */
  payments: Record<string, Payment>;
  /** Receita recebida por mês, para o gráfico. */
  revenue: MonthlyRevenue[];
  error: string | null;
}

const EMPTY: Omit<BillingResult, "error"> = { payments: {}, revenue: [] };

export async function listBilling(): Promise<BillingResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ...EMPTY, error: "Supabase não configurado." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("platform_payments")
    .select(SELECT)
    // Mais recente primeiro: é a ordem em que o histórico é montado abaixo.
    .order("reference_month", { ascending: false });

  if (error) {
    console.error("[listarFinanceiro] falha ao ler platform_payments:", error.message);
    return { ...EMPTY, error: `Não foi possível carregar o financeiro: ${error.message}` };
  }

  const rows = (data as PaymentRow[]) ?? [];
  const today = new Date();

  // ─── Situação por cliente ──────────────────────────────────────────
  // Como as linhas já vêm da mais recente para a mais antiga, a PRIMEIRA de
  // cada tenant é a que define o status atual; as demais viram histórico.
  const payments: Record<string, Payment> = {};

  for (const linha of rows) {
    const amount = formatAmount(toNumber(linha.amount));
    const installment = {
      paid: formatDate(linha.paid_at),
      month: formatMonth(linha.reference_month),
      amount,
    };
    const current = payments[linha.tenant_id];

    if (!current) {
      payments[linha.tenant_id] = {
        status: paraStatus(linha, today),
        latest: linha.paid_at ? formatDate(linha.paid_at) : "—",
        vencimento: formatDate(linha.due_date),
        hist: linha.paid_at ? [installment] : [],
      };
      continue;
    }

    // Histórico é só do que foi efetivamente pago — uma cobrança em aberto não
    // é um pagamento e não pode entrar na lista de recibos.
    if (linha.paid_at) {
      current.hist.push(installment);
      // O "último pagamento" pode estar numa linha anterior, se o mês corrente
      // ainda estiver em aberto.
      if (current.latest === "—") current.latest = formatDate(linha.paid_at);
    }
  }

  // ─── Receita por mês ───────────────────────────────────────────────
  // Só o que foi pago conta como receita; pendente é promessa, não caixa.
  const byMonth = new Map<string, number>();
  for (const linha of rows) {
    if (linha.status !== "paid") continue;
    // `reference_month` é um `date` (aaaa-mm-dd); a chave é o aaaa-mm.
    const key = linha.reference_month.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + toNumber(linha.amount));
  }

  // Os últimos seis meses SEMPRE aparecem, mesmo zerados: um mês sem receita é
  // informação, e some do gráfico se ele for montado só com o que existe.
  const revenue: MonthlyRevenue[] = [];
  for (let i = CHART_MONTHS - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    revenue.push({
      month: { pt: MONTH_PT[d.getUTCMonth()], en: MONTH_EN[d.getUTCMonth()] },
      amount: byMonth.get(key) ?? 0,
    });
  }

  return { payments, revenue, error: null };
}
