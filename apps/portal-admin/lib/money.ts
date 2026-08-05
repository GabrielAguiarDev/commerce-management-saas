import type { Customer, Payment, PaymentStatus } from "@/types/types";

/**
 * Amounts are stored the way they are displayed ("R$ 89,00"), so every
 * calculation goes through `num` first. Everything is BRL cents.
 */

export function num(v: string): number {
  return (parseInt(String(v).replace(/\D/g, ""), 10) || 0) / 100;
}

export function formatCash(v: number): string {
  return "R$ " + Math.round(v).toLocaleString("pt-BR");
}

/**
 * Um cliente é cobrável quando tem mensalidade, e ponto.
 *
 * Antes isto era `plano !== "free"` — uma regra que só funcionava enquanto os
 * planos eram três chaves fixas em código. Com a oferta vindo de `plans`, um
 * plano novo com preço zero seria contado como receita, e um "free" pago (um
 * cliente legado com valor negociado) sumiria da conta. O valor é o fato.
 */
export function isBillable(c: Customer): boolean {
  return num(c.amount) > 0;
}

/** Clientes que contribuem com receita. */
export function billable(cs: Customer[]): Customer[] {
  return cs.filter(isBillable);
}

export function computeMrr(cs: Customer[]): number {
  return billable(cs).reduce((a, x) => a + num(x.amount), 0);
}

export function formatMrr(mrr: number): string {
  return (
    "R$ " + mrr.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  );
}

const NO_PAYMENT: Payment = {
  status: "pendente",
  latest: "—",
  vencimento: "—",
  hist: [],
};

/** Payment record for a customer, defaulting to "never billed". */
export function paymentInfo(payments: Record<string, Payment>, id: string): Payment {
  return payments[id] ?? NO_PAYMENT;
}

export function sumByStatus(
  cs: Customer[],
  payments: Record<string, Payment>,
  status: PaymentStatus,
): number {
  return billable(cs)
    .filter((x) => paymentInfo(payments, x.id).status === status)
    .reduce((a, x) => a + num(x.amount), 0);
}

export function countByStatus(
  cs: Customer[],
  payments: Record<string, Payment>,
  status: PaymentStatus,
): number {
  return billable(cs).filter((x) => paymentInfo(payments, x.id).status === status).length;
}
