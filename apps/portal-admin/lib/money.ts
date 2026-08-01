import type { Cliente, Pagamento, StatusPagamento } from "@/types/types";

/**
 * Amounts are stored the way they are displayed ("R$ 89,00"), so every
 * calculation goes through `num` first. Everything is BRL cents.
 */

export function num(v: string): number {
  return (parseInt(String(v).replace(/\D/g, ""), 10) || 0) / 100;
}

export function fmtDin(v: number): string {
  return "R$ " + Math.round(v).toLocaleString("pt-BR");
}

/** Customers on a paid plan — the ones that contribute revenue. */
export function cobraveis(cs: Cliente[]): Cliente[] {
  return cs.filter((x) => x.plano !== "Gratuito");
}

export function calcMrr(cs: Cliente[]): number {
  return cobraveis(cs).reduce((a, x) => a + num(x.valor), 0);
}

export function fmtMrr(mrr: number): string {
  return (
    "R$ " + mrr.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  );
}

const SEM_PAGAMENTO: Pagamento = {
  status: "pendente",
  ultimo: "—",
  vencimento: "—",
  hist: [],
};

/** Payment record for a customer, defaulting to "never billed". */
export function infoPag(pagamentos: Record<number, Pagamento>, id: number): Pagamento {
  return pagamentos[id] ?? SEM_PAGAMENTO;
}

export function somaPorStatus(
  cs: Cliente[],
  pagamentos: Record<number, Pagamento>,
  status: StatusPagamento,
): number {
  return cobraveis(cs)
    .filter((x) => infoPag(pagamentos, x.id).status === status)
    .reduce((a, x) => a + num(x.valor), 0);
}

export function contaPorStatus(
  cs: Cliente[],
  pagamentos: Record<number, Pagamento>,
  status: StatusPagamento,
): number {
  return cobraveis(cs).filter((x) => infoPag(pagamentos, x.id).status === status).length;
}
