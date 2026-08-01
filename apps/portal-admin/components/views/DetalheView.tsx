"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAdmin } from "@/components/AdminProvider";
import { css, MONO } from "@/lib/css";
import { TagAcesso } from "@/components/shared";
import { ROTAS } from "@/lib/rotas";
import { clientePorId, estaSujo } from "@/lib/state";
import { iconeMod, iniciais, nomePlano, planoBadge, statusBadge } from "@/lib/styleKit";

const ORDEM_PLANOS = ["Gratuito", "Pago", "Customizado"];

export function DetalheView({ clienteId }: { clienteId: number }) {
  const { s, a, opts } = useAdmin();
  const { L } = a;
  const router = useRouter();
  const id = s.idioma;
  const c = clientePorId(s, clienteId);

  // Opening the record — or arriving back on it via the browser — must find a
  // draft to edit. `garantirRascunho` keeps an existing one for this customer.
  useEffect(() => {
    if (c) a.garantirRascunho(clienteId);
  });

  // A deleted customer leaves a dead URL; send it back to the list.
  useEffect(() => {
    if (!c) router.replace(ROTAS.clientes);
  }, [c, router]);

  if (!c) return null;

  // The draft only applies to the customer it was opened for; otherwise the
  // saved record is what we render.
  const r =
    s.rascunho && s.rascunho.id === c.id
      ? s.rascunho
      : { plano: c.plano, mods: c.mods, valor: c.valor };
  const sujo = estaSujo(s);
  const custom = r.plano === "Customizado";

  const rotuloCampo =
    "font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--tx3);font-weight:600";

  const trocarPlano = () =>
    a.editarRascunho((d) => {
      const novo = ORDEM_PLANOS[(ORDEM_PLANOS.indexOf(d.plano) + 1) % ORDEM_PLANOS.length];
      return {
        ...d,
        plano: novo,
        valor:
          novo === "Gratuito"
            ? "—"
            : novo === "Pago"
              ? "R$ 89,00"
              : c.valor !== "—"
                ? c.valor
                : "R$ 149,00",
      };
    });

  return (
    <div style={css("display:flex;flex-direction:column;gap:16px")}>
      <button
        onClick={() => a.ir(ROTAS.clientes)}
        className="hv-acc"
        style={css(
          "align-self:flex-start;background:none;border:none;color:var(--tx2);font-size:12.5px;" +
            "cursor:pointer;padding:0",
        )}
      >
        ← {L.voltar}
      </button>

      <section
        style={css(
          "background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:22px 24px;" +
            "display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap",
        )}
      >
        <div
          style={css(
            "width:58px;height:58px;flex:none;border-radius:14px;display:flex;align-items:center;" +
              "justify-content:center;font-size:18px;font-weight:600;background:var(--accSoft);color:var(--acc)",
          )}
        >
          {iniciais(c.nome)}
        </div>

        <div style={css("flex:1;min-width:240px;display:flex;flex-direction:column;gap:10px")}>
          <div style={css("display:flex;align-items:center;gap:10px;flex-wrap:wrap")}>
            <h2
              style={css(
                "margin:0;font-size:22px;font-weight:600;letter-spacing:-.02em;color:var(--tx)",
              )}
            >
              {c.nome}
            </h2>
            <span style={css(planoBadge(r.plano))}>{nomePlano(s.planos, r.plano, id)}</span>
            <span style={css(statusBadge(c.status))}>
              {c.status === "ativo"
                ? id === "pt"
                  ? "Ativo"
                  : "Active"
                : id === "pt"
                  ? "Inativo"
                  : "Inactive"}
            </span>
          </div>

          <div style={css("display:flex;gap:26px;flex-wrap:wrap")}>
            <div style={css("display:flex;flex-direction:column;gap:3px")}>
              <span style={css(rotuloCampo)}>{L.segmento}</span>
              <span style={css("font-size:13px;color:var(--tx)")}>{c.segmento[id]}</span>
            </div>
            <div style={css("display:flex;flex-direction:column;gap:3px")}>
              <span style={css(rotuloCampo)}>{L.responsavel}</span>
              <span style={css("font-size:13px;color:var(--tx)")}>{c.resp}</span>
            </div>
            <div style={css("display:flex;flex-direction:column;gap:3px")}>
              <span style={css(rotuloCampo)}>{L.cadastro}</span>
              <span style={css(`font-family:${MONO};font-size:12.5px;color:var(--tx)`)}>
                {c.data}
              </span>
            </div>
            <div style={css("display:flex;flex-direction:column;gap:3px")}>
              <span style={css(rotuloCampo)}>{L.cidade}</span>
              <span style={css("font-size:13px;color:var(--tx)")}>{c.cidade}</span>
            </div>

            {opts.mostrarValorMensal && (
              <div style={css("display:flex;flex-direction:column;gap:3px")}>
                <span style={css(rotuloCampo)}>{L.mensalidade}</span>
                {/* Only a custom plan has a negotiable fee; the others are fixed. */}
                {custom ? (
                  <input
                    value={r.valor}
                    onChange={(e) =>
                      a.editarRascunho((d) => ({ ...d, valor: e.target.value }))
                    }
                    aria-label={L.mensalidade}
                    title={L.mensalidadeAjuda}
                    style={css(
                      `width:104px;font-family:${MONO};font-size:12.5px;color:var(--tx);` +
                        "background:var(--field);border:1px solid var(--line);border-radius:7px;" +
                        "padding:4px 8px;outline:none",
                    )}
                  />
                ) : (
                  <span style={css(`font-family:${MONO};font-size:12.5px;color:var(--tx3)`)}>
                    {r.valor}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={css("display:flex;gap:8px;align-items:center;flex-wrap:wrap")}>
          <button
            onClick={trocarPlano}
            className="hv-acc-line"
            style={css(
              "border:1px solid var(--line);background:var(--panel);color:var(--tx2);" +
                "font-size:12.5px;font-weight:500;padding:9px 14px;border-radius:9px;cursor:pointer",
            )}
          >
            {L.mudarPlano}
          </button>
          <button
            onClick={() => a.abrirModal(c.status === "ativo" ? "desativar" : "reativar", c.id)}
            style={css(
              "font-size:12.5px;font-weight:500;padding:9px 14px;border-radius:9px;cursor:pointer;" +
                (c.status === "ativo"
                  ? "border:1px solid var(--badLine);background:var(--badBg);color:var(--bad);"
                  : "border:1px solid var(--acc);background:var(--acc);color:var(--accTx);"),
            )}
          >
            {c.status === "ativo" ? L.desativar : L.reativar}
          </button>
        </div>
      </section>

      <section
        style={css(
          "background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden",
        )}
      >
        <div
          style={css(
            "display:flex;align-items:flex-start;justify-content:space-between;gap:20px;" +
              "flex-wrap:wrap;padding:20px 24px;border-bottom:1px solid var(--lineSoft);background:var(--panel2)",
          )}
        >
          <div style={css("display:flex;flex-direction:column;gap:4px")}>
            <h3 style={css("margin:0;font-size:16px;font-weight:600;color:var(--tx)")}>
              {L.modulosDoCliente}
            </h3>
            <p style={css("margin:0;font-size:12.5px;color:var(--tx2);max-width:54ch")}>
              {L.modulosAjuda}
            </p>
          </div>

          <div style={css("display:flex;align-items:center;gap:14px;flex:none")}>
            <div style={css("display:flex;flex-direction:column;align-items:flex-end;gap:2px")}>
              <span
                style={css(
                  `font-family:${MONO};font-size:20px;font-weight:600;color:var(--acc);line-height:1`,
                )}
              >
                {r.mods.length}/{s.modulos.length}
              </span>
              <span style={css("font-size:11px;color:var(--tx3)")}>{L.modulosAtivos}</span>
            </div>
            <div style={css("display:flex;gap:6px")}>
              <button
                onClick={() => a.abrirModal("todos")}
                className="hv-acc-line"
                style={css(
                  "border:1px solid var(--line);background:var(--panel);color:var(--tx2);" +
                    "font-size:11.5px;padding:7px 11px;border-radius:7px;cursor:pointer",
                )}
              >
                {L.ativarTodos}
              </button>
              <button
                onClick={() => a.abrirModal("limpar")}
                className="hv-tx"
                style={css(
                  "border:1px solid var(--line);background:var(--panel);color:var(--tx3);" +
                    "font-size:11.5px;padding:7px 11px;border-radius:7px;cursor:pointer",
                )}
              >
                {L.limpar}
              </button>
            </div>
          </div>
        </div>

        <div
          style={css(
            "display:grid;grid-template-columns:repeat(auto-fit,minmax(232px,1fr));gap:14px;" +
              "padding:20px 24px;max-width:" +
              Math.min(4, Math.max(2, opts.colunasModulos)) * 400 +
              "px",
          )}
        >
          {s.modulos.map((m) => {
            const on = r.mods.includes(m.k);
            return (
              <div
                key={m.k}
                onClick={() =>
                  on
                    ? a.abrirModal("modOff", null, null, m.k)
                    : a.editarRascunho((d) => ({ ...d, mods: [...d.mods, m.k] }))
                }
                style={css(
                  "display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:11px;" +
                    "cursor:pointer;transition:border-color .12s,background .12s;" +
                    (on
                      ? "border:1px solid var(--accLine);background:var(--accSoft);"
                      : "border:1px solid var(--lineSoft);background:var(--panel);"),
                )}
              >
                <div
                  style={css(
                    "display:flex;align-items:flex-start;justify-content:space-between;gap:14px",
                  )}
                >
                  <div style={css("display:flex;align-items:center;gap:11px;min-width:0")}>
                    <div style={css(iconeMod(on))}>{m.sigla}</div>
                    <div style={css("display:flex;flex-direction:column;gap:3px;min-width:0")}>
                      <span style={css("display:flex;align-items:center;gap:7px;min-width:0")}>
                        <span style={css("font-size:14px;font-weight:600;color:var(--tx)")}>
                          {m.nome[id]}
                        </span>
                        {m.tipo === "acesso" && (
                          <TagAcesso rotulo={L.tagAcesso} ajuda={L.acessoAjuda} />
                        )}
                      </span>
                      <span
                        style={css(
                          "font-size:11px;font-weight:500;white-space:nowrap;color:" +
                            (on ? "var(--ok)" : "var(--tx3)"),
                        )}
                      >
                        {on ? L.ativoPara : L.desativado}
                      </span>
                    </div>
                  </div>

                  <div
                    style={css(
                      "width:44px;height:24px;flex:none;border-radius:99px;padding:3px;display:flex;" +
                        "transition:background .15s;background:" +
                        (on ? "var(--acc)" : "var(--neuLine)"),
                    )}
                  >
                    <div
                      style={css(
                        "width:18px;height:18px;border-radius:99px;background:#fff;" +
                          "box-shadow:0 1px 2px rgba(0,0,0,.28);transition:transform .15s;" +
                          "transform:translateX(" +
                          (on ? "20px" : "0") +
                          ")",
                      )}
                    />
                  </div>
                </div>
                <p style={css("margin:0;font-size:12px;color:var(--tx2);line-height:1.5")}>
                  {m.desc[id]}
                </p>
              </div>
            );
          })}
        </div>

        <div
          style={css(
            "padding:13px 24px;border-top:1px solid var(--lineSoft);background:var(--panel2);" +
              "display:flex;align-items:center;gap:9px",
          )}
        >
          <div style={css("width:6px;height:6px;border-radius:99px;background:var(--ok)")} />
          <span style={css("font-size:12px;color:var(--tx2)")}>{s.ultimaAcao || L.semAcao}</span>
        </div>
      </section>

      <div
        style={css(
          "position:sticky;bottom:0;z-index:7;display:flex;align-items:center;" +
            "justify-content:space-between;gap:16px;flex-wrap:wrap;padding:14px 20px;" +
            "border-radius:12px;border:1px solid " +
            (sujo ? "var(--warnLine)" : "var(--line)") +
            ";background:var(--panel);box-shadow:0 -2px 16px rgba(6,20,26,.1)",
        )}
      >
        <span
          style={css(
            "display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:500;color:" +
              (sujo ? "var(--warn)" : "var(--tx3)"),
          )}
        >
          <span
            style={css(
              "width:7px;height:7px;flex:none;border-radius:99px;background:" +
                (sujo ? "var(--warn)" : "var(--neuLine)"),
            )}
          />
          {sujo ? L.naoSalvo : L.tudoSalvo}
        </span>

        <div style={css("display:flex;align-items:center;gap:9px")}>
          <button
            onClick={a.descartarRascunho}
            disabled={!sujo}
            style={css(
              "font-size:13px;font-weight:500;padding:10px 16px;border-radius:9px;" +
                "border:1px solid var(--line);background:var(--panel);color:" +
                (sujo ? "var(--tx2)" : "var(--tx3)") +
                ";cursor:" +
                (sujo ? "pointer" : "not-allowed"),
            )}
          >
            {L.descartar}
          </button>
          <button
            onClick={a.salvarRascunho}
            disabled={!sujo}
            style={css(
              "font-size:13px;font-weight:600;padding:10px 18px;border-radius:9px;" +
                (sujo
                  ? "border:1px solid var(--acc);background:var(--acc);color:var(--accTx);cursor:pointer;"
                  : "border:1px solid var(--line);background:var(--neu);color:var(--tx3);cursor:not-allowed;"),
            )}
          >
            {L.salvar}
          </button>
        </div>
      </div>
    </div>
  );
}
