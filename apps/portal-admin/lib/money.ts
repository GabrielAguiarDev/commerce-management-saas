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

/**
 * Um cliente é cobrável quando tem mensalidade, e ponto.
 *
 * Antes isto era `plano !== "free"` — uma regra que só funcionava enquanto os
 * planos eram três chaves fixas em código. Com a oferta vindo de `plans`, um
 * plano novo com preço zero seria contado como receita, e um "free" pago (um
 * cliente legado com valor negociado) sumiria da conta. O valor é o fato.
 */
export function ehCobravel(c: Cliente): boolean {
  return num(c.valor) > 0;
}

/** Clientes que contribuem com receita. */
export function cobraveis(cs: Cliente[]): Cliente[] {
  return cs.filter(ehCobravel);
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
export function infoPag(pagamentos: Record<string, Pagamento>, id: string): Pagamento {
  return pagamentos[id] ?? SEM_PAGAMENTO;
}

export function somaPorStatus(
  cs: Cliente[],
  pagamentos: Record<string, Pagamento>,
  status: StatusPagamento,
): number {
  return cobraveis(cs)
    .filter((x) => infoPag(pagamentos, x.id).status === status)
    .reduce((a, x) => a + num(x.valor), 0);
}

export function contaPorStatus(
  cs: Cliente[],
  pagamentos: Record<string, Pagamento>,
  status: StatusPagamento,
): number {
  return cobraveis(cs).filter((x) => infoPag(pagamentos, x.id).status === status).length;
}
