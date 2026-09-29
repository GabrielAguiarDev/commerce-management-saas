"use client";

import { useRouter } from "next/navigation";
import { usePortal } from "@/components/PortalProvider";
import { RowMenu } from "@/components/ui";
import { NewButton, Button, TABLE_HEADER, ScreenHeader, css, KpiStrip, ClearFilters, LIST, MONO, NUM, columnLabel, SANS, SimpleSelect, Empty } from "@aguiar/ui";
import { competenceLabel, costCategories, COST_TYPE_STYLE } from "@/lib/dados/custos";
import { brl, dateLabel } from "@/lib/formato";
import { describeCostQueueError, type QueuedCost } from "@/lib/offline/costQueue";
import { discardQueuedCost, retryQueuedCost, useQueuedCosts } from "@/lib/offline/costQueueStore";
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
  const queue = useQueuedCosts(d.business.id, d.business.user.id);
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
  const totalReal = variable + fixed;
  const revenue = totalRevenue(d.sales.filter((v) => v.d < days));
  const peso = revenue > 0 ? (totalReal / revenue) * 100 : 0;

  const filterActive = f.type !== ALL_TYPES || f.cat !== ALL_CATEGORIES || f.period !== "Este mês";

  const kpis = [
    { label: "Total do período", value: brl(totalReal), note: "Lançamentos no período" },
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

      {queue.costs.length > 0 && <FilaCustos costs={queue.costs} syncing={queue.syncing} />}

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
              `flex:none;padding:3px 9px;border-radius:999px;background:var(--accent-soft);color:var(--accent-text);font:600 10.5px ${SANS}`,
            )}
          >
            Estoque
          </span>
          <p style={css(`margin:0;font:500 12px/1.5 ${SANS};color:var(--text2)`)}>
            As compras de mercadoria que você lança no Estoque entram aqui sozinhas como custo
            variável. Para corrigir uma delas, ajuste a entrada no Estoque — assim o valor não é
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
  const competence = competenceLabel(c.competence);

  // Só uma série ativa muda "daqui em diante"; a encerrada se comporta como
  // um lançamento comum.
  const repeating = c.recurring && c.seriesActive;

  const actions = [
    { text: "Editar custo", onClick: () => a.openCost(c.id) },
    {
      text: repeating ? "Excluir e parar de repetir" : "Excluir custo",
      color: "var(--danger)",
      onClick: () =>
        a.confirm({
          title: repeating ? "Excluir e parar de repetir?" : "Excluir este custo?",
          text: repeating
            ? "Este mês e os seguintes já lançados saem do total, e o custo deixa de ser lançado todo mês. Os meses anteriores continuam no histórico."
            : "Ele sai do total do período e do cálculo do lucro.",
          summary: c.description,
          detail: `${brl(c.amount)} · ${dateLabel(c.d, "")} · ${c.category}`,
          reversal: repeating
            ? "Isto não pode ser desfeito — para voltar a repetir, lance o custo de novo."
            : "Isto não pode ser desfeito — você teria de lançar de novo.",
          button: repeating ? "Excluir e parar" : "Excluir custo",
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
            `padding:2px 7px;border-radius:999px;background:var(--accent-soft);color:var(--accent-text);font:600 10px ${SANS}`,
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
          {c.seriesActive ? "repete todo mês" : "repetição encerrada"}
          {competence ? ` · ${competence}` : ""}
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
            <RowMenu menuKey={`custo:${c.id}`} actions={actions} width={200} />
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
                <RowMenu menuKey={`custo:${c.id}`} actions={actions} width={200} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Os custos lançados sem conexão que o servidor ainda não viu.
 *
 * Ficam acima dos números porque NÃO entram neles: o total do período, o peso
 * na receita e o lucro são os do servidor. Pendente é enviado sozinho; recusado
 * fica parado até alguém tentar de novo ou descartar.
 */
function FilaCustos({ costs, syncing }: { costs: QueuedCost[]; syncing: boolean }) {
  const { a, d } = usePortal();
  const router = useRouter();
  const scope = { tenantId: d.business.id, userId: d.business.user.id };
  const failed = costs.filter((c) => c.status === "failed").length;
  const total = costs.reduce((sum, c) => sum + c.amount, 0);

  const tentar = async (clientId: string) => {
    const r = await retryQueuedCost(clientId, scope);
    if (r.sent) {
      a.notify("Custo guardado enviado");
      router.refresh();
    } else if (!r.failed) {
      a.notify("Ainda sem conexão com o servidor — o custo continua guardado", "warn");
    }
  };

  return (
    <section
      aria-label="Custos guardados neste computador"
      style={css(
        `margin-bottom:12px;padding:13px 14px;border:1px solid ${failed ? "var(--danger)" : "var(--warn-line)"};` +
          `border-radius:14px;background:var(--warn-soft)`,
      )}
    >
      <div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap")}>
        <h2 style={css(`margin:0;font:700 13.5px/1.3 ${SANS};color:var(--warn)`)}>
          {costs.length} {costs.length === 1 ? "custo guardado" : "custos guardados"} neste computador · {brl(total)}
        </h2>
        <span style={css(`font:500 11.5px ${SANS};color:var(--text2)`)}>
          {syncing ? "Enviando…" : "Ainda não entraram nos totais abaixo."}
        </span>
      </div>

      <div style={css("display:flex;flex-direction:column;gap:7px;margin-top:10px")}>
        {costs.map((c) => {
          const isFailed = c.status === "failed";
          const resumo = `${c.description}${c.category ? ` · ${c.category}` : ""}`;
          return (
            <div
              key={c.clientId}
              style={css(
                "display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:9px 11px;border-radius:11px;" +
                  `border:1px solid ${isFailed ? "var(--danger)" : "var(--border)"};background:var(--surface)`,
              )}
            >
              <span style={css("flex:1;min-width:200px")}>
                <span style={css(`display:block;font:600 12.5px/1.35 ${SANS}`)}>
                  <span style={css(`font:600 11.5px ${MONO};color:var(--muted)`)}>
                    {c.costDate.slice(8, 10)}/{c.costDate.slice(5, 7)}
                  </span>{" "}
                  · {resumo}
                </span>
                <span
                  style={css(
                    `display:block;margin-top:2px;font:500 11.5px/1.4 ${SANS};` +
                      `color:${isFailed ? "var(--danger)" : "var(--muted)"}`,
                  )}
                >
                  {isFailed ? "Recusado: " : "Pendente: "}
                  {describeCostQueueError(c.lastError, c.status)}
                </span>
              </span>
              <span style={css(`font:700 13px ${SANS};${NUM}`)}>{brl(c.amount)}</span>
              <span style={css("display:flex;gap:6px")}>
                <Button
                  onClick={() => tentar(c.clientId)}
                  disabled={syncing}
                  style={css(
                    "padding:7px 10px;border-radius:9px;border:1px solid var(--border2);" +
                      `background:var(--surface2);color:var(--text2);font:600 12px ${SANS}`,
                  )}
                >
                  {isFailed ? "Tentar de novo" : "Enviar agora"}
                </Button>
                <Button
                  onClick={() =>
                    a.confirm({
                      title: "Descartar este custo guardado?",
                      text: "Ele nunca chegou ao sistema. Descartar apaga o custo deste computador — os totais não mudam.",
                      summary: `${resumo} · ${brl(c.amount)}`,
                      detail: isFailed
                        ? describeCostQueueError(c.lastError, c.status)
                        : "O custo ainda seria enviado automaticamente.",
                      reversal: "Não dá para desfazer. Se o gasto aconteceu, lance-o de novo.",
                      button: "Descartar custo",
                      buttonBg: "var(--danger)",
                      buttonInk: "#fff",
                      color: "var(--danger)",
                      action: async () => {
                        await discardQueuedCost(c.clientId);
                        a.closeConfirm();
                        a.notify("Custo guardado descartado", "warn");
                      },
                    })
                  }
                  disabled={syncing}
                  style={css(
                    "padding:7px 10px;border-radius:9px;border:1px solid var(--danger);" +
                      `background:var(--surface);color:var(--danger);font:600 12px ${SANS}`,
                  )}
                >
                  Descartar
                </Button>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
