"use client";

import { useAdmin } from "@/components/AdminProvider";
import { Button, css, MONO } from "@aguiar/ui";
import { EditarIcone, LixeiraIcone } from "@/lib/icons";
import { panelBadge } from "@/lib/styleKit";

export function PlanosView() {
  const { s, a, cs } = useAdmin();
  const { L } = a;
  const id = s.language;

  return (
    <div style={css("display:flex;flex-direction:column;gap:16px")}>
      <div style={css("display:flex;justify-content:flex-end")}>
        <Button
          onClick={() => a.openPlanForm(null)}
          className="hv-brilho"
          style={css(
            "display:flex;align-items:center;gap:7px;background:var(--accent);border:1px solid var(--accent);" +
              "color:var(--accent-ink);font-size:13px;font-weight:500;padding:10px 15px;border-radius:9px;cursor:pointer",
          )}
        >
          <span style={css("font-size:14px;line-height:1")}>+</span>
          {L.novoPlano}
        </Button>
      </div>

      <div
        style={css(
          "display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;align-items:stretch",
        )}
      >
        {s.plans.map((p) => {
          const n = cs.filter((x) => x.plan === p.k).length;
          const fixed = p.type === "fixed";
          // Cores derivadas do plano, não da chave: um plano criado aqui mesmo
          // ganha identidade visual sem precisar entrar numa lista em código.
          const charged = p.type === "custom" || !!p.price?.match(/[1-9]/);
          const color =
            p.type === "custom"
              ? "var(--accent-line)"
              : charged
                ? "var(--pos-line)"
                : "var(--border)";
          const tag = p.type === "custom" ? panelBadge("acc") : charged ? panelBadge("pos") : panelBadge("neutral");
          // O sob medida é estrutural e nunca se apaga; o último plano também não.
          const lastPlan = s.plans.length <= 1;
          const notDeletable = p.type === "custom" || lastPlan;

          return (
            <section
              key={p.k}
              style={css(
                "background:var(--surface);border:1px solid " +
                  color +
                  ";border-radius:12px;padding:22px;display:flex;flex-direction:column;gap:14px",
              )}
            >
              <div style={css("display:flex;align-items:center;justify-content:space-between;gap:10px")}>
                <h3 style={css("margin:0;font-size:16px;font-weight:600;color:var(--text)")}>
                  {p.name[id] || p.name.pt}
                </h3>
                <div style={css("display:flex;align-items:center;gap:8px")}>
                  <span style={css(tag)}>
                    {n} {L.customers.toLowerCase()}
                  </span>
                  <Button
                    onClick={() => a.openPlanForm(p.k)}
                    aria-label={L.edit}
                    title={L.edit}
                    className="hv-acc-borda"
                    style={css(
                      "display:flex;align-items:center;justify-content:center;width:28px;height:28px;" +
                        "border:1px solid var(--border);background:var(--surface);color:var(--muted);" +
                        "border-radius:7px;cursor:pointer;padding:0",
                    )}
                  >
                    <EditarIcone />
                  </Button>
                  {/* Excluir fica indisponível em dois casos:
                      · o plano SOB MEDIDA, que é estrutural — sem ele não há
                        como montar módulos e valor por cliente;
                      · o último plano ativo, porque sem catálogo o cadastro de
                        cliente não tem o que oferecer.
                      As checagens que valem rodam no servidor; estas só evitam
                      oferecer um caminho que terminaria em erro. */}
                  <Button
                    onClick={() => a.openModal("deletePlan", p.k)}
                    disabled={notDeletable}
                    aria-label={L.excluirPlanoBotao}
                    title={
                      p.type === "custom"
                        ? L.planoCustomFixo
                        : lastPlan
                          ? L.planoUnico
                          : L.excluirPlanoBotao
                    }
                    className={notDeletable ? undefined : "hv-perigo"}
                    style={css(
                      "display:flex;align-items:center;justify-content:center;width:28px;height:28px;" +
                        "border:1px solid var(--border);background:var(--surface);" +
                        "border-radius:7px;padding:0;" +
                        (notDeletable
                          ? "color:var(--border);cursor:not-allowed;"
                          : "color:var(--muted);cursor:pointer;"),
                    )}
                  >
                    <LixeiraIcone />
                  </Button>
                </div>
              </div>

              {fixed ? (
                <div style={css("display:flex;align-items:flex-end;gap:6px")}>
                  <span
                    style={css(
                      `font-family:${MONO};font-size:29px;font-weight:600;letter-spacing:-.03em;color:var(--text)`,
                    )}
                  >
                    {p.price}
                  </span>
                  <span style={css("font-size:12px;color:var(--muted);padding-bottom:5px")}>
                    {id === "pt" ? "/mês · valor fixo" : "/month · fixed"}
                  </span>
                </div>
              ) : (
                <div style={css("display:flex;flex-direction:column;gap:3px")}>
                  <span
                    style={css(
                      "font-size:22px;font-weight:600;letter-spacing:-.02em;color:var(--accent)",
                    )}
                  >
                    {L.semPrecoFixo}
                  </span>
                  <span style={css("font-size:12px;color:var(--muted)")}>{L.valorPorCliente}</span>
                </div>
              )}

              <p style={css("margin:0;font-size:12.5px;color:var(--text2);line-height:1.55")}>
                {p.desc[id] || p.desc.pt}
              </p>

              <div
                style={css(
                  "display:flex;gap:22px;margin-top:auto;padding-top:14px;border-top:1px solid var(--border-soft)",
                )}
              >
                <div style={css("display:flex;flex-direction:column;gap:2px")}>
                  <span
                    style={css(`font-family:${MONO};font-size:18px;font-weight:600;color:var(--text)`)}
                  >
                    {n}
                  </span>
                  <span style={css("font-size:11px;color:var(--muted)")}>{L.customers}</span>
                </div>
                <div style={css("display:flex;flex-direction:column;gap:2px;min-width:0")}>
                  <span
                    style={css(`font-family:${MONO};font-size:18px;font-weight:600;color:var(--text)`)}
                  >
                    {p.mods.length}
                  </span>
                  <span style={css("font-size:11px;color:var(--muted)")}>{L.modulosInclusos}</span>
                </div>
              </div>

              <span style={css("font-size:11.5px;color:var(--muted);line-height:1.5")}>
                {p.mods
                  .map((k) => {
                    const m = s.modules.find((y) => y.k === k);
                    return m ? m.name[id] || m.name.pt : k;
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
