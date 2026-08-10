"use client";

import { useAdmin } from "@/components/AdminProvider";
import { Button, css, MONO } from "@aguiar/ui";
import { AccessTag } from "@/components/shared";
import { moduleIcon, planName, panelBadge } from "@/lib/styleKit";

const GRID =
  "display:grid;grid-template-columns:minmax(170px,1.6fr) minmax(240px,2.4fr) 120px 150px 84px;" +
  "gap:12px;min-width:780px;";

export function ModulosView() {
  const { s, a, cs, isMobile } = useAdmin();
  const { L } = a;
  const id = s.language;

  const rotuloCampo =
    "font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:600";

  return (
    <div style={css("display:flex;flex-direction:column;gap:16px")}>
      <div
        style={css(
          "display:flex;align-items:center;gap:9px;padding:12px 16px;border:1px solid var(--border-soft);" +
            "background:var(--surface2);border-radius:10px",
        )}
      >
        <span
          style={css("width:6px;height:6px;flex:none;border-radius:99px;background:var(--muted)")}
        />
        <span style={css("font-size:12px;color:var(--text2);line-height:1.5")}>{L.modulosFixos}</span>
      </div>

      <section
        style={css(
          "background:var(--surface);border:1px solid var(--border);border-radius:12px;" +
            // As cinco colunas pedem 780px. Abaixo disso cada módulo vira um
            // cartão, com a descrição — que é a coluna larga — em linha própria.
            (isMobile ? "overflow:visible" : "overflow-x:auto"),
        )}
      >
        {!isMobile && (
          <div
            style={css(
              GRID +
                "padding:10px 20px;background:var(--surface2);border-bottom:1px solid var(--border-soft);" +
                "font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:600",
            )}
          >
            <span>{L.module}</span>
            <span>{L.description}</span>
            <span>{L.clientesAtivos}</span>
            <span>{L.disponivelEm}</span>
            <span style={css("text-align:right")}>{L.actions}</span>
          </div>
        )}

        {s.modules.map((m) => {
          const n = cs.filter((x) => x.mods.includes(m.k)).length;
          // A module offered on every plan needs no plan list, just a marker.
          const all = m.plans.length >= s.plans.length;

          const identity = (
            <div style={css("display:flex;align-items:center;gap:11px;min-width:0")}>
              <div style={css(moduleIcon(true))}>{m.initials}</div>
              <div style={css("display:flex;flex-direction:column;gap:3px;min-width:0")}>
                <span style={css("font-size:13.5px;font-weight:500;color:var(--text)")}>
                  {m.name[id] || m.name.pt}
                </span>
                {m.type === "acesso" && (
                  <AccessTag label={L.tagAcesso} ajuda={L.acessoAjuda} bloco />
                )}
              </div>
            </div>
          );

          const description = (
            <span style={css("font-size:12.5px;color:var(--text2);line-height:1.5")}>
              {m.desc[id] || m.desc.pt}
            </span>
          );

          const adoption = (
            <span style={css(`font-family:${MONO};font-size:12.5px;color:var(--text)`)}>
              {n + (id === "pt" ? " de " : " of ") + cs.length}
            </span>
          );

          const availability = (
            <span style={css(all ? panelBadge("neutral") : panelBadge("acc"))}>
              {all ? L.todosOsPlanos : m.plans.map((k) => planName(s.plans, k, id)).join(" · ")}
            </span>
          );

          const editar = (
            <Button
              onClick={() => a.openModuleForm(m.k)}
              className="hv-acc-borda"
              style={css(
                "border:1px solid var(--border);background:var(--surface);color:var(--text2);" +
                  "font-weight:500;border-radius:7px;cursor:pointer;" +
                  (isMobile
                    ? "font-size:12.5px;padding:9px 14px"
                    : "font-size:11.5px;padding:6px 11px"),
              )}
            >
              {L.edit}
            </Button>
          );

          if (isMobile) {
            return (
              <div
                key={m.k}
                style={css(
                  "display:flex;flex-direction:column;gap:12px;padding:14px;" +
                    "border-bottom:1px solid var(--border-soft)",
                )}
              >
                <div style={css("display:flex;align-items:flex-start;gap:10px")}>
                  {identity}
                  <div style={css("margin-left:auto;flex:none")}>{editar}</div>
                </div>
                {description}
                <div style={css("display:flex;gap:18px;flex-wrap:wrap")}>
                  <div style={css("display:flex;flex-direction:column;gap:4px;min-width:0")}>
                    <span style={css(rotuloCampo)}>{L.clientesAtivos}</span>
                    {adoption}
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:4px;min-width:0")}>
                    <span style={css(rotuloCampo)}>{L.disponivelEm}</span>
                    <span style={css("display:flex")}>{availability}</span>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={m.k}
              style={css(
                GRID + "align-items:center;padding:14px 20px;border-bottom:1px solid var(--border-soft);",
              )}
            >
              {identity}
              {description}
              {adoption}
              {availability}
              <div style={css("display:flex;justify-content:flex-end")}>{editar}</div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
