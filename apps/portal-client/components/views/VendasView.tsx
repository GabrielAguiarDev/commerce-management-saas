"use client";

import { usePortal } from "@/components/PortalProvider";
import { RowMenu } from "@/components/ui";
import { NewButton, Button, TABLE_HEADER, ScreenHeader, css, PILL_GROUP, ClearFilters, LIST, MONO, NUM, PANEL, pill, columnLabel, SANS, Select, SimpleSelect, PANEL_TITLE, Empty } from "@aguiar/ui";
import { METHODS, PAYMENT_LABEL } from "@/lib/dados/vendas";
import { brl, qtdV, itemSummary, dateLabel, totalV } from "@/lib/formato";
import { POS_ROUTE } from "@/lib/rotas";
import { totalRevenue, itemsSold } from "@/lib/selectors";
import { BADGE_NEUTRAL, BADGE_WARN } from "@/lib/styleKit";
import type { SalesPeriod } from "@/types/estado";
import type { Sale } from "@/types/types";

const PERIODS: { key: SalesPeriod; name: string; days: number }[] = [
  { key: "today", name: "Hoje", days: 1 },
  { key: "7", name: "7 dias", days: 7 },
  { key: "30", name: "30 dias", days: 30 },
  { key: "all", name: "Tudo", days: 9999 },
];

const ALL_METHODS = "Todas as formas";
const ALL_PRODUCTS = "Todos os produtos";

/**
 * O histórico de vendas.
 *
 * Estorno não some da lista: fica riscado, com selo, fora dos totais. É o que
 * permite explicar ao contador por que o caderno e o portal divergem.
 */
export function VendasView() {
  const { s, a, has, isMobile, isDesktop, d } = usePortal();
  const f = s.fVendas;

  const days = PERIODS.find((p) => p.key === f.period)!.days;

  const inPeriod = d.sales.filter((v) => v.d < days);
  const filtered = inPeriod.filter((v) => {
    if (f.payment !== ALL_METHODS && v.payment !== f.payment) return false;
    if (f.product !== ALL_PRODUCTS && !v.items.some((i) => i.name === f.product)) return false;
    if (f.search.trim()) {
      const alvo = `${itemSummary(v.items)} ${PAYMENT_LABEL[v.payment]} ${v.time}`.toLowerCase();
      if (!alvo.includes(f.search.trim().toLowerCase())) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((x, y) => x.d - y.d || y.time.localeCompare(x.time));

  const total = totalRevenue(filtered);
  const valid = filtered.filter((v) => !v.refunded);
  const ticket = valid.length ? total / valid.length : 0;
  const refunded = filtered.filter((v) => v.refunded).length;

  const filterActive =
    f.payment !== ALL_METHODS || f.product !== ALL_PRODUCTS || f.search.trim() !== "";

  const productNames = Array.from(new Set(d.sales.flatMap((v) => v.items.map((i) => i.name)))).sort();

  const set = (p: Partial<typeof f>) => a.set({ fVendas: { ...f, ...p } });
  const clear = () => set({ payment: ALL_METHODS, product: ALL_PRODUCTS, search: "" });

  const kpis = [
    { label: "Faturamento", value: brl(total), note: `${valid.length} vendas no período`, color: "var(--text)" },
    { label: "Ticket médio", value: brl(ticket), note: "Por venda", color: "var(--text)" },
    { label: "Itens vendidos", value: String(itemsSold(filtered)), note: "Somando as quantidades", color: "var(--text)" },
    {
      label: "Estornadas",
      value: String(refunded),
      note: refunded ? "Fora do faturamento" : "Nenhuma no período",
      color: refunded ? "var(--warn)" : "var(--muted)",
    },
  ];

  // Colunas escondidas quando não cabem: no celular a linha vira cartão.
  const qtyCol = isDesktop;
  const paymentCol = isDesktop;
  const historyCols = `92px minmax(0,1fr)${qtyCol ? " 60px" : ""}${paymentCol ? " 110px" : ""} 110px 44px`;

  return (
    <div>
      <ScreenHeader
        title="Vendas"
        subtitle="Registre no balcão e consulte tudo o que já foi vendido."
        action={isDesktop ? <NewButton text="Registrar venda" onClick={() => a.goTo(POS_ROUTE)} /> : undefined}
      />

      <div
        style={css(
          `display:grid;grid-template-columns:${isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))"};grid-auto-rows:1fr;gap:12px;align-items:stretch`,
        )}
      >
        {kpis.map((k) => (
          <div
            key={k.label}
            style={css(
              `display:flex;flex-direction:column;justify-content:center;gap:3px;min-width:0;padding:11px 13px;` +
                "border:1px solid var(--border);border-radius:12px;background:var(--surface);box-shadow:var(--shadow)",
            )}
          >
            <div style={css("display:flex;align-items:center;gap:6px;min-width:0")}>
              <span style={css("flex:none;width:6px;height:6px;border-radius:2px;background:var(--accent)")} />
              <span
                style={css(
                  `min-width:0;font:500 11px/1.2 ${SANS};color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis`,
                )}
              >
                {k.label}
              </span>
            </div>
            <div
              style={css(
                `font:700 clamp(17px,1.7vw,21px)/1.2 ${SANS};${NUM};letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${k.color}`,
              )}
            >
              {k.value}
            </div>
            <div
              style={css(
                `font:500 10.5px/1.3 ${SANS};color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis`,
              )}
            >
              {k.note}
            </div>
          </div>
        ))}
      </div>

      <div style={css(`margin-top:12px;padding:18px;${PANEL}`)}>
        <div
          style={css(
            "display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px",
          )}
        >
          <h2 style={css(PANEL_TITLE)}>Histórico de vendas</h2>
          <span style={css(`font:500 11.5px ${SANS};color:var(--muted)`)}>
            {filtered.length} de {inPeriod.length} vendas
          </span>
        </div>

        <div style={css("display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px")}>
          <div style={css(PILL_GROUP)}>
            {PERIODS.map((p) => (
              <Button key={p.key} onClick={() => set({ period: p.key })} style={css(pill(f.period === p.key, "sm"))}>
                {p.name}
              </Button>
            ))}
          </div>

          <Select value={f.payment} onChange={(e) => set({ payment: e.target.value })}>
            <option value={ALL_METHODS}>{ALL_METHODS}</option>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_LABEL[m]}
              </option>
            ))}
          </Select>
          <SimpleSelect
            value={f.product}
            options={[ALL_PRODUCTS, ...productNames]}
            onChange={(v) => set({ product: v })}
          />

          <input
            value={f.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Buscar venda..."
            style={css(
              `flex:1;min-width:150px;padding:9px 13px;border:1px solid var(--border);border-radius:10px;background:var(--surface2);font:500 12.5px ${SANS};color:var(--text);outline:none`,
            )}
          />

          {filterActive && <ClearFilters text="Limpar filtros" onClick={clear} />}
        </div>

        {d.sales.length === 0 ? (
          <Empty
            title="Nenhuma venda por aqui ainda"
            text="Assim que você registrar a primeira venda, ela aparece aqui com valor, itens e forma de pagamento."
            action="Registrar primeira venda"
            onAction={() => a.goTo(POS_ROUTE)}
            standout
          />
        ) : sorted.length === 0 ? (
          <Empty
            title="Nada encontrado com esses filtros"
            text="Tente outro período ou limpe os filtros para ver todas as vendas."
            action="Limpar filtros"
            onAction={clear}
          />
        ) : (
          <div style={css(LIST + ";overflow:visible")}>
            {isDesktop && (
              <div style={css(`display:grid;grid-template-columns:${historyCols};gap:10px;${TABLE_HEADER}`)}>
                <span style={css(columnLabel())}>QUANDO</span>
                <span style={css(columnLabel())}>ITENS</span>
                {qtyCol && <span style={css(columnLabel("center"))}>QTD</span>}
                {paymentCol && <span style={css(columnLabel())}>PAGAMENTO</span>}
                <span style={css(columnLabel("right"))}>TOTAL</span>
                <span />
              </div>
            )}

            {sorted.map((v) => (
              <SaleRow key={v.id} sale={v} cols={historyCols} podeEditar={has("sales")} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SaleRow({
  sale: v,
  cols,
  podeEditar,
}: {
  sale: Sale;
  cols: string;
  podeEditar: boolean;
}) {
  const { a, isDesktop } = usePortal();
  const total = totalV(v);
  const risk = v.refunded ? "text-decoration:line-through;" : "";
  const color = v.refunded ? "var(--muted)" : "var(--text)";

  const actions = [
    { text: "Ver detalhes", onClick: () => a.openModal({ k: "saleDetail", id: v.id }) },
    ...(podeEditar && !v.refunded
      ? [
          { text: "Editar venda", onClick: () => a.editSale(v.id) },
          {
            text: "Estornar venda",
            color: "var(--danger)",
            onClick: () =>
              a.confirm({
                title: "Estornar esta venda?",
                text:
                  "A venda sai do faturamento e o estoque dos itens volta. Ela continua no histórico, riscada.",
                summary: itemSummary(v.items),
                detail: `${dateLabel(v.d, v.time)} · ${brl(total)} · ${PAYMENT_LABEL[v.payment]}`,
                reversal: "Dá para desfazer o estorno depois, pelo menu da própria venda.",
                button: "Estornar venda",
                buttonBg: "var(--danger)",
                buttonInk: "#fff",
                color: "var(--danger)",
                action: () => a.refundSale(v.id),
              }),
          },
        ]
      : []),
    ...(v.refunded
      ? [
          {
            text: "Desfazer estorno",
            color: "var(--warn)",
            onClick: () =>
              a.confirm({
                title: "Desfazer o estorno?",
                text: "A venda volta a contar no faturamento e o estoque dos itens é baixado de novo.",
                summary: itemSummary(v.items),
                detail: `${dateLabel(v.d, v.time)} · ${brl(total)}`,
                reversal: "Você pode estornar de novo quando quiser.",
                button: "Desfazer estorno",
                buttonBg: "var(--warn)",
                buttonInk: "#fff",
                color: "var(--warn)",
                action: () => a.undoRefund(v.id),
              }),
          },
        ]
      : []),
  ];

  return (
    <div style={css("position:relative;background:var(--surface)")}>
      {isDesktop ? (
        <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;align-items:center;padding:13px 14px`)}>
          <span style={css(`font:600 12px ${MONO};color:var(--text2);${NUM}`)}>
            {dateLabel(v.d, v.time)}
          </span>
          <span style={css("min-width:0")}>
            <span
              style={css(
                `display:block;font:500 13px/1.35 ${SANS};color:${color};${risk}white-space:nowrap;overflow:hidden;text-overflow:ellipsis`,
              )}
            >
              {itemSummary(v.items)}
            </span>
            {v.refunded && (
              <span style={css("display:flex;align-items:center;gap:6px;margin-top:4px")}>
                <span style={css(BADGE_WARN)}>Estornada</span>
              </span>
            )}
          </span>
          <span style={css(`text-align:center;font:600 12.5px ${MONO};color:var(--text2)`)}>{qtdV(v)}</span>
          <span>
            <span style={css(BADGE_NEUTRAL)}>{PAYMENT_LABEL[v.payment]}</span>
          </span>
          <span style={css(`text-align:right;font:700 13.5px ${SANS};${NUM};color:${color};${risk}`)}>
            {brl(total)}
          </span>
          <RowMenu menuKey={`venda:${v.id}`} actions={actions} />
        </div>
      ) : (
        <div style={css("display:flex;gap:10px;padding:13px 14px")}>
          <div style={css("flex:1;min-width:0")}>
            <div style={css("display:flex;align-items:center;gap:7px;flex-wrap:wrap")}>
              <span style={css(`font:600 11.5px ${MONO};color:var(--muted)`)}>
                {dateLabel(v.d, v.time)}
              </span>
              {v.refunded && <span style={css(BADGE_WARN)}>Estornada</span>}
            </div>
            <div style={css(`margin-top:4px;font:600 13.5px/1.35 ${SANS};color:${color};${risk}`)}>
              {itemSummary(v.items)}
            </div>
            <div style={css("margin-top:7px;display:flex;align-items:center;gap:8px")}>
              <span style={css(BADGE_NEUTRAL)}>{PAYMENT_LABEL[v.payment]}</span>
              <span style={css(`font:500 11.5px ${SANS};color:var(--muted)`)}>
                {qtdV(v)} {qtdV(v) === 1 ? "item" : "itens"}
              </span>
            </div>
          </div>
          <div
            style={css("flex:none;display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;gap:8px")}
          >
            <span style={css(`font:700 15px ${SANS};${NUM};color:${color};${risk}`)}>{brl(total)}</span>
            <RowMenu menuKey={`venda:${v.id}`} actions={actions} />
          </div>
        </div>
      )}
    </div>
  );
}
