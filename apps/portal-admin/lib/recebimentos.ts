/**
 * O retrato da conta do Mercado Pago, como a Edge Function `mp-account` o
 * devolve. Sem `server-only`: os tipos e a formatação são usados pela tela.
 */

export type MpMethod = "pix" | "card" | "other";

export interface MpPaymentRow {
  id: string;
  createdAt: string | null;
  approvedAt: string | null;
  /** O status cru do Mercado Pago (`approved`, `pending`, `rejected`…). */
  status: string;
  statusDetail: string | null;
  method: MpMethod;
  methodId: string | null;
  amount: number;
  fee: number;
  net: number;
  releaseDate: string | null;
  released: boolean;
  description: string | null;
  payerEmail: string | null;
  /** Preenchidos só quando o pagamento nasceu no portal do cliente. */
  tenantId: string | null;
  tenantName: string | null;
  referenceMonth: string | null;
  liveMode: boolean;
}

export interface MpSummary {
  gross: number;
  fees: number;
  net: number;
  released: number;
  toRelease: number;
  refunded: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  refundedCount: number;
  pix: number;
  card: number;
}

export interface MpAccountData {
  sandbox: boolean;
  days: number;
  account: { id: string; nickname: string; email: string; name: string; country: string };
  /** `null` quando o Mercado Pago não deixa esta conta ler o saldo pela API. */
  balance: { available: number; unavailable: number; total: number } | null;
  summary: MpSummary;
  payments: MpPaymentRow[];
  truncated: boolean;
  total: number;
}

export type MpAccountResult =
  | { state: "ok"; data: MpAccountData }
  /** `MP_ACCESS_TOKEN` ausente ou função ainda não publicada. */
  | { state: "unconfigured" }
  | { state: "error"; message: string };

export const MP_PERIODS = [7, 30, 90] as const;
export const MP_DEFAULT_PERIOD = 30;

/** O período pedido na URL, ou o padrão se vier qualquer outra coisa. */
export function parsePeriod(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (MP_PERIODS as readonly number[]).includes(n) ? n : MP_DEFAULT_PERIOD;
}

/**
 * "R$ 1.284,50" — com centavos. O `formatCash` do console arredonda para o
 * real inteiro, o que serve para MRR e não serve para tarifa de R$ 0,89.
 */
export function formatMoney(v: number): string {
  return (
    "R$ " +
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

/** `timestamptz` → "03/10 16:07", no fuso do Brasil. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(d)
    .replace(",", "");
}

/** `timestamptz` → "03/10/2026", no fuso do Brasil. */
export function formatDay(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(d);
}

export type MpStatusGroup = "approved" | "pending" | "rejected" | "refunded";

/** Os muitos status do Mercado Pago, nos quatro que o filtro da tela conhece. */
export function statusGroup(status: string): MpStatusGroup {
  if (status === "approved") return "approved";
  if (status === "refunded" || status === "charged_back") return "refunded";
  if (status === "rejected" || status === "cancelled") return "rejected";
  return "pending";
}
