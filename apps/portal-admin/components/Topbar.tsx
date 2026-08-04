"use client";

import { useAdmin } from "@/components/AdminProvider";
import { css, MONO } from "@aguiar/ui";
import { hojeRotulo } from "@/lib/datas";
import { IdiomaIcone, LuaIcone, SinoIcone, SolIcone } from "@/lib/icons";
import { ROTAS } from "@/lib/rotas";
import { nomePlano } from "@/lib/styleKit";

interface TopbarProps {
  titulo: string;
  subtitulo: string;
}

type TipoNotif = "alerta" | "risco" | "ok" | "info";

interface Notificacao {
  chave: string;
  texto: string;
  quando: string;
  tipo: TipoNotif;
}

const CORES: Record<TipoNotif, string> = {
  alerta: "var(--danger)",
  risco: "var(--warn)",
  ok: "var(--pos)",
  info: "var(--accent)",
};

export function Topbar({ titulo, subtitulo }: TopbarProps) {
  const { s, a, cs } = useAdmin();
  const { L } = a;
  const id = s.idioma;
  const escuro = s.tema === "escuro";

  /**
   * Notificações montadas a partir do banco.
   *
   * O protótipo trazia quatro avisos escritos na mão, com nomes de negócios
   * inexistentes ("Acarajé da Bahia", "Costura & Cia"…). Não existe tabela de
   * notificações, então o painel mostra o que dá para provar: chamados que
   * ainda não foram resolvidos e clientes recém-cadastrados. Quando houver uma
   * tabela de eventos, é esta lista que passa a sair de lá.
   */
  const notificacoes: Notificacao[] = [
    ...s.chamados
      .filter((t) => t.status !== "resolvido")
      .slice(0, 4)
      .map((t) => {
        const cl = cs.find((x) => x.id === t.clienteId);
        return {
          chave: "chamado:" + t.id,
          texto:
            (id === "pt" ? "Chamado de " : "Ticket from ") +
            (cl ? cl.nome : L.cliente) +
            ": " +
            t.assunto[id],
          quando: t.data,
          tipo: (t.prioridade === "alta" ? "alerta" : "info") as TipoNotif,
        };
      }),
    ...cs.slice(0, 3).map((c) => ({
      chave: "cliente:" + c.id,
      texto:
        id === "pt"
          ? `${c.nome} cadastrada no plano ${nomePlano(s.planos, c.plano, id)}`
          : `${c.nome} signed up on the ${nomePlano(s.planos, c.plano, id)} plan`,
      quando: c.data,
      tipo: "ok" as TipoNotif,
    })),
  ].slice(0, 6);

  return (
    <header
      style={css(
        "display:flex;align-items:center;justify-content:space-between;gap:24px;padding:16px 30px;" +
          "background:var(--surface);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:6",
      )}
    >
      <div style={css("display:flex;flex-direction:column;gap:3px;min-width:0")}>
        <h1
          style={css(
            "margin:0;font-size:19px;font-weight:600;letter-spacing:-.015em;color:var(--text)",
          )}
        >
          {titulo}
        </h1>
        <p style={css("margin:0;font-size:12.5px;color:var(--text2)")}>{subtitulo}</p>
      </div>

      <div style={css("display:flex;align-items:center;gap:10px;flex:none")}>
        <span style={css(`font-family:${MONO};font-size:11px;color:var(--muted)`)}>
          {hojeRotulo(id)}
        </span>
        <div style={css("width:1px;height:22px;background:var(--border)")} />

        <div style={css("position:relative;display:flex")}>
          <button
            onClick={() => a.set((st) => ({ notifAberta: !st.notifAberta }))}
            aria-label={L.notificacoes}
            title={L.notificacoes}
            style={css(
              "position:relative;display:flex;align-items:center;justify-content:center;width:36px;" +
                "height:36px;border-radius:8px;cursor:pointer;padding:0;" +
                (s.notifAberta
                  ? "border:1px solid var(--accent-line);background:var(--accent-soft);color:var(--accent);"
                  : "border:1px solid var(--border);background:var(--surface);color:var(--text2);"),
            )}
          >
            <SinoIcone />
            {!s.lidas && notificacoes.length > 0 && (
              <span
                style={css(
                  "position:absolute;top:6px;right:7px;width:8px;height:8px;border-radius:99px;" +
                    "background:var(--danger);border:1.5px solid var(--surface)",
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
                  "position:absolute;top:44px;right:0;z-index:30;width:340px;background:var(--surface);" +
                    "border:1px solid var(--border);border-radius:12px;" +
                    "box-shadow:0 16px 40px rgba(6,20,26,.22);overflow:hidden",
                )}
              >
                <div
                  style={css(
                    "display:flex;align-items:center;justify-content:space-between;gap:12px;" +
                      "padding:13px 16px;border-bottom:1px solid var(--border-soft);background:var(--surface2)",
                  )}
                >
                  <div style={css("display:flex;flex-direction:column;gap:2px")}>
                    <span style={css("font-size:13.5px;font-weight:600;color:var(--text)")}>
                      {L.notificacoes}
                    </span>
                    <span style={css("font-size:11px;color:var(--muted)")}>
                      {s.lidas || notificacoes.length === 0
                        ? L.tudoSalvo
                        : notificacoes.length + " " + L.naoLidas}
                    </span>
                  </div>
                  <button
                    onClick={() => a.set({ lidas: true })}
                    style={css(
                      "border:none;background:none;color:var(--accent);font-size:11.5px;font-weight:500;" +
                        "cursor:pointer;padding:0;text-align:right",
                    )}
                  >
                    {L.marcarLidas}
                  </button>
                </div>

                <div style={css("max-height:320px;overflow-y:auto")}>
                  {notificacoes.length === 0 && (
                    <div
                      style={css(
                        "padding:22px 16px;text-align:center;font-size:12px;color:var(--muted)",
                      )}
                    >
                      {L.semNotificacoes}
                    </div>
                  )}

                  {notificacoes.map((n) => (
                    <div
                      key={n.chave}
                      style={css(
                        "display:flex;gap:11px;align-items:flex-start;padding:12px 16px;" +
                          "border-bottom:1px solid var(--border-soft);" +
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
                            "font-size:12.5px;line-height:1.45;color:var(--text" +
                              (s.lidas ? "2" : "") +
                              ")",
                          )}
                        >
                          {n.texto}
                        </span>
                        <span style={css(`font-family:${MONO};font-size:10.5px;color:var(--muted)`)}>
                          {n.quando}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => a.ir(ROTAS.suporte)}
                  style={css(
                    "width:100%;border:none;border-top:1px solid var(--border-soft);background:var(--surface2);" +
                      "color:var(--accent);font-size:12px;font-weight:500;padding:11px;cursor:pointer",
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
          className="hv-acc-borda"
          style={css(
            "display:flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 11px;" +
              "background:var(--surface);border:1px solid var(--border);color:var(--text2);font-size:12px;" +
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
              "background:var(--surface);border:1px solid var(--border);color:var(--text2);" +
              "border-radius:8px;cursor:pointer;padding:0",
          )}
        >
          {escuro ? <SolIcone /> : <LuaIcone />}
        </button>
      </div>
    </header>
  );
}
