"use client";

import { useAdmin } from "@/components/AdminProvider";
import { Button, SearchField, css, MENU_ITEM, ActionsMenu, MONO } from "@aguiar/ui";
import { BaixarIcone, FinanceiroIcone } from "@/lib/icons";
import {
  computeMrr,
  billable,
  countByStatus,
  isBillable,
  formatCash,
  formatMrr,
  paymentInfo,
  sumByStatus,
} from "@/lib/money";
import { planByKey } from "@/lib/planos";
import { MetricsGrid, type Metric } from "@/components/shared";
import { avatar, planName, planBadge, panelBadge } from "@/lib/styleKit";
import { chip, initials, dot } from "@aguiar/ui";

const PAYMENT_GRID =
  "minmax(190px,1.7fr) 110px 110px 110px 120px 120px 74px";

export function FinanceiroView() {
  const { s, a, cs, empty } = useAdmin();
  const { L } = a;
  const id = s.language;

  // Below this width the table becomes a stack of cards.
  const compact = s.screenWidth < 1000;

  const mrr = computeMrr(cs);
  const billableCustomers = billable(cs);
  const recebido = sumByStatus(cs, s.payments, "emdia");
  const open = sumByStatus(cs, s.payments, "pendente");
  const overdueTotal = sumByStatus(cs, s.payments, "atrasado");
  const onTimeCount = countByStatus(cs, s.payments, "emdia");
  const pendingCount = countByStatus(cs, s.payments, "pendente");
  const overdueCount = countByStatus(cs, s.payments, "atrasado");
  const neutro = panelBadge("neutral");

  const metrics: Metric[] = [
    {
      label: L.mrrAtual,
      value: formatMrr(mrr),
      // Sem histórico de faturamento no banco não existe "vs mês anterior" —
      // o protótipo mostrava +18,7% fixo. Aqui vai a fração da base que paga.
      delta: empty ? "—" : `${billableCustomers.length}/${cs.length}`,
      note: billableCustomers.length + " " + L.clientesCobraveis,
      dot: dot(empty ? "var(--border)" : "var(--pos)"),
      deltaStyle: empty ? neutro : panelBadge("pos"),
    },
    {
      label: L.recebidoMes,
      value: formatCash(recebido),
      delta: Math.round((recebido / Math.max(1, mrr)) * 100) + "%",
      note: onTimeCount + " " + L.recebidoNota,
      dot: dot(empty ? "var(--border)" : "var(--pos)"),
      deltaStyle: empty ? neutro : panelBadge("acc"),
    },
    {
      label: L.aReceber,
      value: formatCash(open),
      delta: String(pendingCount),
      note: id === "pt" ? "pagamentos pendentes no período" : "pending payments in the period",
      dot: dot(empty ? "var(--border)" : "var(--warn)"),
      deltaStyle: empty ? neutro : panelBadge("warn"),
    },
    {
      label: L.inadimplentes,
      value: overdueCount,
      delta: formatCash(overdueTotal),
      note: id === "pt" ? "clientes com vencimento passado" : "customers past due",
      dot: dot(empty ? "var(--border)" : "var(--danger)"),
      deltaStyle: empty ? neutro : panelBadge("danger"),
    },
  ];

  // Todo mês do período aparece no gráfico, inclusive os zerados (ver
  // `lib/pagamentos.ts`). Sem o piso de 1, um período inteiro sem receita daria
  // divisão por zero e barras com altura NaN.
  const maxRevenue = Math.max(1, ...s.revenue.map((g) => g.amount));

  const qp = s.buscaPag.trim().toLowerCase();
  const rows = cs.filter((x) => {
    if (qp && !x.name.toLowerCase().includes(qp)) return false;
    if (s.paymentFilter === "all") return true;
    // Quem não é cobrado não tem status de pagamento para filtrar.
    return isBillable(x) && paymentInfo(s.payments, x.id).status === s.paymentFilter;
  });

  const exportar = () => {
    const cabecalho = [
      L.business,
      L.plan,
      L.valorMensal,
      L.statusPagamento,
      L.ultimoPagamento,
      L.proxVencimento,
    ].join(";");
    const corpo = rows.map((x) => {
      const p = paymentInfo(s.payments, x.id);
      const grat = !isBillable(x);
      return [
        x.name,
        planName(s.plans, x.plan, id),
        grat ? "-" : x.amount,
        grat
          ? L.semCobranca
          : p.status === "emdia"
            ? L.emDia
            : p.status === "atrasado"
              ? L.atrasado
              : L.pendente,
        grat ? "-" : p.latest,
        grat ? "-" : p.vencimento,
      ].join(";");
    });
    a.baixarCsv([cabecalho, ...corpo], "aguiar-one-financeiro.csv");
  };

  const rotuloCampo =
    "font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:600";

  const paymentMenu = (customerId: string, paid: boolean) => (
    <ActionsMenu
      open={s.paymentMenu === customerId}
      onOpenChange={(v) => a.set({ paymentMenu: v ? customerId : null })}
      label={L.actions}
      minWidth={184}
    >
      <Button
        onClick={() => a.openModal(paid ? "undo" : "pay", customerId)}
        role="menuitem"
        className="hv-menu"
        style={css(MENU_ITEM + "color:var(--text2)")}
      >
        {paid ? L.undoPayment : L.markPaid}
      </Button>
      <Button
        onClick={() => a.openModal("history", customerId)}
        role="menuitem"
        className="hv-menu"
        style={css(MENU_ITEM + "color:var(--text2)")}
      >
        {L.verHistorico}
      </Button>
    </ActionsMenu>
  );

  return (
    <div style={css("display:flex;flex-direction:column;gap:20px")}>
      <MetricsGrid metrics={metrics} />

      <section
        style={css(
          "background:var(--surface);border:1px solid var(--border);border-radius:12px;" +
            "padding:20px 22px 18px;display:flex;flex-direction:column;gap:18px",
        )}
      >
        <div style={css("display:flex;flex-direction:column;gap:3px")}>
          <h2 style={css("margin:0;font-size:14px;font-weight:600;color:var(--text)")}>
            {L.receitaEvolucao}
          </h2>
          <span style={css("font-size:11.5px;color:var(--muted)")}>{L.receitaSub}</span>
        </div>
        <div style={css("display:flex;align-items:flex-end;gap:14px;height:172px;padding-top:6px")}>
          {(empty ? [] : s.revenue).map((g, i) => (
            <div
              key={g.month.pt}
              style={css(
                "flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;" +
                  "height:100%;justify-content:flex-end",
              )}
            >
              <span style={css(`font-family:${MONO};font-size:11px;color:var(--text2)`)}>
                {formatCash(g.amount)}
              </span>
              <div
                style={css(
                  "width:100%;max-width:54px;border-radius:7px 7px 3px 3px;background:" +
                    // The most recent month is the filled bar.
                    (i === s.revenue.length - 1 ? "var(--accent)" : "var(--accent-soft)") +
                    ";border:1px solid var(--accent-line);height:" +
                    Math.round((g.amount / maxRevenue) * 118) +
                    "px",
                )}
              />
              <span
                style={css(
                  "font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em",
                )}
              >
                {g.month[id]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section
        style={css(
          "background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:visible",
        )}
      >
        <div
          style={css(
            "display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:15px 20px;" +
              "border-bottom:1px solid var(--border-soft)",
          )}
        >
          <div style={css("display:flex;flex-direction:column;gap:3px;margin-right:6px")}>
            <h2 style={css("margin:0;font-size:14px;font-weight:600;color:var(--text)")}>
              {L.pagamentosTitulo}
            </h2>
            <span
              style={css(
                "display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--muted)",
              )}
            >
              <span
                style={css("width:6px;height:6px;border-radius:99px;background:var(--warn)")}
              />
              {L.registroManual}
            </span>
          </div>

          <SearchField
            value={s.buscaPag}
            onChange={(v) => a.set({ buscaPag: v })}
            placeholder={L.buscarPagamento}
            boxCssText="flex:1;min-width:180px;max-width:260px;"
            compact
          />

          <div style={css("display:flex;gap:6px;flex-wrap:wrap")}>
            {(
              [
                ["all", L.todosChamados],
                ["emdia", L.emDia],
                ["atrasado", L.atrasado],
                ["pendente", L.pendente],
              ] as const
            ).map(([k, label]) => (
              <Button
                key={k}
                onClick={() => a.set({ paymentFilter: k })}
                style={css(chip(s.paymentFilter === k))}
              >
                {label}
              </Button>
            ))}
          </div>

          <div style={css("margin-left:auto")}>
            <Button
              onClick={exportar}
              className="hv-acc-borda"
              style={css(
                "display:flex;align-items:center;gap:7px;background:var(--surface);" +
                  "border:1px solid var(--border);color:var(--text2);font-size:12.5px;font-weight:500;" +
                  "padding:9px 13px;border-radius:9px;cursor:pointer;white-space:nowrap",
              )}
            >
              <BaixarIcone />
              {L.exportarCsv}
            </Button>
          </div>
        </div>

        {!compact && (
          <div
            style={css(
              "display:grid;grid-template-columns:" +
                PAYMENT_GRID +
                ";gap:12px;padding:10px 20px;background:var(--surface2);" +
                "border-bottom:1px solid var(--border-soft);font-size:10.5px;letter-spacing:.07em;" +
                "text-transform:uppercase;color:var(--muted);font-weight:600",
            )}
          >
            <span>{L.business}</span>
            <span>{L.plan}</span>
            <span>{L.valorMensal}</span>
            <span>{L.statusPagamento}</span>
            <span>{L.ultimoPagamento}</span>
            <span>{L.proxVencimento}</span>
            <span style={css("text-align:right")}>{L.actions}</span>
          </div>
        )}

        {(empty ? [] : rows).map((x) => {
          const p = paymentInfo(s.payments, x.id);
          // "Gratuito" é não ter mensalidade — não é a chave do plano.
          const grat = !isBillable(x);
          const paid = p.status === "emdia";

          const statusText = grat
            ? L.semCobranca
            : paid
              ? L.emDia
              : p.status === "atrasado"
                ? L.atrasado
                : L.pendente;
          const statusStyle = grat
            ? panelBadge("neutral")
            : paid
              ? panelBadge("pos")
              : p.status === "atrasado"
                ? panelBadge("danger")
                : panelBadge("warn");
          const dueStyle =
            `font-family:${MONO};font-size:11.5px;color:` +
            (!grat && p.status === "atrasado" ? "var(--danger)" : "var(--muted)");
          const standout = !grat && p.status === "atrasado" ? "background:var(--surface2);" : "";

          return (
            <div
              key={x.id}
              className="hv-linha"
              style={css(
                compact
                  ? "display:flex;flex-direction:column;gap:12px;padding:15px 16px;" +
                      "border-bottom:1px solid var(--border-soft);" +
                      standout
                  : "display:grid;grid-template-columns:" +
                      PAYMENT_GRID +
                      ";gap:12px;align-items:center;padding:13px 20px;" +
                      "border-bottom:1px solid var(--border-soft);" +
                      standout,
              )}
            >
              <div style={css("display:flex;align-items:center;gap:11px;min-width:0")}>
                <div style={css(avatar(planByKey(s.plans, x.plan)))}>{initials(x.name)}</div>
                <span
                  style={css(
                    "font-size:13.5px;font-weight:500;color:var(--text);white-space:nowrap;" +
                      "overflow:hidden;text-overflow:ellipsis",
                  )}
                >
                  {x.name}
                </span>
                {compact && (
                  <div style={css("margin-left:auto;display:flex")}>
                    {paymentMenu(x.id, paid)}
                  </div>
                )}
              </div>

              {!compact && (
                <>
                  <span style={css(planBadge(planByKey(s.plans, x.plan)))}>{planName(s.plans, x.plan, id)}</span>
                  <span style={css(`font-family:${MONO};font-size:12.5px;color:var(--text)`)}>
                    {grat ? "—" : x.amount}
                  </span>
                  <span style={css(statusStyle)}>{statusText}</span>
                  <span style={css(`font-family:${MONO};font-size:11.5px;color:var(--muted)`)}>
                    {grat ? "—" : p.latest}
                  </span>
                  <span style={css(dueStyle)}>{grat ? "—" : p.vencimento}</span>
                  <div style={css("display:flex;justify-content:flex-end")}>
                    {/* Free customers are never billed, so they have no actions. */}
                    {!grat && paymentMenu(x.id, paid)}
                  </div>
                </>
              )}

              {compact && (
                <div
                  style={css(
                    "display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:12px 16px",
                  )}
                >
                  <div style={css("display:flex;flex-direction:column;gap:4px")}>
                    <span style={css(rotuloCampo)}>{L.plan}</span>
                    <span style={css(planBadge(planByKey(s.plans, x.plan)))}>{planName(s.plans, x.plan, id)}</span>
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:4px")}>
                    <span style={css(rotuloCampo)}>{L.valorMensal}</span>
                    <span style={css(`font-family:${MONO};font-size:12.5px;color:var(--text)`)}>
                      {grat ? "—" : x.amount}
                    </span>
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:4px")}>
                    <span style={css(rotuloCampo)}>{L.statusPagamento}</span>
                    <span style={css(statusStyle)}>{statusText}</span>
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:4px")}>
                    <span style={css(rotuloCampo)}>{L.ultimoPagamento}</span>
                    <span style={css(`font-family:${MONO};font-size:12px;color:var(--text2)`)}>
                      {grat ? "—" : p.latest}
                    </span>
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:4px")}>
                    <span style={css(rotuloCampo)}>{L.proxVencimento}</span>
                    <span style={css(dueStyle)}>{grat ? "—" : p.vencimento}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {(empty || rows.length === 0) && (
          <div
            style={css(
              "display:flex;flex-direction:column;align-items:center;gap:12px;padding:58px 24px;" +
                "text-align:center",
            )}
          >
            <div
              style={css(
                "width:48px;height:48px;border-radius:13px;background:var(--accent-soft);" +
                  "border:1px solid var(--accent-line);color:var(--accent);display:flex;" +
                  "align-items:center;justify-content:center",
              )}
            >
              <FinanceiroIcone size={22} />
            </div>
            {/* Uma leitura que falhou não é "nenhum pagamento": dizer que está
                tudo vazio esconderia o problema. */}
            <span style={css("font-size:14px;font-weight:600;color:var(--text)")}>
              {s.billingError ? L.erroFinanceiroTitulo : L.vazioFinanceiroTitulo}
            </span>
            <span style={css("font-size:12.5px;color:var(--text2);line-height:1.55;max-width:40ch")}>
              {s.billingError || L.vazioFinanceiroTexto}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
