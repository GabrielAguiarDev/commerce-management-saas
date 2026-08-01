"use client";

import { useAdmin } from "@/components/AdminProvider";
import { css, MONO } from "@/lib/css";
import { HOJE_ROTULO } from "@/lib/mock/data";
import { IdiomaIcone, LuaIcone, SinoIcone, SolIcone } from "@/lib/icons";
import { ROTAS } from "@/lib/rotas";
import type { Idioma, Loc } from "@/types/types";

interface TopbarProps {
  titulo: string;
  subtitulo: string;
}

type TipoNotif = "alerta" | "risco" | "ok" | "info";

const NOTIFICACOES: { texto: Loc; quando: Record<Idioma, string>; tipo: TipoNotif }[] = [
  {
    texto: {
      pt: "Novo chamado de Acarajé da Bahia: não consigo fechar o caixa",
      en: "New ticket from Acarajé da Bahia: cannot close the register",
    },
    quando: { pt: "há 12 min", en: "12 min ago" },
    tipo: "alerta",
  },
  {
    texto: {
      pt: "Costura & Cia se cadastrou no plano Gratuito",
      en: "Costura & Cia signed up on the Free plan",
    },
    quando: { pt: "há 3 h", en: "3 h ago" },
    tipo: "ok",
  },
  {
    texto: {
      pt: "Hortifruti Vale Verde sem acessos há 21 dias — risco de churn",
      en: "Hortifruti Vale Verde inactive for 21 days — churn risk",
    },
    quando: { pt: "ontem", en: "yesterday" },
    tipo: "risco",
  },
  {
    texto: {
      pt: "Lava-Jato Cristal ativou o módulo Relatórios",
      en: "Lava-Jato Cristal enabled the Reports module",
    },
    quando: { pt: "22/07", en: "22/07" },
    tipo: "info",
  },
];

const CORES: Record<TipoNotif, string> = {
  alerta: "var(--bad)",
  risco: "var(--warn)",
  ok: "var(--ok)",
  info: "var(--acc)",
};

export function Topbar({ titulo, subtitulo }: TopbarProps) {
  const { s, a } = useAdmin();
  const { L } = a;
  const id = s.idioma;
  const escuro = s.tema === "escuro";

  return (
    <header
      style={css(
        "display:flex;align-items:center;justify-content:space-between;gap:24px;padding:16px 30px;" +
          "background:var(--panel);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:6",
      )}
    >
      <div style={css("display:flex;flex-direction:column;gap:3px;min-width:0")}>
        <h1
          style={css(
            "margin:0;font-size:19px;font-weight:600;letter-spacing:-.015em;color:var(--tx)",
          )}
        >
          {titulo}
        </h1>
        <p style={css("margin:0;font-size:12.5px;color:var(--tx2)")}>{subtitulo}</p>
      </div>

      <div style={css("display:flex;align-items:center;gap:10px;flex:none")}>
        <span style={css(`font-family:${MONO};font-size:11px;color:var(--tx3)`)}>
          {HOJE_ROTULO}
        </span>
        <div style={css("width:1px;height:22px;background:var(--line)")} />

        <div style={css("position:relative;display:flex")}>
          <button
            onClick={() => a.set((st) => ({ notifAberta: !st.notifAberta }))}
            aria-label={L.notificacoes}
            title={L.notificacoes}
            style={css(
              "position:relative;display:flex;align-items:center;justify-content:center;width:36px;" +
                "height:36px;border-radius:8px;cursor:pointer;padding:0;" +
                (s.notifAberta
                  ? "border:1px solid var(--accLine);background:var(--accSoft);color:var(--acc);"
                  : "border:1px solid var(--line);background:var(--panel);color:var(--tx2);"),
            )}
          >
            <SinoIcone />
            {!s.lidas && (
              <span
                style={css(
                  "position:absolute;top:6px;right:7px;width:8px;height:8px;border-radius:99px;" +
                    "background:var(--bad);border:1.5px solid var(--panel)",
                )}
              />
            )}
          </button>

          {s.notifAberta && (
            <>
              {/* Click-away layer behind the panel. */}
              <div
                onClick={() => a.set({ notifAberta: false })}
                style={css("position:fixed;inset:0;z-index:20")}
              />
              <div
                style={css(
                  "position:absolute;top:44px;right:0;z-index:30;width:340px;background:var(--panel);" +
                    "border:1px solid var(--line);border-radius:12px;" +
                    "box-shadow:0 16px 40px rgba(6,20,26,.22);overflow:hidden",
                )}
              >
                <div
                  style={css(
                    "display:flex;align-items:center;justify-content:space-between;gap:12px;" +
                      "padding:13px 16px;border-bottom:1px solid var(--lineSoft);background:var(--panel2)",
                  )}
                >
                  <div style={css("display:flex;flex-direction:column;gap:2px")}>
                    <span style={css("font-size:13.5px;font-weight:600;color:var(--tx)")}>
                      {L.notificacoes}
                    </span>
                    <span style={css("font-size:11px;color:var(--tx3)")}>
                      {s.lidas ? L.tudoSalvo : NOTIFICACOES.length + " " + L.naoLidas}
                    </span>
                  </div>
                  <button
                    onClick={() => a.set({ lidas: true })}
                    style={css(
                      "border:none;background:none;color:var(--acc);font-size:11.5px;font-weight:500;" +
                        "cursor:pointer;padding:0;text-align:right",
                    )}
                  >
                    {L.marcarLidas}
                  </button>
                </div>

                <div style={css("max-height:320px;overflow-y:auto")}>
                  {NOTIFICACOES.map((n, i) => (
                    <div
                      key={i}
                      style={css(
                        "display:flex;gap:11px;align-items:flex-start;padding:12px 16px;" +
                          "border-bottom:1px solid var(--lineSoft);" +
                          (s.lidas ? "opacity:.62;" : ""),
                      )}
                    >
                      <div
                        style={css(
                          "width:7px;height:7px;flex:none;margin-top:5px;border-radius:99px;background:" +
                            CORES[n.tipo],
                        )}
                      />
                      <div style={css("display:flex;flex-direction:column;gap:3px;min-width:0")}>
                        <span
                          style={css(
                            "font-size:12.5px;line-height:1.45;color:var(--tx" +
                              (s.lidas ? "2" : "") +
                              ")",
                          )}
                        >
                          {n.texto[id]}
                        </span>
                        <span style={css(`font-family:${MONO};font-size:10.5px;color:var(--tx3)`)}>
                          {n.quando[id]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => a.ir(ROTAS.suporte)}
                  style={css(
                    "width:100%;border:none;border-top:1px solid var(--lineSoft);background:var(--panel2);" +
                      "color:var(--acc);font-size:12px;font-weight:500;padding:11px;cursor:pointer",
                  )}
                >
                  {L.suporte}
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={a.alternarIdioma}
          title={id === "pt" ? "Mudar para inglês" : "Switch to Portuguese"}
          className="hv-acc-line"
          style={css(
            "display:flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 11px;" +
              "background:var(--panel);border:1px solid var(--line);color:var(--tx2);font-size:12px;" +
              "font-weight:600;letter-spacing:.04em;border-radius:8px;cursor:pointer",
          )}
        >
          <IdiomaIcone />
          {id === "pt" ? "PT" : "EN"}
        </button>

        <button
          onClick={a.alternarTema}
          title={escuro ? L.temaClaro : L.temaEscuro}
          style={css(
            "display:flex;align-items:center;justify-content:center;width:36px;height:36px;" +
              "background:var(--panel);border:1px solid var(--line);color:var(--tx2);" +
              "border-radius:8px;cursor:pointer;padding:0",
          )}
        >
          {escuro ? <SolIcone /> : <LuaIcone />}
        </button>
      </div>
    </header>
  );
}
