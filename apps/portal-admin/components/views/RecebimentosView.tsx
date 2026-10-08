"use client";

import { Button, chip, css, dot, initials, MONO } from "@aguiar/ui";
import { useState } from "react";
import { useAdmin } from "@/components/AdminProvider";
import { NavLink } from "@/components/NavLink";
import { MetricsGrid, type Metric } from "@/components/shared";
import { RecebimentosIcone } from "@/lib/icons";
import {
  formatDateTime,
  formatDay,
  formatMoney,
  MP_PERIODS,
  statusGroup,
  type MpAccountResult,
  type MpPaymentRow,
  type MpStatusGroup,
} from "@/lib/recebimentos";
import { customerHref, ROUTES } from "@/lib/rotas";
import { panelBadge } from "@/lib/styleKit";

const GRID = "128px minmax(170px,1.6fr) 96px 104px 92px 104px 112px 104px";

const PANEL = "background:var(--surface);border:1px solid var(--border);border-radius:12px;";

type Filter = "all" | MpStatusGroup;

/**
 * Recebimentos — a conta do Mercado Pago vista do console.
 *
 * O Financeiro responde "quem está em dia"; esta tela responde "o que entrou
 * na conta": bruto, tarifa, líquido e quando o dinheiro é liberado. Só
 * leitura — estorno e saque continuam no painel do Mercado Pago.
 *
 * Os dados chegam por prop, lidos na página: só esta tela os usa.
 */
export function RecebimentosView({ result, days }: { result: MpAccountResult; days: number }) {
  const { a, compact, isMobile } = useAdmin();
  const { L } = a;
  const [filter, setFilter] = useState<Filter>("all");

  if (result.state !== "ok") {
    const unconfigured = result.state === "unconfigured";
    return (
      <section
        style={css(
          PANEL +
            "display:flex;flex-direction:column;align-items:center;gap:12px;padding:58px 24px;text-align:center",
        )}
      >
        <div
          style={css(
            "width:48px;height:48px;border-radius:13px;background:var(--accent-soft);" +
              "border:1px solid var(--accent-line);color:var(--accent-text);display:flex;" +
              "align-items:center;justify-content:center",
          )}
        >
          <RecebimentosIcone size={22} />
        </div>
        <span style={css("font-size:14px;font-weight:600;color:var(--text)")}>
          {unconfigured ? L.mpNaoConfiguradoTitulo : L.mpErroTitulo}
        </span>
        <span style={css("font-size:12.5px;color:var(--text2);line-height:1.55;max-width:52ch")}>
          {unconfigured ? L.mpNaoConfiguradoTexto : result.message}
        </span>
      </section>
    );
  }

  const { account, balance, summary, payments, sandbox, truncated } = result.data;
  const neutral = panelBadge("neutral");

  const metrics: Metric[] = [
    balance
      ? {
          label: L.mpSaldoDisponivel,
          value: formatMoney(balance.available),
          delta: formatMoney(balance.total),
          note: L.mpSaldoOficial,
          dot: dot("var(--pos)"),
          deltaStyle: panelBadge("pos"),
        }
      : {
          label: L.mpSaldoEstimado,
          value: formatMoney(summary.released),
          delta: `${days} ${L.mpDias}`,
          note: L.mpSaldoEstimadoNota,
          dot: dot("var(--pos)"),
          deltaStyle: neutral,
        },
    {
      label: L.mpALiberar,
      value: formatMoney(balance ? balance.unavailable : summary.toRelease),
      delta: String(payments.filter((p) => p.status === "approved" && !p.released).length),
      note: L.mpALiberarNota,
      dot: dot("var(--warn)"),
      deltaStyle: panelBadge("warn"),
    },
    {
      label: L.mpBruto,
      value: formatMoney(summary.gross),
      delta: String(summary.approvedCount),
      note: `${summary.approvedCount} ${L.mpBrutoNota} · ${days} ${L.mpDias}`,
      dot: dot("var(--accent)"),
      deltaStyle: panelBadge("acc"),
    },
    {
      label: L.mpTarifas,
      value: formatMoney(summary.fees),
      delta:
        summary.gross > 0
          ? (summary.fees / summary.gross).toLocaleString("pt-BR", {
              style: "percent",
              maximumFractionDigits: 1,
            })
          : "—",
      note: `${L.mpTarifasNota} ${formatMoney(summary.net)}`,
      dot: dot("var(--muted)"),
      deltaStyle: neutral,
    },
  ];

  const counts: Record<Filter, number> = {
    all: payments.length,
    approved: summary.approvedCount,
    pending: summary.pendingCount,
    rejected: summary.rejectedCount,
    refunded: summary.refundedCount,
  };
  const filters: [Filter, string][] = [
    ["all", L.mpTodos],
    ["approved", L.mpAprovados],
    ["pending", L.mpPendentes],
    ["rejected", L.mpRecusados],
    ["refunded", L.mpEstornados],
  ];
  const rows = filter === "all" ? payments : payments.filter((p) => statusGroup(p.status) === filter);

  const statusOf = (p: MpPaymentRow): [string, string] => {
    if (p.status === "approved") return [L.mpStatusAprovado, panelBadge("pos")];
    if (p.status === "refunded" || p.status === "charged_back") {
      return [L.mpStatusEstornado, panelBadge("danger")];
    }
    if (p.status === "rejected") return [L.mpStatusRecusado, panelBadge("danger")];
    if (p.status === "cancelled") return [L.mpStatusCancelado, neutral];
    return [L.mpStatusPendente, panelBadge("warn")];
  };
  const methodOf = (p: MpPaymentRow) =>
    p.method === "pix" ? "Pix" : p.method === "card" ? L.mpCartao : L.mpOutro;
  const monthOf = (p: MpPaymentRow) => {
    if (!p.referenceMonth) return p.description ?? "";
    const [year, month] = p.referenceMonth.split("-");
    return `${L.mpMensalidade} ${month}/${year}`;
  };

  const label =
    "font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:600";
  const mono = `font-family:${MONO};font-size:12px;`;

  const customerCell = (p: MpPaymentRow) => (
    <div style={css("display:flex;flex-direction:column;gap:2px;min-width:0")}>
      {p.tenantId ? (
        <NavLink
          href={customerHref(p.tenantId)}
          style={css(
            "font-size:13px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
          )}
        >
          {p.tenantName || p.tenantId}
        </NavLink>
      ) : (
        <span
          style={css(
            "font-size:13px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
          )}
        >
          {p.payerEmail || L.mpForaDoPortal}
        </span>
      )}
      <span
        style={css(
          "font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
        )}
      >
        {p.tenantId ? monthOf(p) : (p.description ?? L.mpForaDoPortal)} · #{p.id}
      </span>
    </div>
  );

  return (
    <div style={css("display:flex;flex-direction:column;gap:20px")}>
      {sandbox && (
        <div
          role="status"
          style={css(
            "padding:11px 14px;border:1px solid var(--warn-line);border-radius:10px;" +
              "background:var(--warn-soft);color:var(--warn);font-size:12.5px;font-weight:600",
          )}
        >
          {L.mpAmbienteTeste}
        </div>
      )}

      {/* A conta e o período. */}
      <section
        style={css(
          PANEL +
            "display:flex;gap:14px;" +
            (isMobile
              ? "flex-direction:column;align-items:stretch;padding:14px"
              : "align-items:center;flex-wrap:wrap;padding:14px 20px"),
        )}
      >
        <div style={css("display:flex;align-items:center;gap:12px;min-width:0;flex:1")}>
          <div
            style={css(
              "width:38px;height:38px;flex:none;border-radius:10px;background:var(--accent-soft);" +
                "border:1px solid var(--accent-line);color:var(--accent-text);display:flex;" +
                "align-items:center;justify-content:center;font-size:12px;font-weight:700",
            )}
          >
            {initials(account.name || account.nickname || "MP")}
          </div>
          <div style={css("display:flex;flex-direction:column;gap:2px;min-width:0")}>
            <span style={css(label)}>{L.mpConta}</span>
            <span
              style={css(
                "font-size:13.5px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
              )}
            >
              {account.name || account.nickname}
              {account.email ? ` · ${account.email}` : ""}
            </span>
            <span style={css(`${mono}color:var(--muted);font-size:11px`)}>
              {L.mpContaId} {account.id}
              {account.country ? ` · ${account.country}` : ""}
            </span>
          </div>
        </div>

        <div style={css("display:flex;align-items:center;gap:6px;flex-wrap:wrap")}>
          <span style={css(label + ";margin-right:4px")}>{L.mpPeriodo}</span>
          {MP_PERIODS.map((period) => (
            <NavLink
              key={period}
              href={`${ROUTES.payouts}?dias=${period}`}
              aria-current={period === days ? "true" : undefined}
              style={css(chip(period === days))}
            >
              {period} {L.mpDias}
            </NavLink>
          ))}
          <a
            href="https://www.mercadopago.com.br/activities"
            target="_blank"
            rel="noreferrer"
            className="hv-acc-borda"
            style={css(
              "margin-left:4px;background:var(--surface);border:1px solid var(--border);color:var(--text2);" +
                "font-size:12.5px;font-weight:500;padding:8px 12px;border-radius:9px;white-space:nowrap;text-decoration:none",
            )}
          >
            {L.mpAbrirPainel} ↗
          </a>
        </div>
      </section>

      <MetricsGrid metrics={metrics} />

      {!balance && (
        <p style={css("margin:-8px 2px 0;font-size:11.5px;line-height:1.55;color:var(--muted)")}>
          {L.mpSaldoAviso}
        </p>
      )}

      {/* Pix × cartão: de onde veio o bruto do período. */}
      {summary.gross > 0 && (
        <section style={css(PANEL + (isMobile ? "padding:14px" : "padding:16px 20px"))}>
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap")}>
            <h2 style={css("margin:0;font-size:13px;font-weight:600;color:var(--text)")}>{L.mpPorForma}</h2>
            <div style={css(`display:flex;gap:16px;flex-wrap:wrap;${mono}color:var(--text2)`)}>
              <span>
                <span style={css("color:var(--accent);font-weight:700")}>■</span> Pix {formatMoney(summary.pix)}
              </span>
              <span>
                <span style={css("color:var(--petrol);font-weight:700")}>■</span> {L.mpCartao}{" "}
                {formatMoney(summary.card)}
              </span>
            </div>
          </div>
          <div
            style={css(
              "margin-top:12px;display:flex;height:10px;border-radius:99px;overflow:hidden;background:var(--surface2)",
            )}
          >
            <div style={css(`width:${(summary.pix / summary.gross) * 100}%;background:var(--accent)`)} />
            <div style={css(`width:${(summary.card / summary.gross) * 100}%;background:var(--petrol)`)} />
          </div>
        </section>
      )}

      <section style={css(PANEL + "overflow:hidden")}>
        <div
          style={css(
            "display:flex;gap:12px;border-bottom:1px solid var(--border-soft);" +
              (isMobile
                ? "flex-direction:column;align-items:stretch;padding:14px"
                : "align-items:center;flex-wrap:wrap;padding:15px 20px"),
          )}
        >
          <div style={css("display:flex;flex-direction:column;gap:3px;margin-right:auto")}>
            <h2 style={css("margin:0;font-size:14px;font-weight:600;color:var(--text)")}>{L.mpPagamentos}</h2>
            <span style={css("font-size:11.5px;color:var(--muted)")}>{L.mpPagamentosSub}</span>
          </div>
          <div style={css("display:flex;gap:6px;flex-wrap:wrap")}>
            {filters.map(([key, text]) => (
              <Button key={key} onClick={() => setFilter(key)} style={css(chip(filter === key))}>
                {text} · {counts[key]}
              </Button>
            ))}
          </div>
        </div>

        {!compact && rows.length > 0 && (
          <div
            style={css(
              `display:grid;grid-template-columns:${GRID};gap:12px;padding:10px 20px;background:var(--surface2);` +
                "border-bottom:1px solid var(--border-soft);font-size:10.5px;letter-spacing:.07em;" +
                "text-transform:uppercase;color:var(--muted);font-weight:600",
            )}
          >
            <span>{L.mpColData}</span>
            <span>{L.mpColCliente}</span>
            <span>{L.mpColForma}</span>
            <span style={css("text-align:right")}>{L.mpColValor}</span>
            <span style={css("text-align:right")}>{L.mpColTarifa}</span>
            <span style={css("text-align:right")}>{L.mpColLiquido}</span>
            <span>{L.mpColLiberacao}</span>
            <span>{L.mpColStatus}</span>
          </div>
        )}

        {rows.map((p) => {
          const [statusText, statusStyle] = statusOf(p);
          const approved = p.status === "approved";
          const release = !approved ? "—" : p.released ? L.mpLiberado : formatDay(p.releaseDate);

          if (compact) {
            return (
              <div
                key={p.id}
                style={css(
                  "display:flex;flex-direction:column;gap:11px;padding:14px 16px;border-bottom:1px solid var(--border-soft)",
                )}
              >
                <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:10px")}>
                  {customerCell(p)}
                  <span style={css(statusStyle + "flex:none")}>{statusText}</span>
                </div>
                <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:10px 14px")}>
                  {(
                    [
                      [L.mpColData, formatDateTime(p.createdAt)],
                      [L.mpColForma, methodOf(p)],
                      [L.mpColValor, formatMoney(p.amount)],
                      [L.mpColTarifa, approved ? formatMoney(p.fee) : "—"],
                      [L.mpColLiquido, approved ? formatMoney(p.net) : "—"],
                      [L.mpColLiberacao, release],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} style={css("display:flex;flex-direction:column;gap:3px")}>
                      <span style={css(label)}>{k}</span>
                      <span style={css(`${mono}color:var(--text)`)}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div
              key={p.id}
              className="hv-linha"
              style={css(
                `display:grid;grid-template-columns:${GRID};gap:12px;align-items:center;padding:12px 20px;` +
                  "border-bottom:1px solid var(--border-soft)",
              )}
            >
              <span style={css(`${mono}color:var(--muted)`)}>{formatDateTime(p.createdAt)}</span>
              {customerCell(p)}
              <span style={css("font-size:12.5px;color:var(--text2)")}>{methodOf(p)}</span>
              <span style={css(`${mono}color:var(--text);text-align:right`)}>{formatMoney(p.amount)}</span>
              <span style={css(`${mono}color:var(--muted);text-align:right`)}>
                {approved ? formatMoney(p.fee) : "—"}
              </span>
              <span style={css(`${mono}color:var(--text);font-weight:600;text-align:right`)}>
                {approved ? formatMoney(p.net) : "—"}
              </span>
              <span style={css(`${mono}color:${approved && !p.released ? "var(--warn)" : "var(--muted)"}`)}>
                {release}
              </span>
              <span>
                <span style={css(statusStyle)}>{statusText}</span>
              </span>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div
            style={css(
              "display:flex;flex-direction:column;align-items:center;gap:10px;padding:52px 24px;text-align:center",
            )}
          >
            <span style={css("font-size:14px;font-weight:600;color:var(--text)")}>
              {payments.length === 0 ? L.mpVazioTitulo : L.mpVazioFiltro}
            </span>
            {payments.length === 0 && (
              <span style={css("font-size:12.5px;color:var(--text2);line-height:1.55;max-width:44ch")}>
                {L.mpVazioTexto}
              </span>
            )}
          </div>
        )}

        {truncated && (
          <p style={css("margin:0;padding:12px 20px;font-size:11.5px;color:var(--muted)")}>
            {L.mpTruncado}
          </p>
        )}
      </section>
    </div>
  );
}
