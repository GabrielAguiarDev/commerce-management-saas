import { esperadoCx, saldoMovs } from "@/lib/dados/caixa";
import { rateioFixo } from "@/lib/dados/custos";
import { estoqueBaixo } from "@/lib/dados/produtos";
import { FORMAS } from "@/lib/dados/vendas";
import { qtdV, totalV } from "@/lib/formato";
import type { PeriodoRel, PortalState } from "@/types/estado";
import type { Custo, FormaPagamento, Produto, Venda } from "@/types/types";

/**
 * As contas que mais de uma tela precisa. Ficam aqui, e não dentro de cada
 * view, porque o dashboard, os relatórios e o caixa têm de concordar entre si —
 * "faturamento de hoje" não pode dar um número no topo e outro no gráfico.
 */

/** Vendas que contam dinheiro: estorno fica no histórico, fora do faturamento. */
export function valida(v: Venda): boolean {
  return !v.estornada;
}

export function vendasNoPeriodo(vendas: Venda[], dias: number): Venda[] {
  return vendas.filter((v) => valida(v) && v.d < dias);
}

export function faturamento(vendas: Venda[]): number {
  return vendas.filter(valida).reduce((a, v) => a + totalV(v), 0);
}

export function itensVendidos(vendas: Venda[]): number {
  return vendas.filter(valida).reduce((a, v) => a + qtdV(v), 0);
}

/** Custo de mercadoria do que saiu — é o que separa faturamento de lucro. */
export function custoDasVendas(vendas: Venda[], produtos: Produto[]): number {
  const porNome = new Map(produtos.map((p) => [p.nome, p.custo]));
  return vendas
    .filter(valida)
    .reduce((a, v) => a + v.itens.reduce((b, i) => b + (porNome.get(i.nome) ?? 0) * i.qtd, 0), 0);
}

export function custosNoPeriodo(custos: Custo[], dias: number): Custo[] {
  return custos.filter((c) => c.d < dias);
}

/**
 * Total de custos de um período: os variáveis entram pelo valor lançado, os
 * fixos entram rateados — ver `rateioFixo`.
 */
export function totalCustos(custos: Custo[], dias: number): number {
  const variaveis = custos
    .filter((c) => c.tipo === "variavel" && c.d < dias)
    .reduce((a, c) => a + c.valor, 0);
  return variaveis + rateioFixo(custos, dias);
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
export function vendasDoTurno(s: PortalState): Partial<Record<FormaPagamento, number>> {
  const out: Partial<Record<FormaPagamento, number>> = {};
  for (const f of FORMAS) out[f] = 0;
  for (const v of s.vendas) {
    if (!valida(v) || v.d !== 0) continue;
    out[v.pag] = (out[v.pag] ?? 0) + totalV(v);
  }
  return out;
}

/** O que deveria haver em cada forma agora, se o turno fechasse neste instante. */
export function esperadoDoTurno(s: PortalState): Record<FormaPagamento, number> {
  const cx = s.caixaAberto;
  if (!cx) return { Dinheiro: 0, Pix: 0, Débito: 0, Crédito: 0 };
  return esperadoCx({ inicial: cx.inicial, vendas: vendasDoTurno(s), movs: cx.movs });
}

/** Dinheiro que está fisicamente na gaveta: troco + vendas em espécie ± movimentações. */
export function dinheiroNaGaveta(s: PortalState): number {
  const cx = s.caixaAberto;
  if (!cx) return 0;
  return cx.inicial + (vendasDoTurno(s).Dinheiro ?? 0) + saldoMovs(cx.movs);
}

/* -------------------------------------------------------------------------- */
/* Estoque                                                                     */
/* -------------------------------------------------------------------------- */

export function produtosEmFalta(produtos: Produto[]): Produto[] {
  return produtos.filter((p) => p.ativo && estoqueBaixo(p));
}

/** Quanto dinheiro está parado na prateleira, a preço de custo. */
export function valorDoEstoque(produtos: Produto[]): number {
  return produtos.reduce((a, p) => a + (p.estoque ?? 0) * p.custo, 0);
}

/* -------------------------------------------------------------------------- */
/* Períodos                                                                    */
/* -------------------------------------------------------------------------- */

export const DIAS_PERIODO: Record<PeriodoRel, number> = {
  hoje: 1,
  "7": 7,
  "30": 30,
  "90": 90,
};

export const NOME_PERIODO: Record<PeriodoRel, string> = {
  hoje: "Hoje",
  "7": "7 dias",
  "30": "30 dias",
  "90": "90 dias",
};

/** "os 30 dias anteriores" — o rótulo do comparativo dos Relatórios. */
export function nomePeriodoAnterior(p: PeriodoRel): string {
  return p === "hoje" ? "ontem" : `os ${DIAS_PERIODO[p]} dias anteriores`;
}

/** Variação percentual, protegida contra divisão por zero. */
export function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual === 0 ? 0 : null;
  return ((atual - anterior) / anterior) * 100;
}

export function textoVariacao(v: number | null): string {
  if (v == null) return "sem base de comparação";
  const sinal = v > 0 ? "+" : "";
  return `${sinal}${v.toFixed(0)}%`;
}
