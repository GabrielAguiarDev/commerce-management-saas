"use client";

import { useAdmin } from "@/components/AdminProvider";
import { css, MONO } from "@/lib/css";
import { BaixarIcone, FinanceiroIcone } from "@/lib/icons";
import {
  calcMrr,
  cobraveis,
  contaPorStatus,
  fmtDin,
  fmtMrr,
  infoPag,
  somaPorStatus,
} from "@/lib/money";
import { CampoBusca, MetricasGrid, type Metrica } from "@/components/shared";
import {
  avatar,
  badgeAcc,
  badgeBad,
  badgeNeutro,
  badgeOk,
  badgeWarn,
  chip,
  iniciais,
  nomePlano,
  planoBadge,
  ponto,
} from "@/lib/styleKit";

const GRADE_PAG =
  "minmax(190px,1.7fr) 110px 110px 110px 120px 120px 74px";

export function FinanceiroView() {
  const { s, a, cs, vazio } = useAdmin();
  const { L } = a;
  const id = s.idioma;

  // Below this width the table becomes a stack of cards.
  const compacto = s.larguraTela < 1000;

  const mrr = calcMrr(cs);
  const faturaveis = cobraveis(cs);
  const recebido = somaPorStatus(cs, s.pagamentos, "emdia");
  const aberto = somaPorStatus(cs, s.pagamentos, "pendente");
  const atrasadoTotal = somaPorStatus(cs, s.pagamentos, "atrasado");
  const emDiaN = contaPorStatus(cs, s.pagamentos, "emdia");
  const pendenteN = contaPorStatus(cs, s.pagamentos, "pendente");
  const atrasadoN = contaPorStatus(cs, s.pagamentos, "atrasado");
  const neutro = badgeNeutro();

  const metricas: Metrica[] = [
    {
      rotulo: L.mrrAtual,
      valor: fmtMrr(mrr),
      delta: vazio ? "—" : "+18,7% " + L.vsMes,
      nota: faturaveis.length + " " + (id === "pt" ? "clientes cobráveis" : "billable customers"),
      ponto: ponto(vazio ? "var(--neuLine)" : "var(--ok)"),
      deltaStyle: vazio ? neutro : badgeOk(),
    },
    {
      rotulo: L.recebidoMes,
      valor: fmtDin(recebido),
      delta: Math.round((recebido / Math.max(1, mrr)) * 100) + "%",
      nota: emDiaN + " " + L.recebidoNota,
      ponto: ponto(vazio ? "var(--neuLine)" : "var(--ok)"),
      deltaStyle: vazio ? neutro : badgeAcc(),
    },
    {
      rotulo: L.aReceber,
      valor: fmtDin(aberto),
      delta: String(pendenteN),
      nota: id === "pt" ? "pagamentos pendentes no período" : "pending payments in the period",
      ponto: ponto(vazio ? "var(--neuLine)" : "var(--warn)"),
      deltaStyle: vazio ? neutro : badgeWarn(),
    },
    {
      rotulo: L.inadimplentes,
      valor: atrasadoN,
      delta: fmtDin(atrasadoTotal),
      nota: id === "pt" ? "clientes com vencimento passado" : "customers past due",
      ponto: ponto(vazio ? "var(--neuLine)" : "var(--bad)"),
      deltaStyle: vazio ? neutro : badgeBad(),
    },
  ];

  const maxReceita = Math.max(...s.receita.map((g) => g.valor));

  const qp = s.buscaPag.trim().toLowerCase();
  const linhas = cs.filter((x) => {
    if (qp && !x.nome.toLowerCase().includes(qp)) return false;
    if (s.filtroPag === "todos") return true;
    return x.plano !== "free" && infoPag(s.pagamentos, x.id).status === s.filtroPag;
  });

  const exportar = () => {
    const cabecalho = [
      L.negocio,
      L.plano,
      L.valorMensal,
      L.statusPagamento,
      L.ultimoPagamento,
      L.proxVencimento,
    ].join(";");
    const corpo = linhas.map((x) => {
      const p = infoPag(s.pagamentos, x.id);
      const grat = x.plano === "free";
      return [
        x.nome,
        nomePlano(s.planos, x.plano, id),
        grat ? "-" : x.valor,
        grat
          ? L.semCobranca
          : p.status === "emdia"
            ? L.emDia
            : p.status === "atrasado"
              ? L.atrasado
              : L.pendente,
        grat ? "-" : p.ultimo,
        grat ? "-" : p.vencimento,
      ].join(";");
    });
    a.baixarCsv([cabecalho, ...corpo], "aguiar-one-financeiro.csv");
  };

  const rotuloCampo =
    "font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--tx3);font-weight:600";

  const botaoMenu = (clienteId: string) => (
    <button
      onClick={() => a.set((st) => ({ menuPag: st.menuPag === clienteId ? null : clienteId }))}
      aria-label={L.acoes}
      className="hv-tx"
      style={css(
        "border:1px solid var(--line);background:var(--panel);color:var(--tx3);font-size:13px;" +
          "line-height:1;padding:7px 9px;border-radius:7px;cursor:pointer",
      )}
    >
      ⋯
    </button>
  );

  const menuPagamento = (clienteId: string, pago: boolean) => (
    <div
      style={css(
        "position:absolute;top:36px;right:0;z-index:9;background:var(--panel);" +
          "border:1px solid var(--line);border-radius:9px;box-shadow:0 10px 24px rgba(9,26,33,.18);" +
          "padding:5px;display:flex;flex-direction:column;min-width:184px",
      )}
    >
      <button
        onClick={() => a.abrirModal(pago ? "reverter" : "pagar", clienteId)}
        className="hv-menu"
        style={css(
          "text-align:left;background:none;border:none;color:var(--tx2);font-size:12.5px;" +
            "padding:8px 10px;border-radius:6px;cursor:pointer",
        )}
      >
        {pago ? L.reverterPagamento : L.marcarPago}
      </button>
      <button
        onClick={() => a.abrirModal("historico", clienteId)}
        className="hv-menu"
        style={css(
          "text-align:left;background:none;border:none;color:var(--tx2);font-size:12.5px;" +
            "padding:8px 10px;border-radius:6px;cursor:pointer",
        )}
      >
        {L.verHistorico}
      </button>
    </div>
  );

  return (
    <div style={css("display:flex;flex-direction:column;gap:20px")}>
      <MetricasGrid metricas={metricas} />

      <section
        style={css(
          "background:var(--panel);border:1px solid var(--line);border-radius:12px;" +
            "padding:20px 22px 18px;display:flex;flex-direction:column;gap:18px",
        )}
      >
        <div style={css("display:flex;flex-direction:column;gap:3px")}>
          <h2 style={css("margin:0;font-size:14px;font-weight:600;color:var(--tx)")}>
            {L.receitaEvolucao}
          </h2>
          <span style={css("font-size:11.5px;color:var(--tx3)")}>{L.receitaSub}</span>
        </div>
        <div style={css("display:flex;align-items:flex-end;gap:14px;height:172px;padding-top:6px")}>
          {(vazio ? [] : s.receita).map((g, i) => (
            <div
              key={g.mes.pt}
              style={css(
                "flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;" +
                  "height:100%;justify-content:flex-end",
              )}
            >
              <span style={css(`font-family:${MONO};font-size:11px;color:var(--tx2)`)}>
                {fmtDin(g.valor)}
              </span>
              <div
                style={css(
                  "width:100%;max-width:54px;border-radius:7px 7px 3px 3px;background:" +
                    // The most recent month is the filled bar.
                    (i === s.receita.length - 1 ? "var(--acc)" : "var(--accSoft)") +
                    ";border:1px solid var(--accLine);height:" +
                    Math.round((g.valor / maxReceita) * 118) +
                    "px",
                )}
              />
              <span
                style={css(
                  "font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em",
                )}
              >
                {g.mes[id]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section
        style={css(
          "background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:visible",
        )}
      >
        <div
          style={css(
            "display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:15px 20px;" +
              "border-bottom:1px solid var(--lineSoft)",
          )}
        >
          <div style={css("display:flex;flex-direction:column;gap:3px;margin-right:6px")}>
            <h2 style={css("margin:0;font-size:14px;font-weight:600;color:var(--tx)")}>
              {L.pagamentosTitulo}
            </h2>
            <span
              style={css(
                "display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--tx3)",
              )}
            >
              <span
                style={css("width:6px;height:6px;border-radius:99px;background:var(--warn)")}
              />
              {L.registroManual}
            </span>
          </div>

          <CampoBusca
            valor={s.buscaPag}
            onChange={(v) => a.set({ buscaPag: v })}
            placeholder={L.buscarPagamento}
            estiloCaixa="flex:1;min-width:180px;max-width:260px;"
            compacto
          />

          <div style={css("display:flex;gap:6px;flex-wrap:wrap")}>
            {(
              [
                ["todos", L.todosChamados],
                ["emdia", L.emDia],
                ["atrasado", L.atrasado],
                ["pendente", L.pendente],
              ] as const
            ).map(([k, rotulo]) => (
              <button
                key={k}
                onClick={() => a.set({ filtroPag: k })}
                style={css(chip(s.filtroPag === k))}
              >
                {rotulo}
              </button>
            ))}
          </div>

          <div style={css("margin-left:auto")}>
            <button
              onClick={exportar}
              className="hv-acc-line"
              style={css(
                "display:flex;align-items:center;gap:7px;background:var(--panel);" +
                  "border:1px solid var(--line);color:var(--tx2);font-size:12.5px;font-weight:500;" +
                  "padding:9px 13px;border-radius:9px;cursor:pointer;white-space:nowrap",
              )}
            >
              <BaixarIcone />
              {L.exportarCsv}
            </button>
          </div>
        </div>

        {!compacto && (
          <div
            style={css(
              "display:grid;grid-template-columns:" +
                GRADE_PAG +
                ";gap:12px;padding:10px 20px;background:var(--head);" +
                "border-bottom:1px solid var(--lineSoft);font-size:10.5px;letter-spacing:.07em;" +
                "text-transform:uppercase;color:var(--tx3);font-weight:600",
            )}
          >
            <span>{L.negocio}</span>
            <span>{L.plano}</span>
            <span>{L.valorMensal}</span>
            <span>{L.statusPagamento}</span>
            <span>{L.ultimoPagamento}</span>
            <span>{L.proxVencimento}</span>
            <span style={css("text-align:right")}>{L.acoes}</span>
          </div>
        )}

        {(vazio ? [] : linhas).map((x) => {
          const p = infoPag(s.pagamentos, x.id);
          const grat = x.plano === "free";
          const pago = p.status === "emdia";
          const menuAberto = s.menuPag === x.id;

          const statusTexto = grat
            ? L.semCobranca
            : pago
              ? L.emDia
              : p.status === "atrasado"
                ? L.atrasado
                : L.pendente;
          const statusEstilo = grat
            ? badgeNeutro()
            : pago
              ? badgeOk()
              : p.status === "atrasado"
                ? badgeBad()
                : badgeWarn();
          const vencEstilo =
            `font-family:${MONO};font-size:11.5px;color:` +
            (!grat && p.status === "atrasado" ? "var(--bad)" : "var(--tx3)");
          const destaque = !grat && p.status === "atrasado" ? "background:var(--panel2);" : "";

          return (
            <div
              key={x.id}
              className="hv-row"
              style={css(
                compacto
                  ? "display:flex;flex-direction:column;gap:12px;padding:15px 16px;" +
                      "border-bottom:1px solid var(--lineSoft);" +
                      destaque
                  : "display:grid;grid-template-columns:" +
                      GRADE_PAG +
                      ";gap:12px;align-items:center;padding:13px 20px;" +
                      "border-bottom:1px solid var(--lineSoft);" +
                      destaque,
              )}
            >
              <div style={css("display:flex;align-items:center;gap:11px;min-width:0")}>
                <div style={css(avatar(x.plano))}>{iniciais(x.nome)}</div>
                <span
                  style={css(
                    "font-size:13.5px;font-weight:500;color:var(--tx);white-space:nowrap;" +
                      "overflow:hidden;text-overflow:ellipsis",
                  )}
                >
                  {x.nome}
                </span>
                {compacto && (
                  <div style={css("margin-left:auto;position:relative;display:flex")}>
                    {botaoMenu(x.id)}
                    {menuAberto && menuPagamento(x.id, pago)}
                  </div>
                )}
              </div>

              {!compacto && (
                <>
                  <span style={css(planoBadge(x.plano))}>{nomePlano(s.planos, x.plano, id)}</span>
                  <span style={css(`font-family:${MONO};font-size:12.5px;color:var(--tx)`)}>
                    {grat ? "—" : x.valor}
                  </span>
                  <span style={css(statusEstilo)}>{statusTexto}</span>
                  <span style={css(`font-family:${MONO};font-size:11.5px;color:var(--tx3)`)}>
                    {grat ? "—" : p.ultimo}
                  </span>
                  <span style={css(vencEstilo)}>{grat ? "—" : p.vencimento}</span>
                  <div style={css("display:flex;justify-content:flex-end;position:relative")}>
                    {/* Free customers are never billed, so they have no actions. */}
                    {!grat && botaoMenu(x.id)}
                    {menuAberto && menuPagamento(x.id, pago)}
                  </div>
                </>
              )}

              {compacto && (
                <div
                  style={css(
                    "display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:12px 16px",
                  )}
                >
                  <div style={css("display:flex;flex-direction:column;gap:4px")}>
                    <span style={css(rotuloCampo)}>{L.plano}</span>
                    <span style={css(planoBadge(x.plano))}>{nomePlano(s.planos, x.plano, id)}</span>
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:4px")}>
                    <span style={css(rotuloCampo)}>{L.valorMensal}</span>
                    <span style={css(`font-family:${MONO};font-size:12.5px;color:var(--tx)`)}>
                      {grat ? "—" : x.valor}
                    </span>
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:4px")}>
                    <span style={css(rotuloCampo)}>{L.statusPagamento}</span>
                    <span style={css(statusEstilo)}>{statusTexto}</span>
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:4px")}>
                    <span style={css(rotuloCampo)}>{L.ultimoPagamento}</span>
                    <span style={css(`font-family:${MONO};font-size:12px;color:var(--tx2)`)}>
                      {grat ? "—" : p.ultimo}
                    </span>
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:4px")}>
                    <span style={css(rotuloCampo)}>{L.proxVencimento}</span>
                    <span style={css(vencEstilo)}>{grat ? "—" : p.vencimento}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {(vazio || linhas.length === 0) && (
          <div
            style={css(
              "display:flex;flex-direction:column;align-items:center;gap:12px;padding:58px 24px;" +
                "text-align:center",
            )}
          >
            <div
              style={css(
                "width:48px;height:48px;border-radius:13px;background:var(--accSoft);" +
                  "border:1px solid var(--accLine);color:var(--acc);display:flex;" +
                  "align-items:center;justify-content:center",
              )}
            >
              <FinanceiroIcone size={22} />
            </div>
            <span style={css("font-size:14px;font-weight:600;color:var(--tx)")}>
              {L.vazioFinanceiroTitulo}
            </span>
            <span style={css("font-size:12.5px;color:var(--tx2);line-height:1.55;max-width:40ch")}>
              {L.vazioFinanceiroTexto}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
