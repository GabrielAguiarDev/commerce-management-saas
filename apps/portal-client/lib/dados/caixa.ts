import type { FormaPagamento, MovCaixa, TipoMovCaixa } from "@/types/types";
import { FORMAS } from "@/lib/dados/vendas";

/** Reforço entra na gaveta, sangria sai dela. */
export function saldoMovs(movs: MovCaixa[] | undefined): number {
  return (movs || []).reduce((a, m) => a + (m.tipo === "reforco" ? m.valor : -m.valor), 0);
}

export function somaFormas(o: Partial<Record<FormaPagamento, number>> | undefined): number {
  return FORMAS.reduce((a, f) => a + (o?.[f] ?? 0), 0);
}

/**
 * O que deveria haver na gaveta agora.
 *
 * Só dinheiro entra na conta: Pix e cartão caem na conta bancária, não na
 * gaveta, e por isso não são contados no fechamento — são conferidos no
 * extrato. É a mesma regra da função `expected_cash_for_register` do banco.
 */
export function esperadoEmDinheiro(inicial: number, vendasEmDinheiro: number, movs: MovCaixa[]) {
  return inicial + vendasEmDinheiro + saldoMovs(movs);
}

/** `cash_movements.type` e `cash_registers.status`. */
export const MOV_CAIXA_DB: Record<TipoMovCaixa, string> = {
  sangria: "withdrawal",
  reforco: "deposit",
};

export function movCaixaDoBanco(v: string | null): TipoMovCaixa {
  return v === "deposit" ? "reforco" : "sangria";
}

export const CAIXA_ABERTO = "open";
export const CAIXA_FECHADO = "closed";

export const MOV_CAIXA_ESTILO: Record<TipoMovCaixa, { rotulo: string; cor: string; bg: string }> = {
  sangria: { rotulo: "Sangria", cor: "var(--warn)", bg: "var(--warn-soft)" },
  reforco: { rotulo: "Reforço", cor: "var(--pos)", bg: "var(--pos-soft)" },
};

export const MOTIVOS_SANGRIA = ["Retirada para o cofre", "Pagamento de fornecedor", "Depósito"];
export const MOTIVOS_REFORCO = ["Troco extra do cofre", "Aporte do dono"];

/** Valores de troco que a pessoa costuma deixar na gaveta ao abrir. */
export const TROCOS_RAPIDOS = [100, 200, 300, 500];
