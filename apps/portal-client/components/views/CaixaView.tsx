"use client";

import { usePortal } from "@/components/PortalProvider";
import { MenuLinha } from "@/components/ui";
import { botaoPrimario, CABECALHO_TABELA, CabecalhoTela, css, faixaKpis, LISTA, MONO, NUM, ROTULO_KPI, rotuloColuna, SANS, Vazio } from "@aguiar/ui";
import { MOV_CAIXA_ESTILO, saldoMovs, somaFormas } from "@/lib/dados/caixa";
import { FORMAS, NOTA_FORMA } from "@/lib/dados/vendas";
import { brl, brlDif, corDif, rotuloData } from "@/lib/formato";
import { dinheiroNaGaveta, esperadoDoTurno, vendasDoTurno } from "@/lib/selectors";
import type { CaixaFechado } from "@/types/types";

/**
 * O caixa.
 *
 * A tela responde a três perguntas em ordem: o turno está aberto? quanto entrou
 * por forma de pagamento? e o que saiu da gaveta que não foi venda? O
 * fechamento é o único momento em que se digita — o resto é consequência das
 * vendas.
 */
export function CaixaView() {
  const { a, isMobile, isDesktop, d } = usePortal();
  const cx = d.caixaAberto;

  const vendas = vendasDoTurno(d);
  const totalVendas = somaFormas(vendas);
  const naGaveta = dinheiroNaGaveta(d);
  const esperado = esperadoDoTurno(d);

  const indCols = isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))";
  const painelCols = isDesktop ? "minmax(0,1fr) minmax(0,1fr)" : "1fr";

  return (
    <div>
      <CabecalhoTela
        titulo="Caixa"
        subtitulo="Abra o turno com o troco, acompanhe o dinheiro do dia e feche conferindo."
        acao={
          cx ? (
            <div style={css("display:flex;align-items:center;gap:9px")}>
              <span
                style={css(
                  `display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:999px;background:var(--pos-soft);color:var(--pos);font:600 12px ${SANS}`,
                )}
              >
                <span style={css("width:7px;height:7px;border-radius:50%;background:var(--pos)")} />
                Aberto desde {cx.abertura}
              </span>
              {isDesktop && (
                <button
                  onClick={() => a.abrirModal({ k: "caixaFechar" })}
                  className="hv-brilho"
                  style={css(`${botaoPrimario()};background:var(--warn);color:#fff`)}
                >
                  Fechar caixa
                </button>
              )}
            </div>
          ) : undefined
        }
      />

      {!cx ? (
        <div
          style={css(
            "display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:44px 20px;" +
              "border:1px solid var(--border);border-radius:16px;background:var(--surface);box-shadow:var(--shadow)",
          )}
        >
          <span
            style={css(
              "width:46px;height:46px;border-radius:13px;background:var(--accent-soft);color:var(--accent);" +
                `display:flex;align-items:center;justify-content:center;font:700 15px ${MONO}`,
            )}
          >
            CX
          </span>
          <div style={css(`margin-top:2px;font:700 18px ${SANS}`)}>Nenhum caixa aberto agora</div>
          <p style={css(`margin:0;max-width:400px;font:400 13.5px/1.55 ${SANS};color:var(--muted)`)}>
            Para começar o dia, abra o caixa informando o troco que está na gaveta. Depois disso, as
            vendas em dinheiro entram aqui automaticamente.
          </p>
          <button
            onClick={() => a.abrirModal({ k: "caixaAbrir" })}
            className="hv-brilho"
            style={css(`margin-top:10px;padding:16px 30px;border-radius:13px;${botaoPrimario("lg")}`)}
          >
            Abrir caixa
          </button>
        </div>
      ) : (
        <div>
          <div style={css(faixaKpis(indCols) + ";margin-bottom:16px")}>
            {[
              {
                label: "Troco inicial",
                valor: brl(cx.inicial),
                nota: `Aberto às ${cx.abertura}`,
                cor: "var(--text)",
              },
              {
                label: "Vendido no turno",
                valor: brl(totalVendas),
                nota: "Todas as formas somadas",
                cor: "var(--pos)",
              },
              {
                label: "Na gaveta agora",
                valor: brl(naGaveta),
                nota: "Troco + dinheiro ± movimentações",
                cor: "var(--text)",
              },
              {
                label: "Movimentações",
                valor: brlDif(saldoMovs(cx.movs)),
                nota: `${cx.movs.length} no turno`,
                cor: saldoMovs(cx.movs) < 0 ? "var(--warn)" : "var(--text)",
              },
            ].map((k) => (
              <div key={k.label} style={css("padding:13px 15px;background:var(--surface)")}>
                <div style={css(ROTULO_KPI)}>{k.label}</div>
                <div style={css(`margin-top:6px;font:700 19px/1.1 ${SANS};${NUM};color:${k.cor}`)}>
                  {k.valor}
                </div>
                <div style={css(`margin-top:4px;font:500 11.5px/1.35 ${SANS};color:var(--muted)`)}>
                  {k.nota}
                </div>
              </div>
            ))}
          </div>

          <div style={css(`display:grid;grid-template-columns:${painelCols};gap:14px`)}>
            {/* Entradas por forma */}
            <div
              style={css(
                "border:1px solid var(--border);border-radius:14px;background:var(--surface);overflow:hidden",
              )}
            >
              <div style={css("padding:14px 16px;border-bottom:1px solid var(--border)")}>
                <div style={css(`font:700 14.5px ${SANS}`)}>Entradas do turno</div>
                <div style={css(`margin-top:3px;font:400 12px/1.4 ${SANS};color:var(--muted)`)}>
                  As vendas em dinheiro entram na gaveta automaticamente. Pix e cartão são conferidos
                  no extrato.
                </div>
              </div>

              <div style={css("display:flex;flex-direction:column")}>
                {FORMAS.map((f) => (
                  <div
                    key={f}
                    style={css(
                      "display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid var(--border)",
                    )}
                  >
                    <span
                      style={css(
                        `flex:none;width:8px;height:8px;border-radius:50%;background:${f === "Dinheiro" ? "var(--pos)" : "var(--accent)"}`,
                      )}
                    />
                    <span style={css("flex:1;min-width:0")}>
                      <span style={css(`display:block;font:600 13.5px ${SANS}`)}>{f}</span>
                      <span
                        style={css(`display:block;margin-top:2px;font:500 11.5px ${SANS};color:var(--muted)`)}
                      >
                        {NOTA_FORMA[f]}
                      </span>
                    </span>
                    <span style={css(`flex:none;font:700 15px ${SANS};${NUM};color:var(--text)`)}>
                      {brl(vendas[f] ?? 0)}
                    </span>
                  </div>
                ))}

                <div
                  style={css(
                    "display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;background:var(--surface2)",
                  )}
                >
                  <span style={css(`font:600 13px ${SANS};color:var(--text2)`)}>
                    Total vendido no turno
                  </span>
                  <span style={css(`font:700 17px ${SANS};${NUM};color:var(--pos)`)}>
                    {brl(totalVendas)}
                  </span>
                </div>
              </div>
            </div>

            {/* Movimentações */}
            <div
              style={css(
                "border:1px solid var(--border);border-radius:14px;background:var(--surface);overflow:hidden",
              )}
            >
              <div style={css("padding:14px 16px;border-bottom:1px solid var(--border)")}>
                <div style={css(`font:700 14.5px ${SANS}`)}>Movimentações da gaveta</div>
                <div style={css(`margin-top:3px;font:400 12px/1.4 ${SANS};color:var(--muted)`)}>
                  Retiradas e entradas de dinheiro que não são venda.
                </div>
              </div>

              <div
                style={css(
                  "display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:13px 16px;border-bottom:1px solid var(--border)",
                )}
              >
                <button
                  onClick={() => {
                    a.set({ formCaixa: { valor: "", motivo: "", obs: "", contadoDinheiro: "" } });
                    a.abrirModal({ k: "caixaMov", tipo: "sangria" });
                  }}
                  className="hv-warn-borda"
                  style={css(
                    `padding:13px 10px;border-radius:11px;border:1px solid var(--border2);background:var(--surface2);color:var(--text);font:600 13px ${SANS}`,
                  )}
                >
                  − Sangria
                </button>
                <button
                  onClick={() => {
                    a.set({ formCaixa: { valor: "", motivo: "", obs: "", contadoDinheiro: "" } });
                    a.abrirModal({ k: "caixaMov", tipo: "reforco" });
                  }}
                  className="hv-pos-borda"
                  style={css(
                    `padding:13px 10px;border-radius:11px;border:1px solid var(--border2);background:var(--surface2);color:var(--text);font:600 13px ${SANS}`,
                  )}
                >
                  + Reforço
                </button>
              </div>

              {cx.movs.length === 0 ? (
                <div style={css("padding:26px 18px;text-align:center")}>
                  <div style={css(`font:600 13px ${SANS}`)}>Nenhuma movimentação neste turno</div>
                  <p style={css(`margin:5px 0 0;font:400 12px/1.5 ${SANS};color:var(--muted)`)}>
                    Use a sangria ao levar dinheiro para o cofre e o reforço ao colocar troco extra.
                  </p>
                </div>
              ) : (
                cx.movs.map((m) => {
                  const e = MOV_CAIXA_ESTILO[m.tipo];
                  return (
                    <div
                      key={m.id}
                      style={css(
                        "display:flex;align-items:center;gap:11px;padding:12px 16px;border-bottom:1px solid var(--border)",
                      )}
                    >
                      <span
                        style={css(
                          `flex:none;padding:4px 9px;border-radius:999px;background:${e.bg};color:${e.cor};font:600 11px ${SANS}`,
                        )}
                      >
                        {e.rotulo}
                      </span>
                      <span style={css("flex:1;min-width:0")}>
                        <span
                          style={css(
                            `display:block;font:500 12.5px/1.35 ${SANS};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
                          )}
                        >
                          {m.motivo}
                        </span>
                        <span
                          style={css(`display:block;margin-top:2px;font:500 11px ${MONO};color:var(--muted)`)}
                        >
                          {m.hora}
                        </span>
                      </span>
                      <span style={css(`flex:none;font:700 13.5px ${SANS};${NUM};color:${e.cor}`)}>
                        {m.tipo === "reforco" ? "+ " : "− "}
                        {brl(m.valor)}
                      </span>
                      <button
                        onClick={() =>
                          a.confirmar({
                            titulo: "Reverter esta movimentação?",
                            texto: "Ela sai do turno e o valor esperado na gaveta volta ao que era.",
                            resumo: `${e.rotulo} de ${brl(m.valor)}`,
                            sub: `${m.hora} · ${m.motivo}`,
                            reversao: "Você pode registrar de novo se precisar.",
                            btn: "Reverter",
                            btnBg: "var(--warn)",
                            btnFg: "#fff",
                            cor: "var(--warn)",
                            acao: () => a.reverterMovCaixa(m.id),
                          })
                        }
                        title="Reverter movimentação"
                        className="hv-warn-borda"
                        style={css(
                          `flex:none;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--muted);font:600 11.5px ${SANS}`,
                        )}
                      >
                        Reverter
                      </button>
                    </div>
                  );
                })
              )}

              <div style={css("padding:13px 16px;background:var(--surface2)")}>
                <button
                  onClick={() => a.abrirModal({ k: "caixaFechar" })}
                  className="hv-brilho"
                  style={css(
                    `width:100%;padding:15px;border-radius:12px;background:var(--warn);color:#fff;font:700 14.5px ${SANS}`,
                  )}
                >
                  Fechar caixa e conferir
                </button>
                <p
                  style={css(
                    `margin:8px 0 0;text-align:center;font:400 11.5px/1.45 ${SANS};color:var(--muted)`,
                  )}
                >
                  Você confere os valores antes de encerrar. Dá para reabrir se fechar por engano.
                </p>
              </div>
            </div>
          </div>

          {/* O esperado por forma, já visível antes de abrir a conferência. */}
          <p style={css(`margin:12px 0 0;font:500 11.5px ${SANS};color:var(--muted)`)}>
            Se fechasse agora, o esperado seria{" "}
            {FORMAS.map((f) => `${f} ${brl(esperado[f])}`).join(" · ")}.
          </p>
        </div>
      )}

      <HistoricoTurnos />
    </div>
  );
}

function HistoricoTurnos() {
  const { isDesktop, d } = usePortal();
  const cols = "96px minmax(0,1fr) 120px 110px 110px 110px 44px";

  return (
    <div style={css("margin-top:22px")}>
      <div style={css("display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:10px")}>
        <div>
          <h2 style={css(`margin:0;font:700 16px ${SANS}`)}>Turnos já fechados</h2>
          <p style={css(`margin:3px 0 0;font:400 12.5px ${SANS};color:var(--muted)`)}>
            Confira o que foi conferido em cada dia e se houve sobra ou falta.
          </p>
        </div>
      </div>

      {d.caixasFechados.length === 0 ? (
        <Vazio
          titulo="Nenhum turno fechado ainda"
          texto="Quando você fechar o primeiro caixa, o resumo do dia aparece aqui com a conferência e a diferença."
        />
      ) : (
        <div style={css(LISTA + ";overflow:visible")}>
          {isDesktop && (
            <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;${CABECALHO_TABELA}`)}>
              <span style={css(rotuloColuna())}>DIA</span>
              <span style={css(rotuloColuna())}>OPERADOR</span>
              <span style={css(rotuloColuna("right"))}>TROCO INICIAL</span>
              <span style={css(rotuloColuna("right"))}>VENDAS</span>
              <span style={css(rotuloColuna("right"))}>CONFERIDO</span>
              <span style={css(rotuloColuna("right"))}>DIFERENÇA</span>
              <span />
            </div>
          )}
          {d.caixasFechados.map((c) => (
            <LinhaTurno key={c.id} caixa={c} cols={cols} />
          ))}
        </div>
      )}
    </div>
  );
}

function LinhaTurno({ caixa: c, cols }: { caixa: CaixaFechado; cols: string }) {
  const { a, isDesktop } = usePortal();

  // O esperado e a diferença vêm carimbados de `close_cash_register`: recalcular
  // aqui poderia divergir do que ficou gravado no fechamento.
  const conferido = c.contadoDinheiro;
  const dif = c.diferenca;
  const estilo = corDif(dif);

  const acoes = [
    { texto: "Ver resumo do turno", onClick: () => a.abrirModal({ k: "caixaDetalhe", id: c.id }) },
    {
      texto: "Reabrir este caixa",
      cor: "var(--warn)",
      onClick: () =>
        a.confirmar({
          titulo: "Reabrir este caixa?",
          texto: "O turno volta a ficar aberto e aceita novas vendas e movimentações.",
          resumo: `Turno de ${rotuloData(c.d, "")}`,
          sub: `${c.abertura} às ${c.fechamento} · ${c.operador}`,
          reversao: "Você pode fechar de novo a qualquer momento.",
          btn: "Reabrir caixa",
          btnBg: "var(--warn)",
          btnFg: "#fff",
          cor: "var(--warn)",
          acao: () => a.reabrirCaixa(c.id),
        }),
    },
  ];

  return (
    <div style={css("position:relative;background:var(--surface)")}>
      {isDesktop ? (
        <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;align-items:center;padding:13px 14px`)}>
          <span style={css(`font:600 12px ${MONO};color:var(--text2);${NUM}`)}>{rotuloData(c.d, "")}</span>
          <span
            style={css(`min-width:0;font:500 13px ${SANS};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`)}
          >
            {c.operador}
          </span>
          <span style={css(`text-align:right;font:500 12.5px ${SANS};color:var(--text2);${NUM}`)}>
            {brl(c.inicial)}
          </span>
          <span style={css(`text-align:right;font:600 12.5px ${SANS};${NUM}`)}>
            {brl(somaFormas(c.vendas))}
          </span>
          <span style={css(`text-align:right;font:600 12.5px ${SANS};${NUM}`)}>{brl(conferido)}</span>
          <span style={css("text-align:right")}>
            <span
              style={css(
                `padding:3px 9px;border-radius:999px;background:${estilo.bg};color:${estilo.cor};font:600 11.5px ${SANS};${NUM}`,
              )}
            >
              {brlDif(dif)}
            </span>
          </span>
          <MenuLinha chave={`turno:${c.id}`} acoes={acoes} largura={216} />
        </div>
      ) : (
        <div style={css("display:flex;gap:10px;padding:13px 14px")}>
          <div style={css("flex:1;min-width:0")}>
            <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap")}>
              <span style={css(`font:600 11.5px ${MONO};color:var(--muted)`)}>{rotuloData(c.d, "")}</span>
              <span
                style={css(
                  `padding:2px 8px;border-radius:999px;background:${estilo.bg};color:${estilo.cor};font:600 10.5px ${SANS}`,
                )}
              >
                {estilo.rotulo}
              </span>
            </div>
            <div style={css(`margin-top:5px;font:500 13px/1.35 ${SANS}`)}>{c.operador}</div>
            <div style={css(`margin-top:4px;font:500 11.5px ${SANS};color:var(--muted)`)}>
              Vendas {brl(somaFormas(c.vendas))} · conferido {brl(conferido)}
            </div>
          </div>
          <MenuLinha chave={`turno:${c.id}`} acoes={acoes} largura={216} />
        </div>
      )}
    </div>
  );
}
