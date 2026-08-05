"use client";

import { usePortal } from "@/components/PortalProvider";
import { Button, ScreenHeader, css, PILL_GROUP, MONO, NUM, pill, KPI_LABEL, SANS, Empty } from "@aguiar/ui";
import { METHODS } from "@/lib/dados/vendas";
import { brl, shortBrl, ddmm, weekday, qtdV, totalV } from "@/lib/formato";
import {
  costOfSales,
  PERIOD_DAYS,
  totalRevenue,
  PERIOD_NAME,
  previousPeriodName,
  productsOutOfStock,
  changeText,
  costsTotal,
  isValidSale,
  stockValue,
  change,
} from "@/lib/selectors";
import type { ReportPeriod } from "@/types/estado";
import type { Sale } from "@/types/types";

const PERIODS: ReportPeriod[] = ["today", "7", "30", "90"];

const PAYMENT_COLOR: Record<string, string> = {
  cash: "var(--pos)",
  pix: "var(--accent)",
  debit: "var(--petrol)",
  credit: "var(--warn)",
};

/**
 * Relatórios.
 *
 * Cada bloco só aparece se o cliente tiver o módulo que o alimenta: sem Custos
 * não há "resultado", sem Estoque não há giro. O comparativo com o período
 * anterior é opcional porque nem todo negócio tem histórico suficiente para
 * ele significar alguma coisa.
 */
export function RelatoriosView() {
  const { s, a, has, isDesktop, isMobile, d } = usePortal();
  const f = s.fRel;
  const days = PERIOD_DAYS[f.period];

  const inPeriod = d.sales.filter((v) => v.d < days);
  const previous = d.sales.filter((v) => v.d >= days && v.d < days * 2);

  const revenue = totalRevenue(inPeriod);
  const previousRevenue = totalRevenue(previous);

  const hasCosts = has("costs");
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
  const ticket = valid.length ? revenue / valid.length : 0;
  const previousTicket = previous.filter(isValidSale).length
    ? previousRevenue / previous.filter(isValidSale).length
    : 0;

  const semDados = valid.length === 0 && (!hasCosts || d.costs.filter((c) => c.d < days).length === 0);

  const set = (p: Partial<typeof f>) => a.set({ fRel: { ...f, ...p } });

  const summary = [
    {
      label: "Vendas",
      value: brl(revenue),
      note: `${valid.length} vendas no período`,
      color: "var(--text)",
      size: "24px",
      change: change(revenue, previousRevenue),
    },
    {
      label: hasCosts ? "Custos" : "Custo da mercadoria",
      value: brl(costs),
      note: hasCosts ? "Variáveis + fixos rateados" : "Do que foi vendido",
      color: "var(--warn)",
      size: "24px",
      change: change(costs, previousCosts),
    },
    {
      label: "Sobrou",
      value: brl(profit),
      note: revenue > 0 ? `Margem de ${((profit / revenue) * 100).toFixed(0)}%` : "Sem vendas",
      color: profit >= 0 ? "var(--pos)" : "var(--danger)",
      size: "26px",
      change: change(profit, previousProfit),
    },
    {
      label: "Ticket médio",
      value: brl(ticket),
      note: "Por venda",
      color: "var(--text)",
      size: "24px",
      change: change(ticket, previousTicket),
    },
  ];

  const summaryCols = isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))";
  const threeCols = isDesktop ? "repeat(3,minmax(0,1fr))" : "1fr";
  const twoCols = isDesktop ? "repeat(2,minmax(0,1fr))" : "1fr";

  return (
    <div>
      <ScreenHeader
        title="Relatórios"
        subtitle="Como foi o seu negócio no período — tudo que vendas, custos e estoque já registraram."
        action={
          <div style={css("display:flex;gap:8px")}>
            <Button
              onClick={() => a.notify("O PDF do período foi preparado para download")}
              className="hv-acc-borda"
              style={css(
                `padding:11px 16px;border-radius:10px;border:1px solid var(--border2);background:var(--surface);color:var(--text2);font:600 13px ${SANS}`,
              )}
            >
              Salvar em PDF
            </Button>
            <Button
              onClick={() => a.notify("A planilha do período foi preparada para download")}
              className="hv-acc-borda"
              style={css(
                `padding:11px 16px;border-radius:10px;border:1px solid var(--border2);background:var(--surface);color:var(--text2);font:600 13px ${SANS}`,
              )}
            >
              Baixar planilha
            </Button>
          </div>
        }
      />

      <div
        style={css(
          "display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px;margin-bottom:16px;" +
            "border:1px solid var(--border);border-radius:13px;background:var(--surface)",
        )}
      >
        <span
          style={css(
            `font:600 10.5px ${MONO};letter-spacing:.1em;text-transform:uppercase;color:var(--muted)`,
          )}
        >
          Período
        </span>
        <div style={css(PILL_GROUP)}>
          {PERIODS.map((p) => (
            <Button key={p} onClick={() => set({ period: p })} style={css(pill(f.period === p))}>
              {PERIOD_NAME[p]}
            </Button>
          ))}
        </div>

        <Button
          onClick={() => set({ compare: !f.compare })}
          style={css(
            `display:flex;align-items:center;gap:9px;padding:9px 13px;border:1px solid ${f.compare ? "var(--accent)" : "var(--border2)"};` +
              `border-radius:10px;background:${f.compare ? "var(--accent-soft)" : "var(--surface2)"};` +
              `color:${f.compare ? "var(--accent)" : "var(--text2)"};font:600 12.5px ${SANS}`,
          )}
        >
          <span
            style={css(
              `width:30px;height:18px;border-radius:999px;background:${f.compare ? "var(--accent)" : "var(--border2)"};` +
                `display:flex;align-items:center;padding:2px;justify-content:${f.compare ? "flex-end" : "flex-start"}`,
            )}
          >
            <span style={css("width:14px;height:14px;border-radius:50%;background:#fff")} />
          </span>
          <span>Comparar com {previousPeriodName(f.period)}</span>
        </Button>

        <span style={css(`font:500 12px ${SANS};color:var(--muted)`)}>
          {days === 1 ? "Hoje" : `${ddmm(days - 1)} até hoje`}
        </span>
      </div>

      {semDados ? (
        <Empty
          title="Sem movimento neste período"
          text="Nenhuma venda ou custo foi registrado aqui. Escolha um período maior para ver os números do seu negócio."
          action="Ver este mês"
          onAction={() => set({ period: "30" })}
          standout
        />
      ) : (
        <div style={css("display:flex;flex-direction:column;gap:14px")}>
          {/* Resumo financeiro */}
          <Block title="Resumo financeiro" note="O que entrou, o que saiu e o que sobrou no período.">
            <div style={css(`display:grid;grid-template-columns:${summaryCols};gap:1px;background:var(--border)`)}>
              {summary.map((k) => {
                const v = k.change;
                const good = k.label === "Custos" ? (v ?? 0) <= 0 : (v ?? 0) >= 0;
                return (
                  <div key={k.label} style={css("padding:15px 18px;background:var(--surface)")}>
                    <div style={css(KPI_LABEL)}>{k.label}</div>
                    <div
                      style={css(`margin-top:7px;font:700 ${k.size}/1.05 ${SANS};${NUM};color:${k.color}`)}
                    >
                      {k.value}
                    </div>
                    <div style={css(`margin-top:6px;font:500 11.5px/1.4 ${SANS};color:var(--muted)`)}>
                      {k.note}
                    </div>
                    {f.compare && (
                      <div
                        style={css(
                          "display:inline-flex;align-items:center;gap:5px;margin-top:8px;padding:3px 9px;border-radius:999px;" +
                            `background:${good ? "var(--pos-soft)" : "var(--warn-soft)"};` +
                            `color:${good ? "var(--pos)" : "var(--warn)"};font:600 11.5px ${SANS};${NUM}`,
                        )}
                      >
                        {changeText(v)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Block>

          {valid.length > 0 && (
            <SalesBlock sales={inPeriod} days={days} threeCols={threeCols} ticket={ticket} />
          )}

          {hasCosts && d.costs.filter((c) => c.d < days).length > 0 && (
            <CostsBlock days={days} twoCols={twoCols} />
          )}

          {has("stock") && <StockBlock days={days} threeCols={threeCols} />}

          <ResultBlock days={days} threeCols={threeCols} revenue={revenue} costs={costs} />
        </div>
      )}
    </div>
  );
}

function Block({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={css(
        "border:1px solid var(--border);border-radius:15px;background:var(--surface);box-shadow:var(--shadow);overflow:hidden",
      )}
    >
      <div style={css("padding:15px 18px;border-bottom:1px solid var(--border)")}>
        <h2 style={css(`margin:0;font:700 15.5px ${SANS}`)}>{title}</h2>
        <p style={css(`margin:3px 0 0;font:400 12px ${SANS};color:var(--muted)`)}>{note}</p>
      </div>
      {children}
    </div>
  );
}

function Title({ text }: { text: string }) {
  return (
    <div
      style={css(
        `margin-bottom:11px;font:600 10.5px ${MONO};letter-spacing:.1em;text-transform:uppercase;color:var(--muted)`,
      )}
    >
      {text}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function SalesBlock({
  sales,
  days,
  threeCols,
  ticket,
}: {
  sales: Sale[];
  days: number;
  threeCols: string;
  ticket: number;
}) {
  const { isMobile } = usePortal();

  // Até 14 dias mostra dia a dia; acima disso agrupa por semana, ou o gráfico
  // vira uma cerca ilegível.
  const step = days <= 14 ? 1 : 7;
  const groups = Math.min(Math.ceil(days / step), 13);

  const series = Array.from({ length: groups }, (_, i) => {
    const from = (groups - 1 - i) * step;
    const to = from + step;
    const inGroup = sales.filter((v) => v.d >= from && v.d < to);
    return {
      key: from,
      amount: totalRevenue(inGroup),
      label: step === 1 ? weekday(from) : from === 0 ? "Esta sem." : ddmm(from),
    };
  });
  const largest = Math.max(...series.map((b) => b.amount), 1);

  const valid = sales.filter(isValidSale);

  const byProduct = new Map<string, { amount: number; qtd: number }>();
  for (const v of valid) {
    for (const i of v.items) {
      const cur = byProduct.get(i.name) ?? { amount: 0, qtd: 0 };
      byProduct.set(i.name, { amount: cur.amount + i.qtd * i.price, qtd: cur.qtd + i.qtd });
    }
  }
  const ranking = [...byProduct.entries()]
    .sort((x, y) => y[1].amount - x[1].amount)
    .slice(0, 5)
    .map(([name, d]) => ({ name, ...d }));
  const topRank = ranking[0]?.amount ?? 1;

  const total = totalRevenue(sales);
  const payments = METHODS.map((forma) => {
    const amount = valid.filter((v) => v.payment === forma).reduce((x, v) => x + totalV(v), 0);
    return { name: forma, amount, pct: total > 0 ? (amount / total) * 100 : 0, color: PAYMENT_COLOR[forma] };
  }).filter((p) => p.amount > 0);

  return (
    <Block title="Vendas" note={`${valid.length} vendas · ${valid.reduce((x, v) => x + qtdV(v), 0)} itens no período`}>
      <div style={css("padding:16px 18px")}>
        <div style={css(`display:flex;align-items:flex-end;gap:${isMobile ? "4px" : "8px"};height:190px`)}>
          {series.map((b) => (
            <div
              key={b.key}
              style={css("flex:1;display:flex;flex-direction:column;align-items:center;gap:7px;height:100%")}
            >
              <span
                style={css(`flex:none;white-space:nowrap;font:600 10.5px ${MONO};color:var(--muted);${NUM}`)}
              >
                {b.amount > 0 ? shortBrl(b.amount) : "—"}
              </span>
              <span style={css("flex:1;min-height:0;width:100%;display:flex;align-items:flex-end")}>
                <span
                  style={css(
                    "flex:none;width:100%;border-radius:7px 7px 3px 3px;min-height:4px;transition:height .3s ease;" +
                      `background:${b.key === 0 ? "var(--accent)" : "var(--accent-soft)"};` +
                      `height:${Math.max((b.amount / largest) * 100, 2)}%`,
                  )}
                />
              </span>
              <span
                style={css(`flex:none;white-space:nowrap;font:600 10.5px ${SANS};color:var(--muted)`)}
              >
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={css(
          `display:grid;grid-template-columns:${threeCols};gap:1px;background:var(--border);border-top:1px solid var(--border)`,
        )}
      >
        <div style={css("padding:15px 18px;background:var(--surface)")}>
          <Title text="Mais vendidos" />
          <div style={css("display:flex;flex-direction:column;gap:10px")}>
            {ranking.map((r) => (
              <div key={r.name}>
                <div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:10px")}>
                  <span
                    style={css(
                      `min-width:0;font:600 12.5px/1.3 ${SANS};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
                    )}
                  >
                    {r.name}
                  </span>
                  <span style={css(`flex:none;font:700 12.5px ${SANS};${NUM}`)}>{brl(r.amount)}</span>
                </div>
                <div style={css("display:flex;align-items:center;gap:8px;margin-top:5px")}>
                  <span
                    style={css("flex:1;height:6px;border-radius:999px;background:var(--surface3);overflow:hidden")}
                  >
                    <span
                      style={css(
                        `display:block;height:100%;border-radius:999px;background:var(--accent);width:${(r.amount / topRank) * 100}%`,
                      )}
                    />
                  </span>
                  <span style={css(`flex:none;font:500 11px ${MONO};color:var(--muted)`)}>{r.qtd}×</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={css("padding:15px 18px;background:var(--surface)")}>
          <Title text="Como o cliente pagou" />
          <div style={css("display:flex;height:9px;border-radius:999px;overflow:hidden;background:var(--surface3)")}>
            {payments.map((p) => (
              <span key={p.name} style={css(`height:100%;background:${p.color};width:${p.pct}%`)} />
            ))}
          </div>
          <div style={css("display:flex;flex-direction:column;gap:9px;margin-top:13px")}>
            {payments.map((p) => (
              <div key={p.name} style={css("display:flex;align-items:center;gap:9px")}>
                <span style={css(`flex:none;width:8px;height:8px;border-radius:50%;background:${p.color}`)} />
                <span style={css(`flex:1;min-width:0;font:600 12.5px ${SANS}`)}>{p.name}</span>
                <span style={css(`flex:none;font:500 11.5px ${MONO};color:var(--muted)`)}>
                  {p.pct.toFixed(0)}%
                </span>
                <span style={css(`flex:none;font:700 12.5px ${SANS};${NUM}`)}>{brl(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={css("padding:15px 18px;background:var(--surface)")}>
          <Title text="Ticket médio" />
          <div style={css(`font:700 26px/1 ${SANS};${NUM}`)}>{brl(ticket)}</div>
          <div style={css(`margin-top:7px;font:500 12px/1.45 ${SANS};color:var(--muted)`)}>
            Quanto cada cliente gasta, em média, por passagem no balcão.
          </div>
          <div style={css("margin-top:14px;padding-top:12px;border-top:1px solid var(--border)")}>
            <Title text="Vendas no período" />
            <div style={css(`margin-top:-6px;font:700 19px ${SANS};${NUM}`)}>{valid.length}</div>
          </div>
        </div>
      </div>
    </Block>
  );
}

/* -------------------------------------------------------------------------- */

function CostsBlock({ days, twoCols }: { days: number; twoCols: string }) {
  const { d } = usePortal();
  const inPeriod = d.costs.filter((c) => c.d < days);
  const total = inPeriod.reduce((x, c) => x + c.amount, 0) || 1;

  const byCategory = new Map<string, number>();
  for (const c of inPeriod) byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + c.amount);
  const categories = [...byCategory.entries()]
    .sort((x, y) => y[1] - x[1])
    .map(([name, amount], i) => ({
      name,
      amount,
      pct: (amount / total) * 100,
      color: ["var(--warn)", "var(--petrol)", "var(--accent)", "var(--muted)"][i % 4],
    }));

  const fixed = inPeriod.filter((c) => c.type === "fixed").reduce((x, c) => x + c.amount, 0);
  const variable = inPeriod.filter((c) => c.type === "variable").reduce((x, c) => x + c.amount, 0);

  return (
    <Block title="Custos" note="Para onde foi o dinheiro no período.">
      <div style={css(`display:grid;grid-template-columns:${twoCols};gap:1px;background:var(--border)`)}>
        <div style={css("padding:15px 18px;background:var(--surface)")}>
          <Title text="Por categoria" />
          <div style={css("display:flex;flex-direction:column;gap:11px")}>
            {categories.map((c) => (
              <div key={c.name}>
                <div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:10px")}>
                  <span
                    style={css(
                      `min-width:0;font:600 12.5px ${SANS};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
                    )}
                  >
                    {c.name}
                  </span>
                  <span style={css(`flex:none;font:700 12.5px ${SANS};${NUM}`)}>{brl(c.amount)}</span>
                </div>
                <div style={css("display:flex;align-items:center;gap:8px;margin-top:5px")}>
                  <span
                    style={css("flex:1;height:6px;border-radius:999px;background:var(--surface3);overflow:hidden")}
                  >
                    <span
                      style={css(
                        `display:block;height:100%;border-radius:999px;background:${c.color};width:${c.pct}%`,
                      )}
                    />
                  </span>
                  <span style={css(`flex:none;font:500 11px ${MONO};color:var(--muted)`)}>
                    {c.pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={css("padding:15px 18px;background:var(--surface)")}>
          <Title text="Fixo e variável" />
          <div style={css("display:flex;flex-direction:column;gap:11px")}>
            {[
              {
                name: "Custos fixos",
                amount: fixed,
                color: "var(--petrol)",
                note: "Aluguel, luz, salário — saem todo mês, venda ou não.",
              },
              {
                name: "Custos variáveis",
                amount: variable,
                color: "var(--warn)",
                note: "Mercadoria e insumos — acompanham o movimento.",
              },
            ].map((t) => (
              <div
                key={t.name}
                style={css(
                  "padding:12px 13px;border:1px solid var(--border);border-radius:11px;background:var(--surface2)",
                )}
              >
                <div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:10px")}>
                  <span style={css(`font:600 12.5px ${SANS};color:${t.color}`)}>{t.name}</span>
                  <span style={css(`font:700 15px ${SANS};${NUM}`)}>{brl(t.amount)}</span>
                </div>
                <div style={css(`margin-top:4px;font:500 11.5px/1.4 ${SANS};color:var(--muted)`)}>
                  {t.note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Block>
  );
}

/* -------------------------------------------------------------------------- */

function StockBlock({ days, threeCols }: { days: number; threeCols: string }) {
  const { d } = usePortal();

  const outflows = new Map<string, number>();
  for (const v of d.sales.filter((x) => x.d < days && isValidSale(x))) {
    for (const i of v.items) outflows.set(i.name, (outflows.get(i.name) ?? 0) + i.qtd);
  }

  const tracked = d.products.filter((p) => p.stock != null);
  const turnover = [...outflows.entries()]
    .filter(([name]) => tracked.some((p) => p.name === name))
    .sort((x, y) => y[1] - x[1])
    .slice(0, 4);

  const idle = tracked.filter((p) => !outflows.has(p.name)).slice(0, 4);
  const alerts = productsOutOfStock(d.products).slice(0, 3);

  return (
    <Block
      title="Estoque"
      note={`O que gira, o que está parado e o que precisa repor. Valor imobilizado: ${brl(stockValue(d.products))}.`}
    >
      <div style={css(`display:grid;grid-template-columns:${threeCols};gap:1px;background:var(--border)`)}>
        <div style={css("padding:15px 18px;background:var(--surface)")}>
          <Title text="Mais saíram" />
          <div style={css("display:flex;flex-direction:column;gap:10px")}>
            {turnover.length === 0 ? (
              <div style={css(`font:500 12px/1.5 ${SANS};color:var(--muted)`)}>
                Nenhuma saída de produto no período.
              </div>
            ) : (
              turnover.map(([name, qtd]) => (
                <div key={name} style={css("display:flex;align-items:center;gap:10px")}>
                  <span
                    style={css(
                      `flex:1;min-width:0;font:600 12.5px/1.3 ${SANS};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
                    )}
                  >
                    {name}
                  </span>
                  <span style={css(`flex:none;font:700 12.5px ${SANS};${NUM};color:var(--text2)`)}>
                    {qtd}×
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={css("padding:15px 18px;background:var(--surface)")}>
          <Title text="Parados no período" />
          <div style={css("display:flex;flex-direction:column;gap:10px")}>
            {idle.length === 0 ? (
              <div style={css(`font:500 12px/1.5 ${SANS};color:var(--muted)`)}>
                Tudo girou no período — nenhum produto parado.
              </div>
            ) : (
              idle.map((p) => (
                <div key={p.id} style={css("display:flex;align-items:center;gap:10px")}>
                  <span
                    style={css(
                      `flex:1;min-width:0;font:500 12.5px/1.3 ${SANS};color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
                    )}
                  >
                    {p.name}
                  </span>
                  <span style={css(`flex:none;font:500 11.5px ${MONO};color:var(--muted)`)}>
                    {p.stock} {p.unit}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={css("padding:15px 18px;background:var(--surface)")}>
          <Title text="Precisa repor" />
          <div style={css("display:flex;flex-direction:column;gap:9px")}>
            {alerts.length === 0 ? (
              <div
                style={css(
                  `padding:11px 12px;border-radius:10px;background:var(--pos-soft);font:600 12.5px ${SANS};color:var(--pos)`,
                )}
              >
                Estoque em dia, nada para repor.
              </div>
            ) : (
              alerts.map((p) => {
                const zeroed = p.stock === 0;
                return (
                  <div
                    key={p.id}
                    style={css(
                      `display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:10px;background:var(--warn-soft)`,
                    )}
                  >
                    <span
                      style={css(
                        `flex:1;min-width:0;font:600 12.5px/1.3 ${SANS};color:${zeroed ? "var(--danger)" : "var(--warn)"};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
                      )}
                    >
                      {p.name}
                    </span>
                    <span
                      style={css(
                        `flex:none;font:600 11.5px ${SANS};color:${zeroed ? "var(--danger)" : "var(--warn)"}`,
                      )}
                    >
                      {zeroed ? "acabou" : `restam ${p.stock}`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Block>
  );
}

/* -------------------------------------------------------------------------- */

function ResultBlock({
  days,
  threeCols,
  revenue,
  costs,
}: {
  days: number;
  threeCols: string;
  revenue: number;
  costs: number;
}) {
  const { has, isMobile, d } = usePortal();
  const hasCosts = has("costs");

  const step = days <= 14 ? 1 : 7;
  const groups = Math.min(Math.ceil(days / step), 13);

  const series = Array.from({ length: groups }, (_, i) => {
    const from = (groups - 1 - i) * step;
    const to = from + step;
    const vendasG = totalRevenue(d.sales.filter((v) => v.d >= from && v.d < to));
    // Por barra entram só os custos variáveis: o fixo é mensal e ratear o
    // aluguel dia a dia faria toda barra nascer no vermelho.
    const costsChart = hasCosts
      ? d.costs
          .filter((c) => c.d >= from && c.d < to && c.type === "variable")
          .reduce((x, c) => x + c.amount, 0)
      : costOfSales(
          d.sales.filter((v) => v.d >= from && v.d < to),
          d.products,
        );
    return {
      key: from,
      sales: vendasG,
      costs: costsChart,
      profit: vendasG - costsChart,
      label: step === 1 ? weekday(from) : from === 0 ? "Esta sem." : ddmm(from),
    };
  });

  const largest = Math.max(...series.flatMap((b) => [b.sales, b.costs, Math.abs(b.profit)]), 1);

  const profit = revenue - costs;
  const best = [...series].sort((x, y) => y.profit - x.profit)[0];

  const cards = [
    {
      label: "Sobrou no período",
      value: brl(profit),
      note: revenue > 0 ? `${((profit / revenue) * 100).toFixed(0)}% do que entrou` : "Sem vendas",
      color: profit >= 0 ? "var(--pos)" : "var(--danger)",
    },
    {
      label: "Média por dia",
      value: brl(profit / Math.max(days, 1)),
      note: `Ao longo de ${days} ${days === 1 ? "dia" : "days"}`,
      color: "var(--text)",
    },
    {
      label: "Melhor período",
      value: best ? brl(best.profit) : "—",
      note: best ? best.label : "Sem dados",
      color: "var(--text)",
    },
  ];

  return (
    <Block title="Resultado" note="Quanto sobrou depois de pagar tudo, ao longo do período.">
      <div style={css("padding:16px 18px")}>
        <div style={css("display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:14px")}>
          {[
            ["Vendas", "var(--pos)"],
            ["Custos", "var(--warn)"],
            ["Sobrou", "var(--accent)"],
          ].map(([name, color]) => (
            <span
              key={name}
              style={css(`display:flex;align-items:center;gap:7px;font:600 11.5px ${SANS};color:var(--text2)`)}
            >
              <span style={css(`width:9px;height:9px;border-radius:3px;background:${color}`)} />
              {name}
            </span>
          ))}
        </div>

        <div style={css(`display:flex;align-items:flex-end;gap:${isMobile ? "4px" : "8px"};height:200px`)}>
          {series.map((b) => (
            <div
              key={b.key}
              style={css("flex:1;display:flex;flex-direction:column;align-items:center;gap:7px;height:100%")}
            >
              <span
                style={css(
                  `flex:none;white-space:nowrap;font:600 10.5px ${MONO};${NUM};color:${b.profit >= 0 ? "var(--pos)" : "var(--danger)"}`,
                )}
              >
                {shortBrl(b.profit)}
              </span>
              <span style={css("flex:1;min-height:0;width:100%;display:flex;align-items:flex-end;gap:3px")}>
                {[
                  [b.sales, "var(--pos)"],
                  [b.costs, "var(--warn)"],
                  [Math.abs(b.profit), b.profit >= 0 ? "var(--accent)" : "var(--danger)"],
                ].map(([amount, color], i) => (
                  <span
                    key={i}
                    style={css(
                      `flex:1;border-radius:6px 6px 2px 2px;background:${color};min-height:3px;transition:height .3s ease;` +
                        `height:${Math.max(((amount as number) / largest) * 100, 1.5)}%`,
                    )}
                  />
                ))}
              </span>
              <span
                style={css(`flex:none;white-space:nowrap;font:600 10.5px ${SANS};color:var(--muted)`)}
              >
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={css(
          `display:grid;grid-template-columns:${threeCols};gap:1px;background:var(--border);border-top:1px solid var(--border)`,
        )}
      >
        {cards.map((k) => (
          <div key={k.label} style={css("padding:15px 18px;background:var(--surface)")}>
            <div style={css(KPI_LABEL)}>{k.label}</div>
            <div style={css(`margin-top:6px;font:700 20px/1.05 ${SANS};${NUM};color:${k.color}`)}>
              {k.value}
            </div>
            <div style={css(`margin-top:5px;font:500 11.5px/1.4 ${SANS};color:var(--muted)`)}>{k.note}</div>
          </div>
        ))}
      </div>
    </Block>
  );
}
