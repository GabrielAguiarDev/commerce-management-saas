"use client";

import { useAdmin } from "@/components/AdminProvider";
import { css, MONO } from "@/lib/css";
import { AreaTexto } from "@/components/campos";
import { CampoBusca } from "@/components/shared";
import { chamadoAtual } from "@/lib/state";
import { badgeChamado, chip, prioridadeBadge } from "@/lib/styleKit";
import type { StatusChamado } from "@/types/types";

export function SuporteView() {
  const { s, a, cs, vazio } = useAdmin();
  const { L } = a;
  const id = s.idioma;

  const t = chamadoAtual(s);
  const clienteChamado =
    (t && (cs.find((x) => x.id === t.clienteId) || s.clientes.find((x) => x.id === t.clienteId))) ||
    null;
  const nomeCliente = clienteChamado ? clienteChamado.nome : L.cliente;

  const qc = s.buscaChamado.trim().toLowerCase();
  const lista = s.chamados.filter((x) => {
    const cl = cs.find((y) => y.id === x.clienteId);
    return (
      (s.filtroChamado === "todos" || x.status === s.filtroChamado) &&
      (!qc || (cl && cl.nome.toLowerCase().includes(qc)) || x.assunto[id].toLowerCase().includes(qc))
    );
  });

  const rotuloStatus = (st: StatusChamado) =>
    st === "aberto" ? L.aberto : st === "andamento" ? L.andamento : L.resolvido;

  const marcar = (status: StatusChamado) =>
    a.set((st) => ({
      chamados: st.chamados.map((x) => (x.id === st.chamadoSel ? { ...x, status } : x)),
    }));

  const enviarResposta = () =>
    a.set((st) => {
      const txt = st.resposta.trim();
      if (!txt) return null;
      // Toast after the state settles so it does not fire during the update.
      setTimeout(() => a.toast(L.toastResposta), 0);
      return {
        resposta: "",
        chamados: st.chamados.map((x) =>
          x.id === st.chamadoSel
            ? {
                ...x,
                // Replying reopens work on a ticket unless it is already closed.
                status: x.status === "resolvido" ? x.status : "andamento",
                msgs: [...x.msgs, { de: "admin" as const, texto: txt, quando: "24/07 · agora" }],
              }
            : x,
        ),
      };
    });

  const botaoCabecalho =
    "border:1px solid var(--line);background:var(--panel);color:var(--tx2);font-size:12px;" +
    "padding:8px 12px;border-radius:8px;cursor:pointer";

  return (
    <div style={css("display:flex;flex-wrap:wrap;gap:16px;align-items:stretch")}>
      <section
        style={css(
          "flex:1 1 340px;max-width:400px;background:var(--panel);border:1px solid var(--line);" +
            "border-radius:12px;display:flex;flex-direction:column;overflow:hidden;min-height:560px",
        )}
      >
        <div
          style={css(
            "padding:14px 16px;border-bottom:1px solid var(--lineSoft);display:flex;" +
              "flex-direction:column;gap:10px",
          )}
        >
          <CampoBusca
            valor={s.buscaChamado}
            onChange={(v) => a.set({ buscaChamado: v })}
            placeholder={L.buscarChamado}
            estiloCaixa=""
            compacto
          />
          <div style={css("display:flex;gap:6px;flex-wrap:wrap")}>
            {(
              [
                ["todos", L.todosChamados],
                ["aberto", L.aberto],
                ["andamento", L.andamento],
                ["resolvido", L.resolvido],
              ] as const
            ).map(([k, rotulo]) => (
              <button
                key={k}
                onClick={() => a.set({ filtroChamado: k })}
                style={css(chip(s.filtroChamado === k))}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>

        <div style={css("flex:1;overflow-y:auto")}>
          {(vazio || s.chamados.length === 0) && (
            <div
              style={css(
                "display:flex;flex-direction:column;align-items:center;gap:11px;" +
                  "padding:52px 20px;text-align:center",
              )}
            >
              <div
                style={css(
                  "width:44px;height:44px;border-radius:12px;background:var(--okBg);" +
                    "border:1px solid var(--okLine);color:var(--ok);display:flex;" +
                    "align-items:center;justify-content:center;font-size:17px;font-weight:700",
                )}
              >
                ✓
              </div>
              <span style={css("font-size:13.5px;font-weight:600;color:var(--tx)")}>
                {L.vazioSuporteTitulo}
              </span>
              <span
                style={css("font-size:12px;color:var(--tx2);line-height:1.55;max-width:32ch")}
              >
                {L.vazioSuporteTexto}
              </span>
            </div>
          )}

          {(vazio ? [] : lista).map((x) => {
            const cl = cs.find((y) => y.id === x.clienteId);
            return (
              <div
                key={x.id}
                onClick={() => a.set({ chamadoSel: x.id })}
                style={css(
                  "display:flex;flex-direction:column;gap:7px;padding:13px 16px;" +
                    "border-bottom:1px solid var(--lineSoft);cursor:pointer;" +
                    (x.id === s.chamadoSel
                      ? "background:var(--accSoft);box-shadow:inset 3px 0 0 var(--acc);"
                      : ""),
                )}
              >
                <div
                  style={css(
                    "display:flex;align-items:center;justify-content:space-between;gap:10px",
                  )}
                >
                  <span
                    style={css(
                      "font-size:12.5px;font-weight:600;color:var(--tx);white-space:nowrap;" +
                        "overflow:hidden;text-overflow:ellipsis",
                    )}
                  >
                    {cl ? cl.nome : L.cliente}
                  </span>
                  <span style={css(prioridadeBadge(x.prioridade))}>
                    {x.prioridade === "alta" ? L.alta : x.prioridade === "media" ? L.media : L.baixa}
                  </span>
                </div>
                <span style={css("font-size:12.5px;color:var(--tx2);line-height:1.4")}>
                  {x.assunto[id]}
                </span>
                <div
                  style={css(
                    "display:flex;align-items:center;justify-content:space-between;gap:10px",
                  )}
                >
                  <span style={css(badgeChamado(x.status))}>{rotuloStatus(x.status)}</span>
                  <span style={css(`font-family:${MONO};font-size:10.5px;color:var(--tx3)`)}>
                    {x.data}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section
        style={css(
          "flex:6 1 440px;min-width:0;background:var(--panel);border:1px solid var(--line);" +
            "border-radius:12px;display:flex;flex-direction:column;overflow:hidden;min-height:560px",
        )}
      >
        <div
          style={css(
            "padding:16px 20px;border-bottom:1px solid var(--lineSoft);display:flex;" +
              "align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;" +
              "background:var(--panel2)",
          )}
        >
          <div style={css("display:flex;flex-direction:column;gap:5px;min-width:0")}>
            <h3 style={css("margin:0;font-size:15.5px;font-weight:600;color:var(--tx)")}>
              {t ? t.assunto[id] : ""}
            </h3>
            <div style={css("display:flex;align-items:center;gap:9px;flex-wrap:wrap")}>
              <span style={css("font-size:12.5px;color:var(--tx2)")}>{nomeCliente}</span>
              <span style={css("color:var(--tx3);font-size:11px")}>·</span>
              <span style={css(`font-family:${MONO};font-size:11.5px;color:var(--tx3)`)}>
                {t ? t.data : ""}
              </span>
              {t && <span style={css(badgeChamado(t.status))}>{rotuloStatus(t.status)}</span>}
            </div>
          </div>

          <div style={css("display:flex;gap:7px;flex-wrap:wrap")}>
            <button
              onClick={() => clienteChamado && a.abrirCliente(clienteChamado.id)}
              className="hv-acc-line"
              style={css(botaoCabecalho)}
            >
              {L.verCliente}
            </button>
            <button
              onClick={() => marcar("andamento")}
              className="hv-acc-line"
              style={css(botaoCabecalho)}
            >
              {L.emAndamento}
            </button>
            <button
              onClick={() => marcar("resolvido")}
              className="hv-bright-sm"
              style={css(
                "border:1px solid var(--okLine);background:var(--okBg);color:var(--ok);" +
                  "font-size:12px;font-weight:500;padding:8px 12px;border-radius:8px;cursor:pointer",
              )}
            >
              {L.marcarResolvido}
            </button>
          </div>
        </div>

        <div
          style={css(
            "flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:14px;" +
              "background:var(--bg)",
          )}
        >
          {(t ? t.msgs : []).map((m, i) => {
            const adm = m.de === "admin";
            return (
              <div
                key={i}
                style={css(
                  "display:flex;" + (adm ? "justify-content:flex-end" : "justify-content:flex-start"),
                )}
              >
                <div
                  style={css(
                    "max-width:70%;display:flex;flex-direction:column;gap:5px;padding:12px 14px;" +
                      "border-radius:12px;" +
                      (adm
                        ? "background:var(--acc);color:var(--accTx);border-bottom-right-radius:4px;"
                        : "background:var(--panel);border:1px solid var(--line);color:var(--tx);" +
                          "border-bottom-left-radius:4px;"),
                  )}
                >
                  <span
                    style={css(
                      "font-size:10.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;" +
                        "opacity:" +
                        (adm ? ".8" : ".55"),
                    )}
                  >
                    {adm ? L.voce : nomeCliente}
                  </span>
                  <p style={css("margin:0;font-size:13px;line-height:1.55")}>
                    {typeof m.texto === "string" ? m.texto : m.texto[id]}
                  </p>
                  <span
                    style={css(
                      `font-family:${MONO};font-size:10px;opacity:` + (adm ? ".75" : ".55"),
                    )}
                  >
                    {m.quando}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={css(
            "padding:14px 20px;border-top:1px solid var(--lineSoft);display:flex;gap:10px;" +
              "align-items:flex-end;background:var(--panel)",
          )}
        >
          <AreaTexto
            value={s.resposta}
            onChange={(e) => a.set({ resposta: e.target.value })}
            placeholder={L.escrevaResposta}
            aria-label={L.escrevaResposta}
            estilo="flex:1;resize:none;min-height:64px;line-height:1.5"
          />
          <button
            onClick={enviarResposta}
            className="hv-bright"
            style={css(
              "background:var(--acc);border:1px solid var(--acc);color:var(--accTx);font-size:13px;" +
                "font-weight:500;padding:11px 18px;border-radius:9px;cursor:pointer",
            )}
          >
            {L.responder}
          </button>
        </div>
      </section>
    </div>
  );
}
