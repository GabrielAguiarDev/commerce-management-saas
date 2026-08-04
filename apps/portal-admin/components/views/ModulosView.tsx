"use client";

import { useAdmin } from "@/components/AdminProvider";
import { css, MONO } from "@aguiar/ui";
import { TagAcesso } from "@/components/shared";
import { iconeMod, nomePlano, seloPainel } from "@/lib/styleKit";

const GRADE =
  "display:grid;grid-template-columns:minmax(170px,1.6fr) minmax(240px,2.4fr) 120px 150px 84px;" +
  "gap:12px;min-width:780px;";

export function ModulosView() {
  const { s, a, cs } = useAdmin();
  const { L } = a;
  const id = s.idioma;

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
          "background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow-x:auto",
        )}
      >
        <div
          style={css(
            GRADE +
              "padding:10px 20px;background:var(--surface2);border-bottom:1px solid var(--border-soft);" +
              "font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:600",
          )}
        >
          <span>{L.modulo}</span>
          <span>{L.descricao}</span>
          <span>{L.clientesAtivos}</span>
          <span>{L.disponivelEm}</span>
          <span style={css("text-align:right")}>{L.acoes}</span>
        </div>

        {s.modulos.map((m) => {
          const n = cs.filter((x) => x.mods.includes(m.k)).length;
          // A module offered on every plan needs no plan list, just a marker.
          const todos = m.planos.length >= s.planos.length;

          return (
            <div
              key={m.k}
              style={css(
                GRADE + "align-items:center;padding:14px 20px;border-bottom:1px solid var(--border-soft);",
              )}
            >
              <div style={css("display:flex;align-items:center;gap:11px")}>
                <div style={css(iconeMod(true))}>{m.sigla}</div>
                <div style={css("display:flex;flex-direction:column;gap:3px;min-width:0")}>
                  <span style={css("font-size:13.5px;font-weight:500;color:var(--text)")}>
                    {m.nome[id] || m.nome.pt}
                  </span>
                  {m.tipo === "acesso" && (
                    <TagAcesso rotulo={L.tagAcesso} ajuda={L.acessoAjuda} bloco />
                  )}
                </div>
              </div>

              <span style={css("font-size:12.5px;color:var(--text2);line-height:1.5")}>
                {m.desc[id] || m.desc.pt}
              </span>

              <span style={css(`font-family:${MONO};font-size:12.5px;color:var(--text)`)}>
                {n + (id === "pt" ? " de " : " of ") + cs.length}
              </span>

              <span style={css(todos ? seloPainel("neutro") : seloPainel("acc"))}>
                {todos
                  ? L.todosOsPlanos
                  : m.planos.map((k) => nomePlano(s.planos, k, id)).join(" · ")}
              </span>

              <div style={css("display:flex;justify-content:flex-end")}>
                <button
                  onClick={() => a.abrirFormModulo(m.k)}
                  className="hv-acc-borda"
                  style={css(
                    "border:1px solid var(--border);background:var(--surface);color:var(--text2);" +
                      "font-size:11.5px;font-weight:500;padding:6px 11px;border-radius:7px;cursor:pointer",
                  )}
                >
                  {L.editar}
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
