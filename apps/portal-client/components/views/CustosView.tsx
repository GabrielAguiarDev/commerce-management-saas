"use client";

import { usePortal } from "@/components/PortalProvider";
import { RowMenu } from "@/components/ui";
import { NewButton, Button, TABLE_HEADER, ScreenHeader, css, KpiStrip, ClearFilters, LIST, MONO, NUM, columnLabel, SANS, SimpleSelect, Empty } from "@aguiar/ui";
import { costCategories, fixedShare, COST_TYPE_STYLE } from "@/lib/dados/custos";
import { brl, dateLabel } from "@/lib/formato";
import { ROUTES } from "@/lib/rotas";
import { totalRevenue } from "@/lib/selectors";
import type { Cost } from "@/types/types";

const ALL_TYPES = "Todos";
const ALL_CATEGORIES = "Todas as categorias";
const PERIODS = ["Este mês", "Últimos 7 dias", "Tudo"];
const DAYS: Record<string, number> = { "Este mês": 30, "Últimos 7 dias": 7, Tudo: 9999 };

/**
 * Custos.
 *
 * O número que importa não é quanto entrou, é quanto sobrou — e para isso o
 * portal precisa saber o que saiu. As compras lançadas no Estoque chegam aqui
 * sozinhas, marcadas, para ninguém lançar a mesma nota duas vezes.
 */
export function CustosView() {
  const { s, a, has, isDesktop, isMobile, d } = usePortal();
  const f = s.fCustos;
  const set = (p: Partial<typeof f>) => a.set({ fCustos: { ...f, ...p } });

  const days = DAYS[f.period] ?? 30;

  const inPeriod = d.costs.filter((c) => c.d < days);
  const filtered = inPeriod.filter((c) => {
    if (f.type === "Fixos" && c.type !== "fixed") return false;
    if (f.type === "Variáveis" && c.type !== "variable") return false;
    if (f.cat !== ALL_CATEGORIES && c.category !== f.cat) return false;
    return true;
  });

  const sorted = [...filtered].sort((x, y) => x.d - y.d);

  const fixed = inPeriod.filter((c) => c.type === "fixed").reduce((x, c) => x + c.amount, 0);
  const variable = inPeriod.filter((c) => c.type === "variable").reduce((x, c) => x + c.amount, 0);
  const totalReal = variable + fixedShare(d.costs, days);
  const revenue = totalRevenue(d.sales.filter((v) => v.d < days));
  const peso = revenue > 0 ? (totalReal / revenue) * 100 : 0;

  const filterActive = f.type !== ALL_TYPES || f.cat !== ALL_CATEGORIES || f.period !== "Este mês";

  const kpis = [
    { label: "Total do período", value: brl(totalReal), note: "Fixos rateados pelos dias" },
    { label: "Variáveis", value: brl(variable), note: "Mercadoria, feira, materiais" },
    { label: "Fixos", value: brl(fixed), note: "Lançados no período" },
    {
      label: "Peso na receita",
      value: revenue > 0 ? `${peso.toFixed(0)}%` : "—",
      note: revenue > 0 ? `De ${brl(revenue)} vendidos` : "Sem vendas no período",
      color: peso > 70 ? "var(--warn)" : "var(--text)",
    },
  ];

  const categoryCol = isDesktop;
  const cols = `100px minmax(0,1fr) 110px${categoryCol ? " 140px" : ""} 110px 44px`;

  return (
    <div>
      <ScreenHeader
        title="Custos"
        subtitle="Anote o que você gasta e o portal mostra o lucro de verdade do seu mês."
        action={<NewButton text="Registrar custo" onClick={() => a.openCost(null)} wide={isMobile} />}
      />

      <KpiStrip kpis={kpis} columns={isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))"} />

      {has("stock") && (
        <div
          style={css(
            "display:flex;align-items:flex-start;gap:10px;padding:12px 14px;margin-bottom:14px;" +
              "border:1px solid var(--border);border-radius:12px;background:var(--surface2)",
          )}
        >
          <span
            style={css(
              `flex:none;padding:3px 9px;border-radius:999px;background:var(--accent-soft);color:var(--accent);font:600 10.5px ${SANS}`,
            )}
          >
            Estoque
          </span>
          <p style={css(`margin:0;font:500 12px/1.5 ${SANS};color:var(--text2)`)}>
            As compras de mercadoria que você lança no Estoque entram aqui sozinhas como custo
            variável. Para corrigir uma delas, adjustment a in no Estoque — assim o valor não é
            lançado duas vezes.
          </p>
        </div>
      )}

      <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px")}>
        <SimpleSelect
          value={f.type}
          options={[ALL_TYPES, "Fixos", "Variáveis"]}
          onChange={(v) => set({ type: v })}
        />
        <SimpleSelect value={f.cat} options={[ALL_CATEGORIES, ...costCategories(d.costs)]} onChange={(v) => set({ cat: v })} />
        <SimpleSelect value={f.period} options={PERIODS} onChange={(v) => set({ period: v })} />
        {filterActive && (
          <ClearFilters text="Limpar filtros" onClick={() => set({ type: ALL_TYPES, cat: ALL_CATEGORIES, period: "Este mês" })} />
        )}
      </div>

      {d.costs.length === 0 ? (
        <Empty
          title="Nenhum custo lançado ainda"
          text="Anote o que você gasta — ingredientes, mercadoria, aluguel, luz — e o portal mostra o lucro de verdade do seu mês."
          action="Registrar primeiro custo"
          onAction={() => a.openCost(null)}
          standout
        />
      ) : sorted.length === 0 ? (
        <Empty
          title="Nenhum custo com esses filtros"
          text="Tente outro período ou limpe os filtros."
          action="Limpar filtros"
          onAction={() => set({ type: ALL_TYPES, cat: ALL_CATEGORIES, period: "Este mês" })}
        />
      ) : (
        <>
          <div style={css(LIST + ";overflow:visible")}>
            {isDesktop && (
              <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;${TABLE_HEADER}`)}>
                <span style={css(columnLabel())}>QUANDO</span>
                <span style={css(columnLabel())}>DESCRIÇÃO</span>
                <span style={css(columnLabel())}>TIPO</span>
                {categoryCol && <span style={css(columnLabel())}>CATEGORIA</span>}
                <span style={css(columnLabel("right"))}>VALOR</span>
                <span />
              </div>
            )}
            {sorted.map((c) => (
              <CostRow key={c.id} cost={c} cols={cols} categoryCol={categoryCol} />
            ))}
          </div>
          <p style={css(`margin:10px 0 0;font:500 12px ${SANS};color:var(--muted)`)}>
            {sorted.length} lançamento{sorted.length === 1 ? "" : "s"} ·{" "}
            {brl(sorted.reduce((x, c) => x + c.amount, 0))} no filtro
          </p>
        </>
      )}
    </div>
  );
}

function CostRow({ cost: c, cols, categoryCol }: { cost: Cost; cols: string; categoryCol: boolean }) {
  const { a, isDesktop } = usePortal();
  const e = COST_TYPE_STYLE[c.type];

  const actions = [
    { text: "Editar custo", onClick: () => a.openCost(c.id) },
    {
      text: "Excluir custo",
      color: "var(--danger)",
      onClick: () =>
        a.confirm({
          title: "Excluir este custo?",
          text: "Ele sai do total do período e do cálculo do lucro.",
          summary: c.description,
          detail: `${brl(c.amount)} · ${dateLabel(c.d, "")} · ${c.category}`,
          reversal: "Isto não pode ser desfeito — você teria de lançar de novo.",
          button: "Excluir custo",
          buttonBg: "var(--danger)",
          buttonInk: "#fff",
          color: "var(--danger)",
          action: () => a.deleteCost(c.id),
        }),
    },
  ];

  const badges = (
    <>
      {c.fromStock && (
        <span
          style={css(
            `padding:2px 7px;border-radius:999px;background:var(--accent-soft);color:var(--accent);font:600 10px ${SANS}`,
          )}
        >
          veio do estoque
        </span>
      )}
      {c.recurring && (
        <span
          style={css(
            `padding:2px 7px;border-radius:999px;background:var(--surface3);color:var(--muted);font:600 10px ${SANS}`,
          )}
        >
          repete todo mês
        </span>
      )}
    </>
  );

  return (
    <div style={css("position:relative;background:var(--surface)")}>
      {isDesktop ? (
        <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;align-items:center;padding:12px 14px`)}>
          <span style={css(`font:600 12px ${MONO};color:var(--text2);${NUM}`)}>{dateLabel(c.d, "")}</span>
          <span style={css("min-width:0")}>
            <span
              style={css(
                `display:block;font:600 13.5px/1.3 ${SANS};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`,
              )}
            >
              {c.description}
            </span>
            <span style={css("display:flex;align-items:center;gap:6px;margin-top:4px")}>{badges}</span>
          </span>
          <span>
            <span
              style={css(
                `display:inline-flex;padding:3px 9px;border-radius:999px;background:${e.bg};color:${e.color};font:600 11px ${SANS}`,
              )}
            >
              {e.name}
            </span>
          </span>
          {categoryCol && (
            <span
              style={css(
                `min-width:0;font:500 12.5px ${SANS};color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
              )}
            >
              {c.category}
            </span>
          )}
          <span style={css(`text-align:right;font:700 13.5px ${SANS};${NUM}`)}>{brl(c.amount)}</span>
          {/* Custo que veio do Estoque se corrige lá, na entrada que o gerou. */}
          {c.fromStock ? (
            <Button
              onClick={() => a.goTo(ROUTES.stock)}
              title="Ajustar no Estoque"
              className="hv-acc-borda"
              style={css(
                `justify-self:end;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--muted);font:600 11.5px ${SANS}`,
              )}
            >
              No Estoque
            </Button>
          ) : (
            <RowMenu key={`custo:${c.id}`} actions={actions} width={200} />
          )}
        </div>
      ) : (
        <div style={css("display:flex;gap:10px;padding:12px 13px")}>
          <div style={css("flex:1;min-width:0")}>
            <div style={css("display:flex;align-items:center;gap:7px;flex-wrap:wrap")}>
              <span style={css(`font:600 11.5px ${MONO};color:var(--muted)`)}>{dateLabel(c.d, "")}</span>
              <span
                style={css(
                  `padding:2px 8px;border-radius:999px;background:${e.bg};color:${e.color};font:600 10.5px ${SANS}`,
                )}
              >
                {e.name}
              </span>
              {badges}
            </div>
            <div style={css(`margin-top:5px;font:600 13.5px/1.3 ${SANS}`)}>{c.description}</div>
            <div style={css(`margin-top:3px;font:500 11.5px ${SANS};color:var(--muted)`)}>{c.category}</div>
          </div>
          <div style={css("flex:none;text-align:right")}>
            <div style={css(`font:700 14px ${SANS};${NUM}`)}>{brl(c.amount)}</div>
            {!c.fromStock && (
              <div style={css("margin-top:4px;display:flex;justify-content:flex-end")}>
                <RowMenu key={`custo:${c.id}`} actions={actions} width={200} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
