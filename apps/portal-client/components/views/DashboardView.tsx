"use client";

import { usePortal } from "@/components/PortalProvider";
import { Button, css, MONO, NUM, PANEL, SANS, PANEL_TITLE, SCREEN_TITLE } from "@aguiar/ui";
import { MetricCard, type MetricCardProps } from "@/components/dashboard/MetricCard";
import { SuggestedModuleCard } from "@/components/dashboard/SuggestedModuleCard";
import { MODULES } from "@/lib/dados/perfis";
import { PAYMENT_LABEL } from "@/lib/dados/vendas";
import { brl, shortBrl, longDate, weekday, dateLabel, greeting, totalV } from "@/lib/formato";
import { layoutDaGrade } from "@/lib/grid";
import { suggestedModule } from "@/lib/modulos";
import { POS_ROUTE, ROUTES } from "@/lib/rotas";
import {
  costOfSales,
  cashInDrawer,
  totalRevenue,
  itemsSold,
  productsOutOfStock,
  costsTotal,
} from "@/lib/selectors";
import type { ModuleKey } from "@/types/types";

/**
 * O resumo de hoje.
 *
 * Os cartões e os atalhos são montados a partir dos módulos do plano — quem não
 * tem Estoque nem Caixa não vê esses números, em vez de vê-los zerados. É a
 * mesma regra que monta o menu lateral.
 */
export function DashboardView() {
  const { a, has, isMobile, d } = usePortal();

  const today = d.sales.filter((v) => v.d === 0);
  const revenueToday = totalRevenue(today);
  const costToday = costOfSales(today, d.products);
  const costsToday = d.costs.filter((c) => c.d === 0).reduce((x, c) => x + c.amount, 0);
  const profitToday = revenueToday - costToday - costsToday;
  const month = totalRevenue(d.sales.filter((v) => v.d < 30));
  const outOfStock = productsOutOfStock(d.products);

  /**
   * A ORDEM DESTE ARRAY É DECISÃO DE LAYOUT, não só de leitura.
   *
   * A grade fecha a última linha esticando os ÚLTIMOS itens (ver
   * `distribuirSpans`), então o fim do array é onde a largura extra cai. Por
   * isso: as métricas que a pessoa vem buscar primeiro — Faturamento e Lucro —
   * ficam no começo, onde a largura é a de sempre e a leitura começa; e o fim
   * fica reservado para quem aproveita largura, o cartão de sugestão quando ele
   * existe e, na falta dele, um cartão textual como "Estoque baixo", que tem
   * nomes de produto para mostrar em vez de um número só.
   *
   * Mover um item daqui muda quem estica. Antes de reordenar, olhe a tabela de
   * `lib/grid.ts` para a contagem em questão.
   */
  const kpis: MetricCardProps[] = [
    {
      label: "Faturamento hoje",
      value: brl(revenueToday),
      note: `Em ${today.filter((v) => !v.refunded).length} vendas`,
      color: "var(--text)",
      dot: "var(--pos)",
    },
  ];

  if (has("costs")) {
    kpis.push({
      label: "Custos de hoje",
      value: brl(costsToday),
      note: costsToday > 0 ? "Lançados por você" : "Nada lançado ainda",
      color: "var(--text)",
      dot: "var(--warn)",
    });
  }

  if (has("costs") || has("reports")) {
    const margin = revenueToday > 0 ? (profitToday / revenueToday) * 100 : 0;
    kpis.push({
      label: "Lucro hoje",
      value: brl(profitToday),
      note: revenueToday > 0 ? `Margem de ${margin.toFixed(0)}%` : "Sem vendas ainda",
      color: profitToday >= 0 ? "var(--pos)" : "var(--danger)",
      dot: "var(--accent)",
    });
  }

  kpis.push({
    label: "Itens vendidos",
    value: String(itemsSold(today)),
    note: `Em ${today.filter((v) => !v.refunded).length} vendas`,
    color: "var(--text)",
    dot: "var(--petrol)",
  });

  kpis.push({
    label: "Faturamento do mês",
    value: brl(month),
    note: has("costs")
      ? `Custos: ${brl(costsTotal(d.costs, 30))}`
      : `${d.sales.filter((v) => v.d < 30 && !v.refunded).length} vendas no período`,
    color: "var(--text)",
    dot: "var(--muted)",
  });

  if (has("register")) {
    kpis.push({
      label: "Caixa",
      value: d.openRegister ? "Aberto" : "Fechado",
      note: d.openRegister
        ? `Desde ${d.openRegister.openedAt} · ${brl(cashInDrawer(d))} na gaveta`
        : "Abra o caixa para começar o dia",
      color: d.openRegister ? "var(--pos)" : "var(--muted)",
      dot: d.openRegister ? "var(--pos)" : "var(--border2)",
    });
  }

  if (has("stock")) {
    kpis.push({
      label: "Estoque baixo",
      value: outOfStock.length ? `${outOfStock.length} ${outOfStock.length === 1 ? "item" : "itens"}` : "Em dia",
      note: outOfStock.length
        ? outOfStock
            .slice(0, 2)
            .map((p) => p.name)
            .join(", ") + (outOfStock.length > 2 ? ` e mais ${outOfStock.length - 2}` : "")
        : "Nada para repor agora",
      color: outOfStock.length ? "var(--warn)" : "var(--pos)",
      dot: outOfStock.length ? "var(--warn)" : "var(--pos)",
    });
  }

  // Últimos 7 dias, do mais antigo para hoje — a leitura natural de um gráfico.
  const days = [6, 5, 4, 3, 2, 1, 0];
  const bars = days.map((dia) => ({
    d: dia,
    dia: weekday(dia),
    amount: totalRevenue(d.sales.filter((v) => v.d === dia)),
  }));
  const largest = Math.max(...bars.map((b) => b.amount), 1);
  const average = bars.reduce((x, b) => x + b.amount, 0) / bars.length;

  const shortcuts: { initials: string; name: string; rota: string; module: ModuleKey }[] = [];
  if (has("sales")) shortcuts.push({ initials: "NV", name: "Nova venda", rota: POS_ROUTE, module: "sales" });
  if (has("costs")) shortcuts.push({ initials: "CU", name: "Registrar custo", rota: ROUTES.costs, module: "costs" });
  if (has("register")) shortcuts.push({ initials: "CX", name: d.openRegister ? "Fechar caixa" : "Abrir caixa", rota: ROUTES.register, module: "register" });
  if (has("stock")) shortcuts.push({ initials: "ET", name: "Ajustar estoque", rota: ROUTES.stock, module: "stock" });
  if (has("reports") && shortcuts.length < 4) shortcuts.push({ initials: "RL", name: "Ver relatório", rota: ROUTES.reports, module: "reports" });
  if (has("settings") && shortcuts.length < 4) shortcuts.push({ initials: "CF", name: "Configurações", rota: ROUTES.settings, module: "settings" });

  const latest = today.slice(0, 4);

  /**
   * O módulo que este cliente ainda não tem, e que vale oferecer.
   *
   * `null` para quem já tem tudo — e aí a grade fica só com os números, que
   * fecham a última linha entre si do mesmo jeito. Sai de uma ordem de
   * prioridade fixa, e não de um sorteio: o cartão não pode trocar de módulo a
   * cada navegação.
   */
  const suggestion = suggestedModule(d.business.catalog, d.business.modules);

  /**
   * A grade, calculada aqui e escolhida pelo CSS.
   *
   * A sugestão conta como mais um item: a última linha se fecha sobre o total,
   * e não sobre os números com um apêndice depois. `layoutDaGrade` devolve as
   * DUAS contas — desktop e celular — porque a largura da janela só é conhecida
   * no navegador, e escolher aqui faria a grade saltar de quatro colunas para
   * duas no segundo quadro. As variáveis descem para o CSS, e a media query de
   * `globals.css` decide antes do primeiro pixel.
   *
   * NÃO HÁ RAMO `grid-column: 1 / -1` PARA A SUGESTÃO, e não é esquecimento. Ele
   * existiria para o caso em que os números fecham a linha exata e a sugestão
   * sobraria sozinha na seguinte — mas isso é `total % colunas === 1`, que é
   * justamente a fração de 100% que `melhorNumeroDeColunas` evita ao escolher
   * entre quatro e três colunas. E se acontecesse, `span` já seria igual ao
   * número de colunas, que renderiza exatamente igual a `1 / -1`. O ramo seria
   * código morto com cara de regra.
   */
  const grade = layoutDaGrade(kpis.length + (suggestion ? 1 : 0));

  const panelCols = isMobile ? "1fr" : "minmax(0,1.6fr) minmax(0,1fr)";

  return (
    <div>
      <div
        style={css(
          "display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px",
        )}
      >
        <div>
          <h1 style={css(SCREEN_TITLE)}>Resumo de hoje</h1>
          <p style={css(`margin:5px 0 0;font:400 13.5px/1.45 ${SANS};color:var(--muted)`)}>
            {greeting()} — {longDate()}
          </p>
        </div>

      </div>

      <div
        className="kpi-grid"
        style={css(`--cols-d:${grade.colunasDesktop};--cols-m:${grade.colunasMobile}`)}
      >
        {kpis.map((k, i) => (
          <MetricCard
            key={k.label}
            {...k}
            spanDesktop={grade.spansDesktop[i]}
            spanMobile={grade.spansMobile[i]}
          />
        ))}
        {suggestion && (
          <SuggestedModuleCard
            module={suggestion}
            spanDesktop={grade.spansDesktop[kpis.length]}
            spanMobile={grade.spansMobile[kpis.length]}
          />
        )}
      </div>

      <div style={css(`display:grid;grid-template-columns:${panelCols};gap:12px;margin-top:12px`)}>
        <div style={css(`display:flex;flex-direction:column;padding:18px;${PANEL}`)}>
          <div
            style={css("flex:none;display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap")}
          >
            <h2 style={css(PANEL_TITLE)}>Vendas dos últimos 7 dias</h2>
            <span style={css(`font:500 11.5px ${SANS};color:var(--muted)`)}>
              Valores em R$ · média {shortBrl(average)} / dia
            </span>
          </div>

          <div
            style={css(
              `flex:1;display:flex;align-items:flex-end;gap:${isMobile ? "5px" : "10px"};min-height:190px;margin-top:18px`,
            )}
          >
            {bars.map((b) => (
              <div
                key={b.d}
                style={css("flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;height:100%")}
              >
                <span
                  style={css(
                    `flex:none;white-space:nowrap;font:600 11px ${MONO};color:var(--muted);${NUM}`,
                  )}
                >
                  {b.amount > 0 ? shortBrl(b.amount) : "—"}
                </span>
                <span style={css("flex:1;min-height:0;width:100%;display:flex;align-items:flex-end")}>
                  <span
                    style={css(
                      "flex:none;width:100%;border-radius:7px 7px 3px 3px;min-height:6px;transition:height .3s ease;" +
                        `background:${b.d === 0 ? "var(--accent)" : "var(--accent-soft)"};` +
                        `height:${Math.max((b.amount / largest) * 100, 3)}%`,
                    )}
                  />
                </span>
                <span
                  style={css(
                    `flex:none;font:600 11px ${SANS};color:${b.d === 0 ? "var(--accent)" : "var(--muted)"}`,
                  )}
                >
                  {b.dia}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={css("display:flex;flex-direction:column;gap:12px")}>
          <div style={css(`padding:18px;${PANEL}`)}>
            <h2 style={css(`margin:0 0 14px;font:600 15px/1.2 ${SANS}`)}>Atalhos</h2>
            <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:8px")}>
              {shortcuts.map((x) => (
                <Button
                  key={x.name}
                  onClick={() => a.goTo(x.rota)}
                  className="hv-linha"
                  style={css(
                    "display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid var(--border);" +
                      "border-radius:11px;background:var(--surface2);text-align:left",
                  )}
                >
                  <span
                    style={css(
                      "width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;" +
                        `font:600 10px ${MONO};background:var(--accent-soft);color:var(--accent-text)`,
                    )}
                  >
                    {x.initials}
                  </span>
                  <span style={css(`font:600 12.5px/1.3 ${SANS};color:var(--text)`)}>{x.name}</span>
                </Button>
              ))}
            </div>
          </div>

          <div
            style={css(
              "padding:16px;border:1px dashed var(--border2);border-radius:14px;background:var(--surface2)",
            )}
          >
            <div style={css(`font:600 12.5px/1.3 ${SANS};color:var(--text2)`)}>
              Este customer has {Object.keys(MODULES).filter((m) => has(m as ModuleKey)).length} módulos
              active
            </div>
            <p style={css(`margin:6px 0 0;font:400 12px/1.5 ${SANS};color:var(--muted)`)}>
              O dashboard e o menu montam-se sozinhos: quem não tem Estoque ou Caixa não vê esses cards
              nem esses items. Troque o perfil demo acima para comparar.
            </p>
          </div>
        </div>
      </div>

      <div style={css(`margin-top:12px;padding:18px;${PANEL}`)}>
        <div
          style={css(
            "display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px",
          )}
        >
          <div>
            <h2 style={css(`margin:0 0 4px;font:600 15px/1.2 ${SANS}`)}>Últimas vendas de hoje</h2>
            <p style={css(`margin:0;font:400 12px ${SANS};color:var(--muted)`)}>
              Registro em tempo real do balcão.
            </p>
          </div>
          <Button
            onClick={() => a.goTo(ROUTES.sales)}
            className="hv-acc-borda"
            style={css(
              `padding:8px 14px;border-radius:9px;border:1px solid var(--border);background:var(--surface2);color:var(--accent-text);font:600 12.5px ${SANS}`,
            )}
          >
            Ver todas
          </Button>
        </div>

        {latest.length === 0 ? (
          <div
            style={css(
              `padding:30px 18px;border:1px dashed var(--border2);border-radius:12px;background:var(--surface2);text-align:center;font:500 13px/1.5 ${SANS};color:var(--muted)`,
            )}
          >
            Nenhuma sale registrada hoje ainda.
          </div>
        ) : (
          <div
            style={css(
              "display:flex;flex-direction:column;gap:1px;background:var(--border);border:1px solid var(--border);border-radius:11px;overflow:hidden",
            )}
          >
            {latest.map((v) => (
              <div
                key={v.id}
                style={css("display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--surface)")}
              >
                <span style={css(`flex:none;font:600 11.5px ${MONO};color:var(--muted);${NUM}`)}>
                  {v.time}
                </span>
                <span
                  style={css(
                    `flex:1;min-width:0;font:500 13px ${SANS};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;` +
                      (v.refunded ? "text-decoration:line-through;color:var(--muted)" : ""),
                  )}
                >
                  {v.items.map((i) => (i.qtd > 1 ? `${i.qtd}× ${i.name}` : i.name)).join(", ")}
                </span>
                {!isMobile && (
                  <span
                    style={css(
                      `flex:none;padding:3px 9px;border-radius:999px;background:var(--surface3);color:var(--text2);font:600 11px ${SANS}`,
                    )}
                  >
                    {PAYMENT_LABEL[v.payment]}
                  </span>
                )}
                <span
                  style={css(
                    `flex:none;font:700 13.5px ${SANS};${NUM};` +
                      (v.refunded ? "text-decoration:line-through;color:var(--muted)" : ""),
                  )}
                >
                  {brl(totalV(v))}
                </span>
              </div>
            ))}
          </div>
        )}
        <p style={css(`margin:10px 0 0;font:500 11.5px ${SANS};color:var(--muted)`)}>
          Última movimentação: {latest[0] ? dateLabel(0, latest[0].time) : "—"}
        </p>
      </div>
    </div>
  );
}
