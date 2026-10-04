import type {
  AttemptStatus,
  BillingMethod,
  Charge,
  ChargeStatus,
  PaymentAttempt,
} from "@/types/types";

/**
 * A mensalidade da plataforma, no vocabulário do portal.
 *
 * Não confundir com `lib/dados/vendas.ts`: lá é o que o comércio RECEBE dos
 * clientes dele; aqui é o que o comércio PAGA à Aguiar One. As duas coisas
 * têm "Pix" e "cartão" no nome e nada mais em comum.
 */

export interface ChargeRow {
  id: string;
  reference_month: string;
  amount: number | string;
  status: string | null;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
}

export interface AttemptRow {
  id: string;
  payment_id: string;
  method: string;
  amount: number | string;
  status: string;
  provider_status_detail: string | null;
  pix_code: string | null;
  pix_qr_base64: string | null;
  ticket_url: string | null;
  expires_at: string | null;
  card_brand: string | null;
  card_last4: string | null;
}

export const CHARGE_COLUMNS =
  "id, reference_month, amount, status, due_date, paid_at, payment_method";

function method(value: string | null): BillingMethod | null {
  return value === "pix" || value === "card" ? value : null;
}

/** A data de hoje no Brasil, `aaaa-mm-dd` — a mesma régua do vencimento. */
export function todayBr(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
}

/**
 * `today` entra por parâmetro para a regra ser testável: uma cobrança em
 * aberto só está atrasada DEPOIS do dia do vencimento — no próprio dia ainda
 * está no prazo.
 */
export function toCharge(row: ChargeRow, today: string): Charge {
  const paid = row.status === "paid";
  const status: ChargeStatus = paid
    ? "paid"
    : row.due_date && row.due_date < today
      ? "overdue"
      : "pending";

  return {
    id: row.id,
    month: row.reference_month,
    amount: Number(row.amount) || 0,
    status,
    dueDate: row.due_date,
    paidAt: paid ? row.paid_at : null,
    method: paid ? method(row.payment_method) : null,
  };
}

const ATTEMPT_STATUSES: AttemptStatus[] = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "expired",
  "refunded",
];

/** `null` quando a linha não tem o formato esperado — a tela trata como erro. */
export function toAttempt(row: unknown): PaymentAttempt | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Partial<AttemptRow>;
  const m = method(r.method ?? null);
  const status = ATTEMPT_STATUSES.find((s) => s === r.status);
  if (!r.id || !r.payment_id || !m || !status) return null;

  return {
    id: r.id,
    chargeId: r.payment_id,
    method: m,
    status,
    amount: Number(r.amount) || 0,
    pixCode: r.pix_code ?? null,
    pixQr: r.pix_qr_base64 ?? null,
    ticketUrl: r.ticket_url ?? null,
    expiresAt: r.expires_at ?? null,
    detail: r.provider_status_detail ?? null,
    cardBrand: r.card_brand ?? null,
    cardLast4: r.card_last4 ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Textos                                                                      */
/* -------------------------------------------------------------------------- */

export const CHARGE_LABEL: Record<ChargeStatus, string> = {
  paid: "Paga",
  pending: "Em aberto",
  overdue: "Atrasada",
};

export const METHOD_LABEL: Record<BillingMethod, string> = {
  pix: "Pix",
  card: "Cartão",
};

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "2026-10-01" → "outubro de 2026". */
export function monthLabel(month: string): string {
  const [year, m] = month.split("-");
  const name = MONTHS[Number(m) - 1];
  return name ? `${name} de ${year}` : month;
}

/** `date` (aaaa-mm-dd) ou `timestamptz` → "03/10/2026", sempre no fuso do Brasil. */
export function dateBr(iso: string | null): string {
  if (!iso) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(date);
}

/**
 * O motivo da recusa do cartão, em língua de gente.
 *
 * As chaves são os `status_detail` do Mercado Pago. O que não está na lista
 * cai na frase genérica — melhor do que mostrar `cc_rejected_other_reason`.
 */
const REJECTION: Record<string, string> = {
  cc_rejected_bad_filled_card_number: "Confira o número do cartão.",
  cc_rejected_bad_filled_date: "Confira a data de validade.",
  cc_rejected_bad_filled_security_code: "Confira o código de segurança.",
  cc_rejected_bad_filled_other: "Confira os dados do cartão.",
  cc_rejected_insufficient_amount: "O cartão não tem limite suficiente.",
  cc_rejected_call_for_authorize: "O banco pediu que você autorize este pagamento. Ligue para ele e tente de novo.",
  cc_rejected_card_disabled: "O cartão está bloqueado. Fale com o banco para ativá-lo.",
  cc_rejected_duplicated_payment: "Já existe um pagamento igual a este. Aguarde alguns minutos antes de tentar de novo.",
  cc_rejected_high_risk: "O pagamento foi recusado por segurança. Tente outro cartão ou pague com Pix.",
  cc_rejected_max_attempts: "Você atingiu o limite de tentativas. Use outro cartão ou pague com Pix.",
  cc_rejected_blacklist: "Não foi possível processar este cartão. Use outro ou pague com Pix.",
  cc_rejected_card_type_not_allowed: "Este tipo de cartão não é aceito. Use outro ou pague com Pix.",
};

export function rejectionMessage(detail: string | null): string {
  return (
    (detail && REJECTION[detail]) ||
    "O banco não aprovou o pagamento. Tente outro cartão ou pague com Pix."
  );
}
