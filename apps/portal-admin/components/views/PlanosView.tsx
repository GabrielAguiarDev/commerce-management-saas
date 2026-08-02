"use client";

import { useAdmin } from "@/components/AdminProvider";
import { css, MONO } from "@/lib/css";
import { EditarIcone } from "@/lib/icons";
import { badgeAcc, badgeNeutro, badgeOk } from "@/lib/styleKit";

export function PlanosView() {
  const { s, a, cs } = useAdmin();
  const { L } = a;
  const id = s.idioma;

  return (
    <div style={css("display:flex;flex-direction:column;gap:16px")}>
      <div style={css("display:flex;justify-content:flex-end")}>
        <button
          onClick={() => a.abrirFormPlano(null)}
          className="hv-bright"
          style={css(
            "display:flex;align-items:center;gap:7px;background:var(--acc);border:1px solid var(--acc);" +
              "color:var(--accTx);font-size:13px;font-weight:500;padding:10px 15px;border-radius:9px;cursor:pointer",
          )}
        >
          <span style={css("font-size:14px;line-height:1")}>+</span>
          {L.novoPlano}
        </button>
      </div>

      <div
        style={css(
          "display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;align-items:stretch",
        )}
      >
        {s.planos.map((p) => {
          const n = cs.filter((x) => x.plano === p.k).length;
          const fixo = p.tipo === "fixo";
          // Cores derivadas do plano, não da chave: um plano criado aqui mesmo
          // ganha identidade visual sem precisar entrar numa lista em código.
          const cobrado = p.tipo === "custom" || !!p.preco?.match(/[1-9]/);
          const cor =
            p.tipo === "custom"
              ? "var(--accLine)"
              : cobrado
                ? "var(--okLine)"
                : "var(--line)";
          const tag = p.tipo === "custom" ? badgeAcc() : cobrado ? badgeOk() : badgeNeutro();

          return (
            <section
              key={p.k}
              style={css(
                "background:var(--panel);border:1px solid " +
                  cor +
                  ";border-radius:12px;padding:22px;display:flex;flex-direction:column;gap:14px",
              )}
            >
              <div style={css("display:flex;align-items:center;justify-content:space-between;gap:10px")}>
                <h3 style={css("margin:0;font-size:16px;font-weight:600;color:var(--tx)")}>
                  {p.nome[id] || p.nome.pt}
                </h3>
                <div style={css("display:flex;align-items:center;gap:8px")}>
                  <span style={css(tag)}>
                    {n} {L.clientes.toLowerCase()}
                  </span>
                  <button
                    onClick={() => a.abrirFormPlano(p.k)}
                    aria-label={L.editar}
                    title={L.editar}
                    className="hv-acc-line"
                    style={css(
                      "display:flex;align-items:center;justify-content:center;width:28px;height:28px;" +
                        "border:1px solid var(--line);background:var(--panel);color:var(--tx3);" +
                        "border-radius:7px;cursor:pointer;padding:0",
                    )}
                  >
                    <EditarIcone />
                  </button>
                </div>
              </div>

              {fixo ? (
                <div style={css("display:flex;align-items:flex-end;gap:6px")}>
                  <span
                    style={css(
                      `font-family:${MONO};font-size:29px;font-weight:600;letter-spacing:-.03em;color:var(--tx)`,
                    )}
                  >
                    {p.preco}
                  </span>
                  <span style={css("font-size:12px;color:var(--tx3);padding-bottom:5px")}>
                    {id === "pt" ? "/mês · valor fixo" : "/month · fixed"}
                  </span>
                </div>
              ) : (
                <div style={css("display:flex;flex-direction:column;gap:3px")}>
                  <span
                    style={css(
                      "font-size:22px;font-weight:600;letter-spacing:-.02em;color:var(--acc)",
                    )}
                  >
                    {L.semPrecoFixo}
                  </span>
                  <span style={css("font-size:12px;color:var(--tx3)")}>{L.valorPorCliente}</span>
                </div>
              )}

              <p style={css("margin:0;font-size:12.5px;color:var(--tx2);line-height:1.55")}>
                {p.desc[id] || p.desc.pt}
              </p>

              <div
                style={css(
                  "display:flex;gap:22px;margin-top:auto;padding-top:14px;border-top:1px solid var(--lineSoft)",
                )}
              >
                <div style={css("display:flex;flex-direction:column;gap:2px")}>
                  <span
                    style={css(`font-family:${MONO};font-size:18px;font-weight:600;color:var(--tx)`)}
                  >
                    {n}
                  </span>
                  <span style={css("font-size:11px;color:var(--tx3)")}>{L.clientes}</span>
                </div>
                <div style={css("display:flex;flex-direction:column;gap:2px;min-width:0")}>
                  <span
                    style={css(`font-family:${MONO};font-size:18px;font-weight:600;color:var(--tx)`)}
                  >
                    {p.mods.length}
                  </span>
                  <span style={css("font-size:11px;color:var(--tx3)")}>{L.modulosInclusos}</span>
                </div>
              </div>

              <span style={css("font-size:11.5px;color:var(--tx3);line-height:1.5")}>
                {p.mods
                  .map((k) => {
                    const m = s.modulos.find((y) => y.k === k);
                    return m ? m.nome[id] || m.nome.pt : k;
                  })
                  .join(" · ")}
              </span>
            </section>
          );
        })}
      </div>
    </div>
  );
}
