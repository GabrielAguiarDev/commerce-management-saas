import { expectedInCash, movementsBalance } from "@/lib/dados/caixa";
import { fixedShare } from "@/lib/dados/custos";
import { lowStock } from "@/lib/dados/produtos";
import { METHODS } from "@/lib/dados/vendas";
import { qtdV, totalV } from "@/lib/formato";
import type { PortalData, ReportPeriod } from "@/types/estado";
import type { Cost, PaymentMethod, Product, Sale } from "@/types/types";

/**
 * As contas que mais de uma tela precisa. Ficam aqui, e não dentro de cada
 * view, porque o dashboard, os relatórios e o caixa têm de concordar entre si —
 * "faturamento de hoje" não pode dar um número no topo e outro no gráfico.
 */

/** Vendas que contam dinheiro: estorno fica no histórico, fora do faturamento. */
export function isValidSale(v: Sale): boolean {
  return !v.refunded;
}

export function salesInPeriod(sales: Sale[], days: number): Sale[] {
  return sales.filter((v) => isValidSale(v) && v.d < days);
}

export function totalRevenue(sales: Sale[]): number {
  return sales.filter(isValidSale).reduce((a, v) => a + totalV(v), 0);
}

export function itemsSold(sales: Sale[]): number {
  return sales.filter(isValidSale).reduce((a, v) => a + qtdV(v), 0);
}

/** Custo de mercadoria do que saiu — é o que separa faturamento de lucro. */
export function costOfSales(sales: Sale[], products: Product[]): number {
  const byName = new Map(products.map((p) => [p.name, p.cost]));
  return sales
    .filter(isValidSale)
    .reduce((a, v) => a + v.items.reduce((b, i) => b + (byName.get(i.name) ?? 0) * i.qtd, 0), 0);
}

export function costsInPeriod(costs: Cost[], days: number): Cost[] {
  return costs.filter((c) => c.d < days);
}

/**
 * Total de custos de um período: os variáveis entram pelo valor lançado, os
 * fixos entram rateados — ver `rateioFixo`.
 */
export function costsTotal(costs: Cost[], days: number): number {
  const variable = costs
    .filter((c) => c.type === "variable" && c.d < days)
    .reduce((a, c) => a + c.amount, 0);
  return variable + fixedShare(costs, days);
}

/* -------------------------------------------------------------------------- */
/* Caixa                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Quanto cada forma de pagamento rendeu no turno aberto.
 *
 * É derivado das vendas de hoje, não guardado no caixa: assim estornar uma
 * venda corrige o esperado do fechamento sozinho, que era exatamente o bug
 * relatado no chamado 1046.
 */
export function salesInShift(d: PortalData): Partial<Record<PaymentMethod, number>> {
  const out: Partial<Record<PaymentMethod, number>> = {};
  for (const f of METHODS) out[f] = 0;

  // A janela é a do turno, não o dia: quem abre o caixa às 18h não deve ver as
  // vendas da manhã caindo na gaveta que acabou de contar.
  const since = d.openRegister ? new Date(d.openRegister.openedAtStamp).getTime() : null;

  for (const v of d.sales) {
    if (!isValidSale(v)) continue;
    if (since == null ? v.d !== 0 : new Date(v.at).getTime() < since) continue;
    out[v.payment] = (out[v.payment] ?? 0) + totalV(v);
  }
  return out;
}

/**
 * O que deveria haver em cada forma agora.
 *
 * Só o dinheiro acumula troco e movimentações da gaveta — Pix e cartão caem na
 * conta, então o esperado deles é a soma das vendas e nada mais.
 */
export function expectedInShift(d: PortalData): Record<PaymentMethod, number> {
  const sales = salesInShift(d);
  const base = {
    cash: sales.cash ?? 0,
    pix: sales.pix ?? 0,
    debit: sales.debit ?? 0,
    credit: sales.credit ?? 0,
  };
  const cx = d.openRegister;
  if (!cx) return base;
  return { ...base, cash: expectedInCash(cx.opening, base.cash, cx.movements) };
}

/** Dinheiro que está fisicamente na gaveta: troco + vendas em espécie ± movimentações. */
export function cashInDrawer(d: PortalData): number {
  const cx = d.openRegister;
  if (!cx) return 0;
  return cx.opening + (salesInShift(d).cash ?? 0) + movementsBalance(cx.movements);
}

/* -------------------------------------------------------------------------- */
/* Estoque                                                                     */
/* -------------------------------------------------------------------------- */

export function productsOutOfStock(products: Product[]): Product[] {
  return products.filter((p) => p.active && lowStock(p));
}

/** Quanto dinheiro está parado na prateleira, a preço de custo. */
export function stockValue(products: Product[]): number {
  return products.reduce((a, p) => a + (p.stock ?? 0) * p.cost, 0);
}

/* -------------------------------------------------------------------------- */
/* Períodos                                                                    */
/* -------------------------------------------------------------------------- */

export const PERIOD_DAYS: Record<ReportPeriod, number> = {
  today: 1,
  "7": 7,
  "30": 30,
  "90": 90,
};

export const PERIOD_NAME: Record<ReportPeriod, string> = {
  today: "Hoje",
  "7": "7 dias",
  "30": "30 dias",
  "90": "90 dias",
};

/** "os 30 dias anteriores" — o rótulo do comparativo dos Relatórios. */
export function previousPeriodName(p: ReportPeriod): string {
  return p === "today" ? "ontem" : `os ${PERIOD_DAYS[p]} dias anteriores`;
}

/** Variação percentual, protegida contra divisão por zero. */
export function change(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function changeText(v: number | null): string {
  if (v == null) return "sem base de comparação";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(0)}%`;
}
