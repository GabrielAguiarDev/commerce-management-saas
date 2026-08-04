"use client";

import { useAdmin } from "@/components/AdminProvider";
import { CampoBusca, css, ITEM_MENU, MenuAcoes, MONO } from "@aguiar/ui";
import { BaixarIcone, FinanceiroIcone } from "@/lib/icons";
import {
  calcMrr,
  cobraveis,
  contaPorStatus,
  ehCobravel,
  fmtDin,
  fmtMrr,
  infoPag,
  somaPorStatus,
} from "@/lib/money";
import { planoPorChave } from "@/lib/planos";
import { MetricasGrid, type Metrica } from "@/components/shared";
import { avatar, nomePlano, planoBadge, seloPainel } from "@/lib/styleKit";
import { chip, iniciais, ponto } from "@aguiar/ui";

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
  const neutro = seloPainel("neutro");

  const metricas: Metrica[] = [
    {
      rotulo: L.mrrAtual,
      valor: fmtMrr(mrr),
      // Sem histórico de faturamento no banco não existe "vs mês anterior" —
      // o protótipo mostrava +18,7% fixo. Aqui vai a fração da base que paga.
      delta: vazio ? "—" : `${faturaveis.length}/${cs.length}`,
      nota: faturaveis.length + " " + L.clientesCobraveis,
      ponto: ponto(vazio ? "var(--border)" : "var(--pos)"),
      deltaStyle: vazio ? neutro : seloPainel("pos"),
    },
    {
      rotulo: L.recebidoMes,
      valor: fmtDin(recebido),
      delta: Math.round((recebido / Math.max(1, mrr)) * 100) + "%",
      nota: emDiaN + " " + L.recebidoNota,
      ponto: ponto(vazio ? "var(--border)" : "var(--pos)"),
      deltaStyle: vazio ? neutro : seloPainel("acc"),
    },
    {
      rotulo: L.aReceber,
      valor: fmtDin(aberto),
      delta: String(pendenteN),
      nota: id === "pt" ? "pagamentos pendentes no período" : "pending payments in the period",
      ponto: ponto(vazio ? "var(--border)" : "var(--warn)"),
      deltaStyle: vazio ? neutro : seloPainel("warn"),
    },
    {
      rotulo: L.inadimplentes,
      valor: atrasadoN,
      delta: fmtDin(atrasadoTotal),
      nota: id === "pt" ? "clientes com vencimento passado" : "customers past due",
      ponto: ponto(vazio ? "var(--border)" : "var(--danger)"),
      deltaStyle: vazio ? neutro : seloPainel("danger"),
    },
  ];

  // Todo mês do período aparece no gráfico, inclusive os zerados (ver
  // `lib/pagamentos.ts`). Sem o piso de 1, um período inteiro sem receita daria
  // divisão por zero e barras com altura NaN.
  const maxReceita = Math.max(1, ...s.receita.map((g) => g.valor));

  const qp = s.buscaPag.trim().toLowerCase();
  const linhas = cs.filter((x) => {
    if (qp && !x.nome.toLowerCase().includes(qp)) return false;
    if (s.filtroPag === "todos") return true;
    // Quem não é cobrado não tem status de pagamento para filtrar.
    return ehCobravel(x) && infoPag(s.pagamentos, x.id).status === s.filtroPag;
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
      const grat = !ehCobravel(x);
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
    "font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:600";

  const menuPagamento = (clienteId: string, pago: boolean) => (
    <MenuAcoes
      aberto={s.menuPag === clienteId}
      onAbertoChange={(v) => a.set({ menuPag: v ? clienteId : null })}
      rotulo={L.acoes}
      larguraMin={184}
    >
      <button
        onClick={() => a.abrirModal(pago ? "reverter" : "pagar", clienteId)}
        role="menuitem"
        className="hv-menu"
        style={css(ITEM_MENU + "color:var(--text2)")}
      >
        {pago ? L.reverterPagamento : L.marcarPago}
      </button>
      <button
        onClick={() => a.abrirModal("historico", clienteId)}
        role="menuitem"
        className="hv-menu"
        style={css(ITEM_MENU + "color:var(--text2)")}
      >
        {L.verHistorico}
      </button>
    </MenuAcoes>
  );

  return (
    <div style={css("display:flex;flex-direction:column;gap:20px")}>
      <MetricasGrid metricas={metricas} />

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
          {(vazio ? [] : s.receita).map((g, i) => (
            <div
              key={g.mes.pt}
              style={css(
                "flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;" +
                  "height:100%;justify-content:flex-end",
              )}
            >
              <span style={css(`font-family:${MONO};font-size:11px;color:var(--text2)`)}>
                {fmtDin(g.valor)}
              </span>
              <div
                style={css(
                  "width:100%;max-width:54px;border-radius:7px 7px 3px 3px;background:" +
                    // The most recent month is the filled bar.
                    (i === s.receita.length - 1 ? "var(--accent)" : "var(--accent-soft)") +
                    ";border:1px solid var(--accent-line);height:" +
                    Math.round((g.valor / maxReceita) * 118) +
                    "px",
                )}
              />
              <span
                style={css(
                  "font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em",
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
              className="hv-acc-borda"
              style={css(
                "display:flex;align-items:center;gap:7px;background:var(--surface);" +
                  "border:1px solid var(--border);color:var(--text2);font-size:12.5px;font-weight:500;" +
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
                ";gap:12px;padding:10px 20px;background:var(--surface2);" +
                "border-bottom:1px solid var(--border-soft);font-size:10.5px;letter-spacing:.07em;" +
                "text-transform:uppercase;color:var(--muted);font-weight:600",
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
          // "Gratuito" é não ter mensalidade — não é a chave do plano.
          const grat = !ehCobravel(x);
          const pago = p.status === "emdia";

          const statusTexto = grat
            ? L.semCobranca
            : pago
              ? L.emDia
              : p.status === "atrasado"
                ? L.atrasado
                : L.pendente;
          const statusEstilo = grat
            ? seloPainel("neutro")
            : pago
              ? seloPainel("pos")
              : p.status === "atrasado"
                ? seloPainel("danger")
                : seloPainel("warn");
          const vencEstilo =
            `font-family:${MONO};font-size:11.5px;color:` +
            (!grat && p.status === "atrasado" ? "var(--danger)" : "var(--muted)");
          const destaque = !grat && p.status === "atrasado" ? "background:var(--surface2);" : "";

          return (
            <div
              key={x.id}
              className="hv-linha"
              style={css(
                compacto
                  ? "display:flex;flex-direction:column;gap:12px;padding:15px 16px;" +
                      "border-bottom:1px solid var(--border-soft);" +
                      destaque
                  : "display:grid;grid-template-columns:" +
                      GRADE_PAG +
                      ";gap:12px;align-items:center;padding:13px 20px;" +
                      "border-bottom:1px solid var(--border-soft);" +
                      destaque,
              )}
            >
              <div style={css("display:flex;align-items:center;gap:11px;min-width:0")}>
                <div style={css(avatar(planoPorChave(s.planos, x.plano)))}>{iniciais(x.nome)}</div>
                <span
                  style={css(
                    "font-size:13.5px;font-weight:500;color:var(--text);white-space:nowrap;" +
                      "overflow:hidden;text-overflow:ellipsis",
                  )}
                >
                  {x.nome}
                </span>
                {compacto && (
                  <div style={css("margin-left:auto;display:flex")}>
                    {menuPagamento(x.id, pago)}
                  </div>
                )}
              </div>

              {!compacto && (
                <>
                  <span style={css(planoBadge(planoPorChave(s.planos, x.plano)))}>{nomePlano(s.planos, x.plano, id)}</span>
                  <span style={css(`font-family:${MONO};font-size:12.5px;color:var(--text)`)}>
                    {grat ? "—" : x.valor}
                  </span>
                  <span style={css(statusEstilo)}>{statusTexto}</span>
                  <span style={css(`font-family:${MONO};font-size:11.5px;color:var(--muted)`)}>
                    {grat ? "—" : p.ultimo}
                  </span>
                  <span style={css(vencEstilo)}>{grat ? "—" : p.vencimento}</span>
                  <div style={css("display:flex;justify-content:flex-end")}>
                    {/* Free customers are never billed, so they have no actions. */}
                    {!grat && menuPagamento(x.id, pago)}
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
                    <span style={css(planoBadge(planoPorChave(s.planos, x.plano)))}>{nomePlano(s.planos, x.plano, id)}</span>
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:4px")}>
                    <span style={css(rotuloCampo)}>{L.valorMensal}</span>
                    <span style={css(`font-family:${MONO};font-size:12.5px;color:var(--text)`)}>
                      {grat ? "—" : x.valor}
                    </span>
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:4px")}>
                    <span style={css(rotuloCampo)}>{L.statusPagamento}</span>
                    <span style={css(statusEstilo)}>{statusTexto}</span>
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:4px")}>
                    <span style={css(rotuloCampo)}>{L.ultimoPagamento}</span>
                    <span style={css(`font-family:${MONO};font-size:12px;color:var(--text2)`)}>
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
              {s.erroFinanceiro ? L.erroFinanceiroTitulo : L.vazioFinanceiroTitulo}
            </span>
            <span style={css("font-size:12.5px;color:var(--text2);line-height:1.55;max-width:40ch")}>
              {s.erroFinanceiro || L.vazioFinanceiroTexto}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
