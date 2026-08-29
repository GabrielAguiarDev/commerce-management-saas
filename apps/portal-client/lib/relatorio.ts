import { COST_TYPE_STYLE } from "@/lib/dados/custos";
import { METHODS, PAYMENT_LABEL } from "@/lib/dados/vendas";
import { lowStock } from "@/lib/dados/produtos";
import { ddmm, fullDate, itemSummary, qtdV, totalV } from "@/lib/formato";
import {
  change,
  costOfSales,
  costsTotal,
  isValidSale,
  PERIOD_DAYS,
  PERIOD_NAME,
  previousPeriodName,
  stockValue,
  totalRevenue,
} from "@/lib/selectors";
import type { PortalData, ReportPeriod } from "@/types/estado";
import type { ModuleKey } from "@/types/types";

/**
 * O relatório do período como DADO, separado da tela que o desenha.
 *
 * A tela de Relatórios monta gráficos; o PDF e a planilha montam tabelas. Os
 * três precisam concordar no número, então a conta acontece uma vez só aqui e
 * cada saída apenas formata. Sem isto, "Sobrou" no gráfico e "Sobrou" no PDF
 * seriam duas implementações da mesma regra — e um dia divergiriam.
 *
 * As células saem tipadas (`{ money }`, `{ pct }`, `{ qtd }`) em vez de texto
 * pronto porque as duas saídas querem coisas diferentes do mesmo número: o PDF
 * quer "R$ 1.284,50" para ler, a planilha quer "1284,50" para somar.
 */

export type Cell = string | { money: number } | { pct: number } | { qtd: number };

export interface ReportSection {
  title: string;
  note?: string;
  columns: string[];
  rows: Cell[][];
  /**
   * Listagens linha a linha (cada venda, cada custo) só vão para a planilha:
   * num PDF elas viram dezenas de páginas que ninguém lê, e é justamente na
   * planilha que servem para filtrar e somar.
   */
  csvOnly?: boolean;
  /** Mostrado no lugar da tabela quando o período não tem o que listar. */
  empty?: string;
  /**
   * Índices de coluna que a planilha soma no rodapé da tabela.
   *
   * Quem decide é ESTE arquivo, e não quem desenha, porque somar é uma
   * pergunta de significado e não de formato: somar "Estoque atual" de
   * produtos em unidades diferentes dá um número que não quer dizer nada, e
   * somar uma coluna de porcentagem dá 99,9% na primeira divisão inexata —
   * que parece defeito. Ausente significa "esta tabela não tem total".
   */
  sum?: number[];
}

export interface Report {
  business: string;
  period: string;
  window: string;
  generatedAt: string;
  comparison: string | null;
  sections: ReportSection[];
  /** Nenhuma venda e nenhum custo no período — não há relatório a emitir. */
  isEmpty: boolean;
}

/** Rótulo de uma faixa do gráfico, em datas — "Hoje" não sobrevive num arquivo. */
function rangeLabel(from: number, step: number): string {
  return step === 1 ? ddmm(from) : `${ddmm(from + step - 1)} a ${ddmm(from)}`;
}

/**
 * As mesmas faixas do gráfico da tela: dia a dia até 14 dias, semana a semana
 * acima disso, no máximo 13 barras. Ordenadas da mais antiga para a mais nova,
 * que é como se lê uma tabela.
 */
function periodSeries(days: number): { from: number; to: number; label: string }[] {
  const step = days <= 14 ? 1 : 7;
  const groups = Math.min(Math.ceil(days / step), 13);
  return Array.from({ length: groups }, (_, i) => {
    const from = (groups - 1 - i) * step;
    return { from, to: from + step, label: rangeLabel(from, step) };
  });
}

export function buildReport(
  d: PortalData,
  f: { period: ReportPeriod; compare: boolean },
  has: (m: ModuleKey) => boolean,
): Report {
  const days = PERIOD_DAYS[f.period];
  const inPeriod = d.sales.filter((v) => v.d < days);
  const previous = d.sales.filter((v) => v.d >= days && v.d < days * 2);

  const revenue = totalRevenue(inPeriod);
  const previousRevenue = totalRevenue(previous);

  const hasCosts = has("costs");
  const costsInPeriod = d.costs.filter((c) => c.d < days);
  const costs = hasCosts ? costsTotal(d.costs, days) : costOfSales(inPeriod, d.products);
  const previousCosts = hasCosts
    ? costsTotal(
        d.costs.filter((c) => c.d >= days).map((c) => ({ ...c, d: c.d - days })),
        days,
      )
    : costOfSales(previous, d.products);

  const profit = revenue - costs;
  const previousProfit = previousRevenue - previousCosts;

  const valid = inPeriod.filter(isValidSale);
  const previousValid = previous.filter(isValidSale);
  const ticket = valid.length ? revenue / valid.length : 0;
  const previousTicket = previousValid.length ? previousRevenue / previousValid.length : 0;

  const sections: ReportSection[] = [];

  /* Resumo ---------------------------------------------------------------- */

  const summaryColumns = ["Indicador", "Valor (R$)", "Observação"];
  // O "(%)" no cabeçalho é para a planilha, onde a célula guarda o número cru
  // para poder ser somada — no PDF o valor já sai com o sinal de porcentagem.
  if (f.compare) summaryColumns.push(`Variação sobre ${previousPeriodName(f.period)} (%)`);

  const summaryRow = (label: string, value: number, note: string, previousValue: number): Cell[] => {
    const row: Cell[] = [label, { money: value }, note];
    if (f.compare) {
      const v = change(value, previousValue);
      row.push(v == null ? "sem base de comparação" : { pct: v });
    }
    return row;
  };

  sections.push({
    title: "Resumo financeiro",
    note: "O que entrou, o que saiu e o que sobrou no período.",
    columns: summaryColumns,
    rows: [
      summaryRow(
        "Vendas",
        revenue,
        `${valid.length} ${valid.length === 1 ? "venda" : "vendas"} no período`,
        previousRevenue,
      ),
      summaryRow(
        hasCosts ? "Custos" : "Custo da mercadoria",
        costs,
        hasCosts ? "Variáveis + fixos rateados" : "Do que foi vendido",
        previousCosts,
      ),
      summaryRow(
        "Sobrou",
        profit,
        revenue > 0 ? `Margem de ${((profit / revenue) * 100).toFixed(0)}%` : "Sem vendas",
        previousProfit,
      ),
      summaryRow("Ticket médio", ticket, "Por venda", previousTicket),
    ],
  });

  /* Vendas ---------------------------------------------------------------- */

  const series = periodSeries(days);

  if (valid.length > 0) {
    sections.push({
      title: "Vendas ao longo do período",
      columns: ["Período", "Vendas (R$)", "Nº de vendas", "Itens"],
      sum: [1, 2, 3],
      rows: series.map((g) => {
        const inGroup = inPeriod.filter((v) => v.d >= g.from && v.d < g.to && isValidSale(v));
        return [
          g.label,
          { money: totalRevenue(inGroup) },
          { qtd: inGroup.length },
          { qtd: inGroup.reduce((x, v) => x + qtdV(v), 0) },
        ];
      }),
    });

    const byProduct = new Map<string, { amount: number; qtd: number }>();
    for (const v of valid) {
      for (const i of v.items) {
        const cur = byProduct.get(i.name) ?? { amount: 0, qtd: 0 };
        byProduct.set(i.name, { amount: cur.amount + i.qtd * i.price, qtd: cur.qtd + i.qtd });
      }
    }

    sections.push({
      title: "Produtos mais vendidos",
      note: "Do que mais faturou para o que menos faturou.",
      columns: ["Produto", "Quantidade", "Valor (R$)", "% das vendas"],
      sum: [1, 2],
      rows: [...byProduct.entries()]
        .sort((x, y) => y[1].amount - x[1].amount)
        .map(([name, p]) => [
          name,
          { qtd: p.qtd },
          { money: p.amount },
          { pct: revenue > 0 ? (p.amount / revenue) * 100 : 0 },
        ]),
    });

    sections.push({
      title: "Formas de pagamento",
      columns: ["Forma", "Valor (R$)", "% das vendas", "Nº de vendas"],
      sum: [1, 3],
      rows: METHODS.map((forma) => {
        const doMetodo = valid.filter((v) => v.payment === forma);
        const amount = doMetodo.reduce((x, v) => x + totalV(v), 0);
        return [
          PAYMENT_LABEL[forma],
          { money: amount },
          { pct: revenue > 0 ? (amount / revenue) * 100 : 0 },
          { qtd: doMetodo.length },
        ] as Cell[];
      }).filter((r) => (r[3] as { qtd: number }).qtd > 0),
    });
  }

  /* Custos ---------------------------------------------------------------- */

  if (hasCosts && costsInPeriod.length > 0) {
    const totalLancado = costsInPeriod.reduce((x, c) => x + c.amount, 0);
    const byCategory = new Map<string, number>();
    for (const c of costsInPeriod) {
      byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + c.amount);
    }

    sections.push({
      title: "Custos por categoria",
      note: "Para onde foi o dinheiro no período.",
      columns: ["Categoria", "Valor (R$)", "% dos custos"],
      sum: [1],
      rows: [...byCategory.entries()]
        .sort((x, y) => y[1] - x[1])
        .map(([name, amount]) => [
          name || "Sem categoria",
          { money: amount },
          { pct: totalLancado > 0 ? (amount / totalLancado) * 100 : 0 },
        ]),
    });

    sections.push({
      title: "Custos fixos e variáveis",
      columns: ["Tipo", "Valor (R$)", "O que é"],
      sum: [1],
      rows: [
        [
          "Custos fixos",
          { money: costsInPeriod.filter((c) => c.type === "fixed").reduce((x, c) => x + c.amount, 0) },
          "Aluguel, luz, salário — saem todo mês, venda ou não.",
        ],
        [
          "Custos variáveis",
          {
            money: costsInPeriod
              .filter((c) => c.type === "variable")
              .reduce((x, c) => x + c.amount, 0),
          },
          "Mercadoria e insumos — acompanham o movimento.",
        ],
      ],
    });
  }

  /* Estoque --------------------------------------------------------------- */

  if (has("stock")) {
    const outflows = new Map<string, number>();
    for (const v of valid) {
      for (const i of v.items) outflows.set(i.name, (outflows.get(i.name) ?? 0) + i.qtd);
    }
    const tracked = d.products.filter((p) => p.stock != null);

    sections.push({
      title: "Giro de estoque",
      note: `Valor imobilizado na prateleira: ${new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(stockValue(d.products))}.`,
      columns: ["Produto", "Saiu no período", "Estoque atual", "Unidade"],
      sum: [1],
      empty: "Nenhum produto com estoque controlado.",
      rows: tracked
        .map((p) => ({ p, saiu: outflows.get(p.name) ?? 0 }))
        .sort((x, y) => y.saiu - x.saiu || x.p.name.localeCompare(y.p.name, "pt-BR"))
        .map(({ p, saiu }) => [p.name, { qtd: saiu }, { qtd: p.stock ?? 0 }, p.unit] as Cell[]),
    });

    const repor = d.products.filter((p) => p.active && lowStock(p));
    sections.push({
      title: "Precisa repor",
      columns: ["Produto", "Estoque atual", "Mínimo", "Situação"],
      empty: "Estoque em dia, nada para repor.",
      rows: repor.map((p) => [
        p.name,
        { qtd: p.stock ?? 0 },
        { qtd: p.minimum ?? 0 },
        p.stock === 0 ? "Acabou" : "Abaixo do mínimo",
      ]),
    });
  }

  /* Resultado ------------------------------------------------------------- */

  sections.push({
    title: "Resultado ao longo do período",
    note: "Só os custos variáveis entram por faixa: o fixo é mensal e ratear o aluguel dia a dia faria toda faixa nascer no vermelho.",
    columns: ["Período", "Vendas (R$)", "Custos (R$)", "Sobrou (R$)"],
    sum: [1, 2, 3],
    rows: series.map((g) => {
      const vendasG = totalRevenue(d.sales.filter((v) => v.d >= g.from && v.d < g.to));
      const custosG = hasCosts
        ? d.costs
            .filter((c) => c.d >= g.from && c.d < g.to && c.type === "variable")
            .reduce((x, c) => x + c.amount, 0)
        : costOfSales(
            d.sales.filter((v) => v.d >= g.from && v.d < g.to),
            d.products,
          );
      return [g.label, { money: vendasG }, { money: custosG }, { money: vendasG - custosG }];
    }),
  });

  /* Listagens — só na planilha -------------------------------------------- */

  sections.push({
    title: "Vendas detalhadas",
    csvOnly: true,
    columns: ["Data", "Hora", "Forma de pagamento", "Itens", "Quantidade", "Total (R$)", "Situação"],
    sum: [4, 5],
    empty: "Nenhuma venda no período.",
    rows: [...inPeriod]
      .sort((x, y) => y.d - x.d || y.time.localeCompare(x.time))
      .map((v) => [
        fullDate(v.d),
        v.time,
        PAYMENT_LABEL[v.payment],
        itemSummary(v.items),
        { qtd: qtdV(v) },
        { money: totalV(v) },
        v.refunded ? "Estornada" : "Concluída",
      ]),
  });

  if (hasCosts) {
    sections.push({
      title: "Custos lançados",
      csvOnly: true,
      columns: ["Data", "Tipo", "Categoria", "Descrição", "Origem", "Valor (R$)"],
      sum: [5],
      empty: "Nenhum custo lançado no período.",
      rows: [...costsInPeriod]
        .sort((x, y) => x.d - y.d)
        .map((c) => [
          fullDate(c.d),
          COST_TYPE_STYLE[c.type].name,
          c.category || "Sem categoria",
          c.description,
          c.fromStock ? "Entrada de estoque" : "Lançamento manual",
          { money: c.amount },
        ]),
    });
  }

  return {
    business: d.business.name,
    period: PERIOD_NAME[f.period],
    // Datas, nunca "até hoje": o arquivo é aberto semanas depois, e "hoje"
    // ali dentro deixa de dizer qual dia foi.
    window: days === 1 ? ddmm(0) : `${ddmm(days - 1)} a ${ddmm(0)}`,
    generatedAt: new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
    comparison: f.compare ? previousPeriodName(f.period) : null,
    sections,
    isEmpty: valid.length === 0 && costsInPeriod.length === 0,
  };
}
