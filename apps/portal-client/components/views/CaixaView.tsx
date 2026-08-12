"use client";

import { usePortal } from "@/components/PortalProvider";
import { RowMenu } from "@/components/ui";
import { primaryButton, Button, TABLE_HEADER, ScreenHeader, css, kpiStrip, LIST, MONO, NUM, KPI_LABEL, columnLabel, SANS, Empty } from "@aguiar/ui";
import { REGISTER_MOVEMENT_STYLE, movementsBalance, sumByMethod } from "@/lib/dados/caixa";
import { METHODS, METHOD_NOTE, PAYMENT_LABEL } from "@/lib/dados/vendas";
import { brl, brlDelta, deltaColor, dateLabel } from "@/lib/formato";
import { cashInDrawer, expectedInShift, salesInShift } from "@/lib/selectors";
import type { ClosedRegister } from "@/types/types";

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
  const cx = d.openRegister;

  const sales = salesInShift(d);
  const salesTotal = sumByMethod(sales);
  const inDrawer = cashInDrawer(d);
  const expected = expectedInShift(d);

  const indicatorCols = isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))";
  const panelCols = isDesktop ? "minmax(0,1fr) minmax(0,1fr)" : "1fr";

  return (
    <div>
      <ScreenHeader
        title="Caixa"
        subtitle="Abra o turno com o troco, acompanhe o dinheiro do dia e feche conferindo."
        action={
          cx ? (
            <div style={css("display:flex;align-items:center;gap:9px")}>
              <span
                style={css(
                  `display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:999px;background:var(--pos-soft);color:var(--pos);font:600 12px ${SANS}`,
                )}
              >
                <span style={css("width:7px;height:7px;border-radius:50%;background:var(--pos)")} />
                Aberto desde {cx.openedAt}
              </span>
              {isDesktop && (
                <Button
                  onClick={() => a.openModal({ k: "closeRegister" })}
                  className="hv-brilho"
                  style={css(`${primaryButton()};background:var(--warn);color:#fff`)}
                >
                  Fechar caixa
                </Button>
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
          <Button
            onClick={() => a.openModal({ k: "openRegister" })}
            className="hv-brilho"
            style={css(`margin-top:10px;padding:16px 30px;border-radius:13px;${primaryButton("lg")}`)}
          >
            Abrir caixa
          </Button>
        </div>
      ) : (
        <div>
          <div style={css(kpiStrip(indicatorCols) + ";margin-bottom:16px")}>
            {[
              {
                label: "Troco inicial",
                value: brl(cx.opening),
                note: `Aberto às ${cx.openedAt}`,
                color: "var(--text)",
              },
              {
                label: "Vendido no turno",
                value: brl(salesTotal),
                note: "Todas as formas somadas",
                color: "var(--pos)",
              },
              {
                label: "Na gaveta agora",
                value: brl(inDrawer),
                note: "Troco + dinheiro ± movimentações",
                color: "var(--text)",
              },
              {
                label: "Movimentações",
                value: brlDelta(movementsBalance(cx.movements)),
                note: `${cx.movements.length} no turno`,
                color: movementsBalance(cx.movements) < 0 ? "var(--warn)" : "var(--text)",
              },
            ].map((k) => (
              <div key={k.label} style={css("padding:13px 15px;background:var(--surface)")}>
                <div style={css(KPI_LABEL)}>{k.label}</div>
                <div style={css(`margin-top:6px;font:700 19px/1.1 ${SANS};${NUM};color:${k.color}`)}>
                  {k.value}
                </div>
                <div style={css(`margin-top:4px;font:500 11.5px/1.35 ${SANS};color:var(--muted)`)}>
                  {k.note}
                </div>
              </div>
            ))}
          </div>

          <div style={css(`display:grid;grid-template-columns:${panelCols};gap:14px`)}>
            {/* Entradas por forma */}
            <div
              style={css(
                "border:1px solid var(--border);border-radius:14px;background:var(--surface);overflow:hidden",
              )}
            >
              <div style={css("padding:14px 16px;border-bottom:1px solid var(--border)")}>
                <div style={css(`font:700 14.5px ${SANS}`)}>Entradas do turno</div>
                <div style={css(`margin-top:3px;font:400 12px/1.4 ${SANS};color:var(--muted)`)}>
                  As vendas em dinheiro entram na gaveta automaticamente. pix e cartão são conferidos
                  no extrato.
                </div>
              </div>

              <div style={css("display:flex;flex-direction:column")}>
                {METHODS.map((f) => (
                  <div
                    key={f}
                    style={css(
                      "display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid var(--border)",
                    )}
                  >
                    <span
                      style={css(
                        `flex:none;width:8px;height:8px;border-radius:50%;background:${f === "cash" ? "var(--pos)" : "var(--accent)"}`,
                      )}
                    />
                    <span style={css("flex:1;min-width:0")}>
                      <span style={css(`display:block;font:600 13.5px ${SANS}`)}>{PAYMENT_LABEL[f]}</span>
                      <span
                        style={css(`display:block;margin-top:2px;font:500 11.5px ${SANS};color:var(--muted)`)}
                      >
                        {METHOD_NOTE[f]}
                      </span>
                    </span>
                    <span style={css(`flex:none;font:700 15px ${SANS};${NUM};color:var(--text)`)}>
                      {brl(sales[f] ?? 0)}
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
                    {brl(salesTotal)}
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
                  Retiradas e entradas de dinheiro que não são sale.
                </div>
              </div>

              <div
                style={css(
                  "display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:13px 16px;border-bottom:1px solid var(--border)",
                )}
              >
                <Button
                  onClick={() => {
                    a.set({ registerForm: { amount: "", reason: "", obs: "", countedCash: "" } });
                    a.openModal({ k: "registerMovement", type: "withdrawal" });
                  }}
                  className="hv-warn-borda"
                  style={css(
                    `padding:13px 10px;border-radius:11px;border:1px solid var(--border2);background:var(--surface2);color:var(--text);font:600 13px ${SANS}`,
                  )}
                >
                  − Sangria
                </Button>
                <Button
                  onClick={() => {
                    a.set({ registerForm: { amount: "", reason: "", obs: "", countedCash: "" } });
                    a.openModal({ k: "registerMovement", type: "deposit" });
                  }}
                  className="hv-pos-borda"
                  style={css(
                    `padding:13px 10px;border-radius:11px;border:1px solid var(--border2);background:var(--surface2);color:var(--text);font:600 13px ${SANS}`,
                  )}
                >
                  + Reforço
                </Button>
              </div>

              {cx.movements.length === 0 ? (
                <div style={css("padding:26px 18px;text-align:center")}>
                  <div style={css(`font:600 13px ${SANS}`)}>Nenhuma movimentação neste turno</div>
                  <p style={css(`margin:5px 0 0;font:400 12px/1.5 ${SANS};color:var(--muted)`)}>
                    Use a withdrawal ao levar dinheiro para o cofre e o reforço ao colocar troco extra.
                  </p>
                </div>
              ) : (
                cx.movements.map((m) => {
                  const e = REGISTER_MOVEMENT_STYLE[m.type];
                  return (
                    <div
                      key={m.id}
                      style={css(
                        "display:flex;align-items:center;gap:11px;padding:12px 16px;border-bottom:1px solid var(--border)",
                      )}
                    >
                      <span
                        style={css(
                          `flex:none;padding:4px 9px;border-radius:999px;background:${e.bg};color:${e.color};font:600 11px ${SANS}`,
                        )}
                      >
                        {e.label}
                      </span>
                      <span style={css("flex:1;min-width:0")}>
                        <span
                          style={css(
                            `display:block;font:500 12.5px/1.35 ${SANS};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
                          )}
                        >
                          {m.reason}
                        </span>
                        <span
                          style={css(`display:block;margin-top:2px;font:500 11px ${MONO};color:var(--muted)`)}
                        >
                          {m.time}
                        </span>
                      </span>
                      <span style={css(`flex:none;font:700 13.5px ${SANS};${NUM};color:${e.color}`)}>
                        {m.type === "deposit" ? "+ " : "− "}
                        {brl(m.amount)}
                      </span>
                      <Button
                        onClick={() =>
                          a.confirm({
                            title: "Reverter esta movimentação?",
                            text: "Ela sai do turno e o valor esperado na gaveta volta ao que era.",
                            summary: `${e.label} de ${brl(m.amount)}`,
                            detail: `${m.time} · ${m.reason}`,
                            reversal: "Você pode registrar de novo se precisar.",
                            button: "Reverter",
                            buttonBg: "var(--warn)",
                            buttonInk: "#fff",
                            color: "var(--warn)",
                            action: () => a.undoRegisterMovement(m.id),
                          })
                        }
                        title="Reverter movimentação"
                        className="hv-warn-borda"
                        style={css(
                          `flex:none;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--muted);font:600 11.5px ${SANS}`,
                        )}
                      >
                        Reverter
                      </Button>
                    </div>
                  );
                })
              )}

              <div style={css("padding:13px 16px;background:var(--surface2)")}>
                <Button
                  onClick={() => a.openModal({ k: "closeRegister" })}
                  className="hv-brilho"
                  style={css(
                    `width:100%;padding:15px;border-radius:12px;background:var(--warn);color:#fff;font:700 14.5px ${SANS}`,
                  )}
                >
                  Fechar caixa e conferir
                </Button>
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
            {METHODS.map((f) => `${PAYMENT_LABEL[f]} ${brl(expected[f])}`).join(" · ")}.
          </p>
        </div>
      )}

      <ShiftHistory />
    </div>
  );
}

function ShiftHistory() {
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
        <Empty
          title="Nenhum turno fechado ainda"
          text="Quando você fechar o primeiro caixa, o resumo do dia aparece aqui com a conferência e a diferença."
        />
      ) : (
        <div style={css(LIST + ";overflow:visible")}>
          {isDesktop && (
            <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;${TABLE_HEADER}`)}>
              <span style={css(columnLabel())}>DIA</span>
              <span style={css(columnLabel())}>OPERADOR</span>
              <span style={css(columnLabel("right"))}>TROCO INICIAL</span>
              <span style={css(columnLabel("right"))}>VENDAS</span>
              <span style={css(columnLabel("right"))}>CONFERIDO</span>
              <span style={css(columnLabel("right"))}>DIFERENÇA</span>
              <span />
            </div>
          )}
          {d.caixasFechados.map((c) => (
            <ShiftRow key={c.id} register={c} cols={cols} />
          ))}
        </div>
      )}
    </div>
  );
}

function ShiftRow({ register: c, cols }: { register: ClosedRegister; cols: string }) {
  const { a, isDesktop } = usePortal();

  // O esperado e a diferença vêm carimbados de `close_cash_register`: recalcular
  // aqui poderia divergir do que ficou gravado no fechamento.
  const counted = c.countedCash;
  const delta = c.difference;
  const cssText = deltaColor(delta);

  const actions = [
    { text: "Ver resumo do turno", onClick: () => a.openModal({ k: "registerDetail", id: c.id }) },
    {
      text: "Reabrir este caixa",
      color: "var(--warn)",
      onClick: () =>
        a.confirm({
          title: "Reabrir este caixa?",
          text: "O turno volta a ficar aberto e aceita novas vendas e movimentações.",
          summary: `Turno de ${dateLabel(c.d, "")}`,
          detail: `${c.openedAt} às ${c.closedAt} · ${c.operator}`,
          reversal: "Você pode fechar de novo a qualquer momento.",
          button: "Reabrir caixa",
          buttonBg: "var(--warn)",
          buttonInk: "#fff",
          color: "var(--warn)",
          action: () => a.reopenRegister(c.id),
        }),
    },
  ];

  return (
    <div style={css("position:relative;background:var(--surface)")}>
      {isDesktop ? (
        <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;align-items:center;padding:13px 14px`)}>
          <span style={css(`font:600 12px ${MONO};color:var(--text2);${NUM}`)}>{dateLabel(c.d, "")}</span>
          <span
            style={css(`min-width:0;font:500 13px ${SANS};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`)}
          >
            {c.operator}
          </span>
          <span style={css(`text-align:right;font:500 12.5px ${SANS};color:var(--text2);${NUM}`)}>
            {brl(c.opening)}
          </span>
          <span style={css(`text-align:right;font:600 12.5px ${SANS};${NUM}`)}>
            {brl(sumByMethod(c.sales))}
          </span>
          <span style={css(`text-align:right;font:600 12.5px ${SANS};${NUM}`)}>{brl(counted)}</span>
          <span style={css("text-align:right")}>
            <span
              style={css(
                `padding:3px 9px;border-radius:999px;background:${cssText.bg};color:${cssText.color};font:600 11.5px ${SANS};${NUM}`,
              )}
            >
              {brlDelta(delta)}
            </span>
          </span>
          <RowMenu menuKey={`turno:${c.id}`} actions={actions} width={216} />
        </div>
      ) : (
        <div style={css("display:flex;gap:10px;padding:13px 14px")}>
          <div style={css("flex:1;min-width:0")}>
            <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap")}>
              <span style={css(`font:600 11.5px ${MONO};color:var(--muted)`)}>{dateLabel(c.d, "")}</span>
              <span
                style={css(
                  `padding:2px 8px;border-radius:999px;background:${cssText.bg};color:${cssText.color};font:600 10.5px ${SANS}`,
                )}
              >
                {cssText.label}
              </span>
            </div>
            <div style={css(`margin-top:5px;font:500 13px/1.35 ${SANS}`)}>{c.operator}</div>
            <div style={css(`margin-top:4px;font:500 11.5px ${SANS};color:var(--muted)`)}>
              Vendas {brl(sumByMethod(c.sales))} · conferido {brl(counted)}
            </div>
          </div>
          <RowMenu menuKey={`turno:${c.id}`} actions={actions} width={216} />
        </div>
      )}
    </div>
  );
}
