import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Pagamento, ReceitaMes, StatusPagamento } from "@/types/types";

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

interface LinhaPagamento {
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
const MESES_NO_GRAFICO = 6;

const MES_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MES_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function paraNumero(v: number | string | null): number {
  const n = typeof v === "string" ? Number(v) : (v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** dd/mm/aaaa a partir de um `date` ou `timestamptz`. */
function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** mm/aaaa a partir do `reference_month` (aaaa-mm-dd). */
function formatarMes(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes] = iso.split("-");
  return ano && mes ? `${mes}/${ano}` : "—";
}

function formatarValor(v: number): string {
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
function paraStatus(linha: LinhaPagamento, hoje: Date): StatusPagamento {
  if (linha.status === "paid") return "emdia";
  if (linha.status === "overdue" || linha.status === "late") return "atrasado";

  if (linha.due_date) {
    const venc = new Date(linha.due_date + "T00:00:00Z");
    if (!Number.isNaN(venc.getTime()) && venc < hoje) return "atrasado";
  }
  return "pendente";
}

export interface ResultadoFinanceiro {
  /** Situação atual de cada cliente, chaveada pelo id do tenant. */
  pagamentos: Record<string, Pagamento>;
  /** Receita recebida por mês, para o gráfico. */
  receita: ReceitaMes[];
  erro: string | null;
}

const VAZIO: Omit<ResultadoFinanceiro, "erro"> = { pagamentos: {}, receita: [] };

export async function listarFinanceiro(): Promise<ResultadoFinanceiro> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ...VAZIO, erro: "Supabase não configurado." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("platform_payments")
    .select(SELECT)
    // Mais recente primeiro: é a ordem em que o histórico é montado abaixo.
    .order("reference_month", { ascending: false });

  if (error) {
    console.error("[listarFinanceiro] falha ao ler platform_payments:", error.message);
    return { ...VAZIO, erro: `Não foi possível carregar o financeiro: ${error.message}` };
  }

  const linhas = (data as LinhaPagamento[]) ?? [];
  const hoje = new Date();

  // ─── Situação por cliente ──────────────────────────────────────────
  // Como as linhas já vêm da mais recente para a mais antiga, a PRIMEIRA de
  // cada tenant é a que define o status atual; as demais viram histórico.
  const pagamentos: Record<string, Pagamento> = {};

  for (const linha of linhas) {
    const valor = formatarValor(paraNumero(linha.amount));
    const parcela = {
      pago: formatarData(linha.paid_at),
      mes: formatarMes(linha.reference_month),
      valor,
    };
    const atual = pagamentos[linha.tenant_id];

    if (!atual) {
      pagamentos[linha.tenant_id] = {
        status: paraStatus(linha, hoje),
        ultimo: linha.paid_at ? formatarData(linha.paid_at) : "—",
        vencimento: formatarData(linha.due_date),
        hist: linha.paid_at ? [parcela] : [],
      };
      continue;
    }

    // Histórico é só do que foi efetivamente pago — uma cobrança em aberto não
    // é um pagamento e não pode entrar na lista de recibos.
    if (linha.paid_at) {
      atual.hist.push(parcela);
      // O "último pagamento" pode estar numa linha anterior, se o mês corrente
      // ainda estiver em aberto.
      if (atual.ultimo === "—") atual.ultimo = formatarData(linha.paid_at);
    }
  }

  // ─── Receita por mês ───────────────────────────────────────────────
  // Só o que foi pago conta como receita; pendente é promessa, não caixa.
  const porMes = new Map<string, number>();
  for (const linha of linhas) {
    if (linha.status !== "paid") continue;
    // `reference_month` é um `date` (aaaa-mm-dd); a chave é o aaaa-mm.
    const chave = linha.reference_month.slice(0, 7);
    porMes.set(chave, (porMes.get(chave) ?? 0) + paraNumero(linha.amount));
  }

  // Os últimos seis meses SEMPRE aparecem, mesmo zerados: um mês sem receita é
  // informação, e some do gráfico se ele for montado só com o que existe.
  const receita: ReceitaMes[] = [];
  for (let i = MESES_NO_GRAFICO - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - i, 1));
    const chave = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    receita.push({
      mes: { pt: MES_PT[d.getUTCMonth()], en: MES_EN[d.getUTCMonth()] },
      valor: porMes.get(chave) ?? 0,
    });
  }

  return { pagamentos, receita, erro: null };
}
