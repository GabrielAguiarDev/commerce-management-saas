"use client";

import { usePortal } from "@/components/PortalProvider";
import { RowMenu } from "@/components/ui";
import { NewButton, Button, TABLE_HEADER, ScreenHeader, css, KpiStrip, ClearFilters, LIST, MONO, NUM, columnLabel, SANS, SimpleSelect, Empty } from "@aguiar/ui";
import { categoriesOf, lowStock } from "@/lib/dados/produtos";
import { brl } from "@/lib/formato";
import { stockValue } from "@/lib/selectors";
import { filterField, BADGE_NEUTRAL } from "@/lib/styleKit";
import type { Product } from "@/types/types";

const ALL_CATEGORIES = "Todas as categorias";
const ALL_STATUSES = "Todos";

/**
 * O catálogo.
 *
 * As colunas seguem os módulos do plano: sem Estoque não há coluna de saldo,
 * sem Custos não há margem. O que sobra é o que todo mundo tem — nome, preço e
 * se está à venda.
 */
export function ProdutosView() {
  const { s, a, has, isDesktop, isMobile, d } = usePortal();
  const f = s.fProdutos;

  const hasStock = has("stock");
  const categoryCol = isDesktop;
  const stockCol = isDesktop && hasStock;

  const search = f.search.trim().toLowerCase();
  const filtered = d.products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search) && !p.code.includes(search)) return false;
    if (f.cat !== ALL_CATEGORIES && p.category !== f.cat) return false;
    if (f.status === "À venda" && !p.active) return false;
    if (f.status === "Pausados" && p.active) return false;
    if (f.onlyLow && !lowStock(p)) return false;
    return true;
  });

  const sorted = [...filtered].sort(
    (x, y) => Number(y.fav) - Number(x.fav) || x.name.localeCompare(y.name),
  );

  const filterActive =
    search !== "" || f.cat !== ALL_CATEGORIES || f.status !== ALL_STATUSES || f.onlyLow;

  const set = (p: Partial<typeof f>) => a.set({ fProdutos: { ...f, ...p } });
  const clear = () => set({ search: "", cat: ALL_CATEGORIES, status: ALL_STATUSES, onlyLow: false });

  const active = d.products.filter((p) => p.active);
  const outOfStock = d.products.filter((p) => p.active && lowStock(p));
  const averagePrice = active.length ? active.reduce((x, p) => x + p.price, 0) / active.length : 0;

  const kpis = [
    { label: "No catálogo", value: String(d.products.length), note: `${active.length} à venda` },
    { label: "Mais vendidos", value: String(d.products.filter((p) => p.fav).length), note: "Aparecem primeiro no PDV" },
    { label: "Preço médio", value: brl(averagePrice), note: "Dos produtos à venda" },
    hasStock
      ? {
          label: "Estoque baixo",
          value: String(outOfStock.length),
          note: outOfStock.length ? "Precisa repor" : "Nada para repor",
          color: outOfStock.length ? "var(--warn)" : "var(--pos)",
        }
      : { label: "Categorias", value: String(categoriesOf(d.products).length), note: "Em uso no catálogo" },
  ];

  const cols =
    `44px minmax(0,1fr)${categoryCol ? " 150px" : ""} 110px${stockCol ? " 100px" : ""} 110px 44px`;

  const subtitle = hasStock
    ? "Cadastre o que você vende: preço, categoria e quantidade em estoque."
    : "Cadastre o que você vende para agilizar o balcão.";

  return (
    <div>
      <ScreenHeader
        title="Produtos"
        subtitle={subtitle}
        action={<NewButton text="Novo produto" onClick={() => a.openProduct(null)} wide={isMobile} />}
      />

      <KpiStrip kpis={kpis} columns={isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))"} />

      <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px")}>
        <input
          value={f.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Buscar por nome ou código de barras"
          style={css(`flex:1;min-width:180px;${filterField()}`)}
        />
        <SimpleSelect value={f.cat} options={[ALL_CATEGORIES, ...categoriesOf(d.products)]} onChange={(v) => set({ cat: v })} />
        <SimpleSelect
          value={f.status}
          options={[ALL_STATUSES, "À venda", "Pausados"]}
          onChange={(v) => set({ status: v })}
        />
        {hasStock && (
          <Button
            onClick={() => set({ onlyLow: !f.onlyLow })}
            style={css(
              `padding:10px 13px;border:1px solid ${f.onlyLow ? "var(--warn)" : "var(--border)"};border-radius:10px;` +
                `background:${f.onlyLow ? "var(--warn-soft)" : "var(--surface)"};` +
                `color:${f.onlyLow ? "var(--warn)" : "var(--text2)"};font:600 12.5px ${SANS}`,
            )}
          >
            Só estoque baixo
          </Button>
        )}
        {filterActive && <ClearFilters text="Limpar filtros" onClick={clear} />}
      </div>

      {d.products.length === 0 ? (
        <Empty
          title="Seu catálogo está vazio"
          text="Cadastre o que você vende para agilizar o balcão: os produtos aparecem na tela de venda prontos para um toque."
          action="Cadastrar primeiro produto"
          onAction={() => a.openProduct(null)}
          standout
        />
      ) : sorted.length === 0 ? (
        <Empty
          title="Nenhum produto com esses filtros"
          text="Tente outro termo de busca ou limpe os filtros."
          action="Limpar filtros"
          onAction={clear}
        />
      ) : (
        <>
          <div style={css(LIST + ";overflow:visible")}>
            {isDesktop && (
              <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;${TABLE_HEADER}`)}>
                <span />
                <span style={css(columnLabel())}>PRODUTO</span>
                {categoryCol && <span style={css(columnLabel())}>CATEGORIA</span>}
                <span style={css(columnLabel("right"))}>PREÇO</span>
                {stockCol && <span style={css(columnLabel("right"))}>ESTOQUE</span>}
                <span style={css(columnLabel())}>STATUS</span>
                <span />
              </div>
            )}

            {sorted.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                cols={cols}
                categoryCol={categoryCol}
                stockCol={stockCol}
              />
            ))}
          </div>

          <p style={css(`margin:10px 0 0;font:500 12px ${SANS};color:var(--muted)`)}>
            {sorted.length} de {d.products.length} products
            {hasStock && ` · ${brl(stockValue(d.products))} parados na prateleira`}
          </p>
        </>
      )}
    </div>
  );
}

function ProductRow({
  product: p,
  cols,
  categoryCol,
  stockCol,
}: {
  product: Product;
  cols: string;
  categoryCol: boolean;
  stockCol: boolean;
}) {
  const { a, has, isDesktop } = usePortal();

  const low = lowStock(p);
  const corEstoque = p.stock == null
    ? "var(--muted)"
    : p.stock === 0
      ? "var(--danger)"
      : low
        ? "var(--warn)"
        : "var(--text2)";

  const statusBg = p.active ? "var(--pos-soft)" : "var(--surface3)";
  const statusColor = p.active ? "var(--pos)" : "var(--muted)";

  const actions = [
    { text: "Editar produto", onClick: () => a.openProduct(p.id) },
    { text: p.fav ? "Tirar dos mais vendidos" : "Marcar como mais vendido", onClick: () => a.toggleFav(p.id) },
    ...(has("stock") && p.stock != null
      ? [{ text: "Registrar movimentação", onClick: () => a.openMovement(p.id) }]
      : []),
    {
      text: p.active ? "Pausar venda" : "Voltar a vender",
      color: "var(--warn)",
      onClick: () =>
        a.confirm({
          title: p.active ? "Pausar este produto?" : "Voltar a vender?",
          text: p.active
            ? "Ele some da tela de venda, mas continua no catálogo e no histórico."
            : "Ele volta a aparecer na tela de venda.",
          summary: p.name,
          detail: `${brl(p.price)} · ${p.category}`,
          reversal: "Dá para desfazer a qualquer momento pelo mesmo menu.",
          button: p.active ? "Pausar" : "Voltar a vender",
          buttonBg: "var(--warn)",
          buttonInk: "#fff",
          color: "var(--warn)",
          action: () => a.toggleActive(p.id),
        }),
    },
    {
      text: "Excluir produto",
      color: "var(--danger)",
      onClick: () =>
        a.confirm({
          title: "Excluir este produto?",
          text:
            "Ele sai do catálogo. As vendas já registradas continuam no histórico com o nome e o preço do dia.",
          summary: p.name,
          detail: `${brl(p.price)} · ${p.category}`,
          reversal: "Isto não pode ser desfeito. Se for temporário, prefira pausar a venda.",
          button: "Excluir produto",
          buttonBg: "var(--danger)",
          buttonInk: "#fff",
          color: "var(--danger)",
          action: () => a.deleteProduct(p.id),
        }),
    },
  ];

  const botaoFav = (
    <Button
      onClick={() => a.toggleFav(p.id)}
      title={p.fav ? "Tirar dos mais vendidos" : "Marcar como mais vendido"}
      className="hv-linha2"
      style={css(
        `width:28px;height:28px;border-radius:8px;color:${p.fav ? "var(--warn)" : "var(--border2)"};font:600 15px/1 ${SANS}`,
      )}
    >
      {p.fav ? "★" : "☆"}
    </Button>
  );

  return (
    <div style={css("position:relative;background:var(--surface)")}>
      {isDesktop ? (
        <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;align-items:center;padding:12px 14px`)}>
          {botaoFav}
          <span style={css("min-width:0")}>
            <span
              style={css(
                `display:block;font:600 13.5px/1.3 ${SANS};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;` +
                  `color:${p.active ? "var(--text)" : "var(--muted)"}`,
              )}
            >
              {p.name}
            </span>
            <span style={css(`display:block;margin-top:3px;font:500 11px ${MONO};color:var(--muted)`)}>
              {p.code || "sem código"} · {p.unit}
            </span>
          </span>
          {categoryCol && (
            <span>
              <span style={css(BADGE_NEUTRAL)}>{p.category}</span>
            </span>
          )}
          <span style={css(`text-align:right;font:700 13.5px ${SANS};${NUM}`)}>{brl(p.price)}</span>
          {stockCol && (
            <span style={css(`text-align:right;font:600 12.5px ${SANS};${NUM};color:${corEstoque}`)}>
              {p.stock == null ? "—" : p.stock}
            </span>
          )}
          <span>
            <span
              style={css(
                `display:inline-flex;padding:3px 9px;border-radius:999px;background:${statusBg};color:${statusColor};font:600 11px ${SANS}`,
              )}
            >
              {p.active ? "À venda" : "Pausado"}
            </span>
          </span>
          <RowMenu menuKey={`produto:${p.id}`} actions={actions} width={214} />
        </div>
      ) : (
        <div style={css("display:flex;gap:9px;padding:12px 13px")}>
          {botaoFav}
          <div style={css("flex:1;min-width:0")}>
            <div
              style={css(
                `font:600 13.5px/1.3 ${SANS};color:${p.active ? "var(--text)" : "var(--muted)"}`,
              )}
            >
              {p.name}
            </div>
            <div style={css("display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:5px")}>
              <span style={css(`font:700 13px ${SANS};${NUM}`)}>{brl(p.price)}</span>
              <span
                style={css(
                  `padding:2px 8px;border-radius:999px;background:var(--surface3);color:var(--text2);font:600 10.5px ${SANS}`,
                )}
              >
                {p.category}
              </span>
              {!p.active && (
                <span
                  style={css(
                    `padding:2px 8px;border-radius:999px;background:${statusBg};color:${statusColor};font:600 10.5px ${SANS}`,
                  )}
                >
                  Pausado
                </span>
              )}
            </div>
            {stockCol === false && p.stock != null && (
              <div style={css(`margin-top:5px;font:500 11.5px ${SANS};color:${corEstoque}`)}>
                {p.stock === 0 ? "Sem estoque" : `${p.stock} ${p.unit} em estoque`}
                {p.minimum != null && ` · mín. ${p.minimum}`}
              </div>
            )}
          </div>
          <RowMenu menuKey={`produto:${p.id}`} actions={actions} width={214} />
        </div>
      )}
    </div>
  );
}
