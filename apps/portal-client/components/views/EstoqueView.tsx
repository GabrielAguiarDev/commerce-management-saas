"use client";

import { usePortal } from "@/components/PortalProvider";
import { RowMenu } from "@/components/ui";
import { NewButton, Button, TABLE_HEADER, ScreenHeader, css, KpiStrip, PillGroup, ClearFilters, LIST, MONO, NUM, columnLabel, SANS, SimpleSelect, Empty } from "@aguiar/ui";
import { MOVEMENT_STYLE, canUndo } from "@/lib/dados/estoque";
import { categoriesOf, tracksStock, lowStock } from "@/lib/dados/produtos";
import { brl, dateLabel } from "@/lib/formato";
import { ROUTES } from "@/lib/rotas";
import { stockValue } from "@/lib/selectors";
import { filterField, BADGE_NEUTRAL } from "@/lib/styleKit";
import type { StockTab } from "@/types/estado";
import type { StockMovement, Product } from "@/types/types";

const ALL_SITUATIONS = "Todas as situações";
const ALL_CATEGORIES = "Todas as categorias";
const ALL_TYPES = "Todos os tipos";
const ALL_PRODUCTS = "Todos os produtos";

const ORDERS = ["Estoque mais baixo", "Nome (A–Z)", "Maior valor parado"];
const MOVEMENT_PERIODS = ["Últimos 7 dias", "Últimos 30 dias", "Tudo"];
const MOVEMENT_DAYS: Record<string, number> = {
  "Últimos 7 dias": 7,
  "Últimos 30 dias": 30,
  Tudo: 9999,
};

/**
 * Estoque.
 *
 * Duas leituras da mesma verdade: a aba "Itens" mostra o saldo de agora, a aba
 * "Movimentações" mostra como ele chegou aí. A baixa por venda aparece nas duas
 * sem ninguém precisar lançar nada.
 */
export function EstoqueView() {
  const { s, a, isMobile, d } = usePortal();
  const f = s.fEstoque;

  const tracked = d.products.filter(tracksStock);
  const set = (p: Partial<typeof f>) => a.set({ fEstoque: { ...f, ...p } });

  const outOfStock = tracked.filter((p) => p.active && lowStock(p));
  const zeroed = tracked.filter((p) => p.stock === 0);

  const kpis = [
    { label: "Itens controlados", value: String(tracked.length), note: "Com saldo na prateleira" },
    {
      label: "Precisa repor",
      value: String(outOfStock.length),
      note: outOfStock.length ? "Chegou no mínimo" : "Estoque em dia",
      color: outOfStock.length ? "var(--warn)" : "var(--pos)",
    },
    {
      label: "Sem estoque",
      value: String(zeroed.length),
      note: zeroed.length ? "Acabou" : "Nenhum zerado",
      color: zeroed.length ? "var(--danger)" : "var(--pos)",
    },
    { label: "Valor parado", value: brl(stockValue(d.products)), note: "A preço de custo" },
  ];

  return (
    <div>
      <ScreenHeader
        title="Estoque"
        subtitle="Veja o que precisa repor e registre entradas, perdas e contagens."
        action={
          <NewButton
            text="Registrar movimentação"
            onClick={() => a.openMovement()}
            wide={isMobile}
          />
        }
      />

      <KpiStrip kpis={kpis} columns={isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))"} />

      <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px")}>
        <PillGroup<StockTab>
          options={[
            { key: "items", name: "Itens" },
            { key: "movements", name: "Movimentações" },
          ]}
          current={f.tab}
          onPick={(v) => set({ tab: v })}
        />
        <span style={css(`font:500 12px ${SANS};color:var(--muted)`)}>
          As vendas dão baixa no estoque automaticamente.
        </span>
      </div>

      {tracked.length === 0 ? (
        <Empty
          title="Nenhum produto com estoque controlado"
          text="Cadastre seus produtos físicos com quantidade e estoque mínimo. Depois registre a primeira entrada de mercadoria — as vendas passam a dar baixa sozinhas."
          action="Ir para Produtos"
          onAction={() => a.goTo(ROUTES.products)}
          standout
        />
      ) : f.tab === "items" ? (
        <ItemsTab tracked={tracked} />
      ) : (
        <MovementsTab />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Itens                                                                       */
/* -------------------------------------------------------------------------- */

function ItemsTab({ tracked }: { tracked: Product[] }) {
  const { s, a, isDesktop, d } = usePortal();
  const f = s.fEstoque;
  const set = (p: Partial<typeof f>) => a.set({ fEstoque: { ...f, ...p } });

  const search = f.search.trim().toLowerCase();
  const filtered = tracked.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search) && !p.code.includes(search)) return false;
    if (f.cat !== ALL_CATEGORIES && p.category !== f.cat) return false;
    if (f.status === "Precisa repor" && !lowStock(p)) return false;
    if (f.status === "Sem estoque" && p.stock !== 0) return false;
    if (f.status === "Em dia" && lowStock(p)) return false;
    return true;
  });

  const sorted = [...filtered].sort((x, y) => {
    if (f.ordem === "Nome (A–Z)") return x.name.localeCompare(y.name);
    if (f.ordem === "Maior valor parado") {
      return (y.stock ?? 0) * y.cost - (x.stock ?? 0) * x.cost;
    }
    return (x.stock ?? 0) - (y.stock ?? 0);
  });

  const cols = `minmax(0,1fr)${isDesktop ? " 150px" : ""} 110px 90px 130px 44px`;

  return (
    <div>
      <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px")}>
        <input
          value={f.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Buscar por nome ou código"
          style={css(`flex:1;min-width:170px;${filterField()}`)}
        />
        <SimpleSelect
          value={f.status}
          options={[ALL_SITUATIONS, "Precisa repor", "Sem estoque", "Em dia"]}
          onChange={(v) => set({ status: v })}
        />
        <SimpleSelect
          value={f.cat}
          options={[ALL_CATEGORIES, ...categoriesOf(d.products)]}
          onChange={(v) => set({ cat: v })}
        />
        <SimpleSelect value={f.ordem} options={ORDERS} onChange={(v) => set({ ordem: v })} />
      </div>

      {sorted.length === 0 ? (
        <Empty
          title="Nenhum produto com esses filtros"
          text="Tente outro termo ou mude a situação."
          action="Limpar filtros"
          onAction={() => set({ search: "", status: ALL_SITUATIONS, cat: ALL_CATEGORIES })}
        />
      ) : (
        <>
          <div style={css(LIST + ";overflow:visible")}>
            {isDesktop && (
              <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;${TABLE_HEADER}`)}>
                <span style={css(columnLabel())}>PRODUTO</span>
                <span style={css(columnLabel())}>CATEGORIA</span>
                <span style={css(columnLabel("right"))}>EM ESTOQUE</span>
                <span style={css(columnLabel("right"))}>MÍNIMO</span>
                <span style={css(columnLabel())}>SITUAÇÃO</span>
                <span />
              </div>
            )}
            {sorted.map((p) => (
              <ItemRow key={p.id} product={p} cols={cols} />
            ))}
          </div>
          <p style={css(`margin:10px 0 0;font:500 12px ${SANS};color:var(--muted)`)}>
            {sorted.length} de {tracked.length} items controlados
          </p>
        </>
      )}
    </div>
  );
}

function situationOf(p: Product) {
  if (p.stock === 0) return { text: "Sem estoque", bg: "var(--warn-soft)", color: "var(--danger)" };
  if (lowStock(p)) return { text: "Precisa repor", bg: "var(--warn-soft)", color: "var(--warn)" };
  return { text: "Em dia", bg: "var(--pos-soft)", color: "var(--pos)" };
}

function ItemRow({ product: p, cols }: { product: Product; cols: string }) {
  const { a, isDesktop } = usePortal();
  const sit = situationOf(p);

  const actions = [
    { text: "Registrar entrada", onClick: () => a.openMovement(p.id, "in") },
    { text: "Registrar saída ou perda", onClick: () => a.openMovement(p.id, "out") },
    { text: "Ajustar pela contagem", onClick: () => a.openMovement(p.id, "adjustment") },
    { text: "Editar produto", onClick: () => a.openProduct(p.id) },
  ];

  return (
    <div style={css("position:relative;background:var(--surface)")}>
      {isDesktop ? (
        <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;align-items:center;padding:12px 14px`)}>
          <span style={css("min-width:0")}>
            <span
              style={css(
                `display:block;font:600 13.5px/1.3 ${SANS};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`,
              )}
            >
              {p.name}
            </span>
            <span style={css(`display:block;margin-top:3px;font:500 11px ${MONO};color:var(--muted)`)}>
              {p.code || "sem código"} · custo {brl(p.cost)}
            </span>
          </span>
          <span>
            <span style={css(BADGE_NEUTRAL)}>{p.category}</span>
          </span>
          <span style={css(`text-align:right;font:700 15px ${SANS};${NUM};color:${sit.color}`)}>
            {p.stock} {p.unit}
          </span>
          <span style={css(`text-align:right;font:500 12.5px ${SANS};${NUM};color:var(--muted)`)}>
            {p.minimum ?? 0}
          </span>
          <span>
            <span
              style={css(
                `display:inline-flex;padding:3px 9px;border-radius:999px;background:${sit.bg};color:${sit.color};font:600 11px ${SANS}`,
              )}
            >
              {sit.text}
            </span>
          </span>
          <RowMenu menuKey={`item:${p.id}`} actions={actions} width={230} />
        </div>
      ) : (
        <div style={css("display:flex;gap:10px;padding:12px 13px")}>
          <div style={css("flex:1;min-width:0")}>
            <div style={css(`font:600 13.5px/1.3 ${SANS}`)}>{p.name}</div>
            <div style={css("display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:5px")}>
              <span
                style={css(
                  `padding:2px 8px;border-radius:999px;background:${sit.bg};color:${sit.color};font:600 10.5px ${SANS}`,
                )}
              >
                {sit.text}
              </span>
              <span style={css(`font:600 12.5px ${SANS};${NUM};color:${sit.color}`)}>
                {p.stock} {p.unit}
              </span>
              <span style={css(`font:500 11.5px ${SANS};color:var(--muted)`)}>mín. {p.minimum ?? 0}</span>
            </div>
          </div>
          <RowMenu menuKey={`item:${p.id}`} actions={actions} width={230} />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Movimentações                                                               */
/* -------------------------------------------------------------------------- */

function MovementsTab() {
  const { s, a, isDesktop, d } = usePortal();
  const f = s.fEstoque;
  const set = (p: Partial<typeof f>) => a.set({ fEstoque: { ...f, ...p } });

  const days = MOVEMENT_DAYS[f.movPeriodo] ?? 30;
  const names = Array.from(new Set(d.movements.map((m) => m.product))).sort();

  const filtered = d.movements.filter((m) => {
    if (m.d >= days) return false;
    if (f.movTipo !== ALL_TYPES && MOVEMENT_STYLE[m.type].name !== f.movTipo) return false;
    if (f.movProduto !== ALL_PRODUCTS && m.product !== f.movProduto) return false;
    return true;
  });

  const sorted = [...filtered].sort((x, y) => x.d - y.d || y.time.localeCompare(x.time));

  const filterActive =
    f.movTipo !== ALL_TYPES || f.movProduto !== ALL_PRODUCTS || f.movPeriodo !== "Últimos 30 dias";

  const cols = `110px minmax(0,1fr) 140px 80px${isDesktop ? " minmax(0,1fr)" : ""} 100px`;

  return (
    <div>
      <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px")}>
        <SimpleSelect
          value={f.movTipo}
          options={[ALL_TYPES, ...Object.values(MOVEMENT_STYLE).map((e) => e.name)]}
          onChange={(v) => set({ movTipo: v })}
        />
        <SimpleSelect
          value={f.movProduto}
          options={[ALL_PRODUCTS, ...names]}
          onChange={(v) => set({ movProduto: v })}
        />
        <SimpleSelect value={f.movPeriodo} options={MOVEMENT_PERIODS} onChange={(v) => set({ movPeriodo: v })} />
        {filterActive && (
          <ClearFilters text="Limpar filtros"
            onClick={() =>
              set({ movTipo: ALL_TYPES, movProduto: ALL_PRODUCTS, movPeriodo: "Últimos 30 dias" })
            }
          />
        )}
      </div>

      {sorted.length === 0 ? (
        <Empty
          title="Nenhuma movimentação neste período"
          text="Registre uma entrada de mercadoria ou mude o período do filtro. As baixas por venda aparecem aqui sozinhas."
          action="Registrar movimentação"
          onAction={() => a.openMovement()}
        />
      ) : (
        <>
          <div style={css(LIST + ";overflow:visible")}>
            {isDesktop && (
              <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;${TABLE_HEADER}`)}>
                <span style={css(columnLabel())}>QUANDO</span>
                <span style={css(columnLabel())}>PRODUTO</span>
                <span style={css(columnLabel())}>TIPO</span>
                <span style={css(columnLabel("right"))}>QTD</span>
                <span style={css(columnLabel())}>ORIGEM</span>
                <span />
              </div>
            )}
            {sorted.map((m) => (
              <MovementRow key={m.id} mov={m} cols={cols} />
            ))}
          </div>
          <p style={css(`margin:10px 0 0;font:500 12px ${SANS};color:var(--muted)`)}>
            {sorted.length} movimentaç{sorted.length === 1 ? "ão" : "ões"} no período
          </p>
        </>
      )}
    </div>
  );
}

function MovementRow({ mov: m, cols }: { mov: StockMovement; cols: string }) {
  const { a, isDesktop } = usePortal();
  const e = MOVEMENT_STYLE[m.type];
  const reversible = canUndo(m);

  const botaoReverter = reversible ? (
    <Button
      onClick={() =>
        a.confirm({
          title: "Reverter esta movimentação?",
          text: "O saldo do produto volta ao que era antes dela.",
          summary: `${e.name} de ${Math.abs(m.delta)} em ${m.product}`,
          detail: `${dateLabel(m.d, m.time)} · ${m.reason}`,
          reversal: "Você pode registrar de novo se precisar.",
          button: "Reverter",
          buttonBg: "var(--warn)",
          buttonInk: "#fff",
          color: "var(--warn)",
          action: () => a.undoMovement(m.id),
        })
      }
      className="hv-warn-borda"
      style={css(
        `justify-self:end;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--muted);font:600 11.5px ${SANS}`,
      )}
    >
      Reverter
    </Button>
  ) : (
    // Baixa por venda não se reverte aqui: quem desfaz é o estorno da venda.
    <span style={css(`justify-self:end;font:500 11px ${SANS};color:var(--muted)`)}>automática</span>
  );

  return (
    <div style={css("position:relative;background:var(--surface)")}>
      {isDesktop ? (
        <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;align-items:center;padding:12px 14px`)}>
          <span style={css(`font:600 12px ${MONO};color:var(--text2);${NUM}`)}>
            {dateLabel(m.d, m.time)}
          </span>
          <span
            style={css(`min-width:0;font:500 13px ${SANS};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`)}
          >
            {m.product}
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
          <span style={css(`text-align:right;font:700 13.5px ${SANS};${NUM};color:${e.color}`)}>
            {m.delta > 0 ? "+" : ""}
            {m.delta}
          </span>
          <span style={css("min-width:0")}>
            <span
              style={css(
                `display:block;font:500 12px/1.35 ${SANS};color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
              )}
            >
              {m.reason}
            </span>
            <span style={css(`display:block;margin-top:2px;font:500 11px ${SANS};color:var(--muted)`)}>
              {m.who}
            </span>
          </span>
          {botaoReverter}
        </div>
      ) : (
        <div style={css("padding:12px 13px")}>
          <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap")}>
            <span style={css(`font:600 11.5px ${MONO};color:var(--muted)`)}>
              {dateLabel(m.d, m.time)}
            </span>
            <span
              style={css(
                `padding:2px 8px;border-radius:999px;background:${e.bg};color:${e.color};font:600 10.5px ${SANS}`,
              )}
            >
              {e.name}
            </span>
            <span style={css(`font:700 12.5px ${SANS};${NUM};color:${e.color}`)}>
              {m.delta > 0 ? "+" : ""}
              {m.delta}
            </span>
          </div>
          <div style={css(`margin-top:5px;font:500 13px/1.35 ${SANS}`)}>{m.product}</div>
          <div style={css(`margin-top:3px;font:500 11.5px/1.4 ${SANS};color:var(--muted)`)}>
            {m.reason} · {m.who}
          </div>
          {reversible && <div style={css("margin-top:8px")}>{botaoReverter}</div>}
        </div>
      )}
    </div>
  );
}
