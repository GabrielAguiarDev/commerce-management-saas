"use client";

import { useAdmin } from "@/components/AdminProvider";
import { Button, css, MONO } from "@aguiar/ui";
import { NavLink } from "@/components/NavLink";
import { NAV_ID } from "@/components/Sidebar";
import { todayLabel } from "@/lib/datas";
import { IdiomaIcone, LuaIcone, SinoIcone, SolIcone } from "@/lib/icons";
import { ROUTES } from "@/lib/rotas";
import { headerHeight, planName } from "@/lib/styleKit";

interface TopbarProps {
  title: string;
  subtitle: string;
}

type NotificationType = "warning" | "risk" | "ok" | "info";

interface Notification {
  key: string;
  text: string;
  at: string;
  type: NotificationType;
}

const COLORS: Record<NotificationType, string> = {
  warning: "var(--danger)",
  risk: "var(--warn)",
  ok: "var(--pos)",
  info: "var(--accent)",
};

export function Topbar({ title, subtitle }: TopbarProps) {
  const { s, a, cs, isMobile } = useAdmin();
  const { L } = a;
  const id = s.language;
  const dark = s.theme === "dark";

  /**
   * Notificações montadas a partir do banco.
   *
   * O protótipo trazia quatro avisos escritos na mão, com nomes de negócios
   * inexistentes ("Acarajé da Bahia", "Costura & Cia"…). Não existe tabela de
   * notificações, então o painel mostra o que dá para provar: chamados que
   * ainda não foram resolvidos e clientes recém-cadastrados. Quando houver uma
   * tabela de eventos, é esta lista que passa a sair de lá.
   */
  const notifications: Notification[] = [
    ...s.tickets
      .filter((t) => t.status !== "resolved")
      .slice(0, 4)
      .map((t) => {
        const cl = cs.find((x) => x.id === t.customerId);
        return {
          key: "chamado:" + t.id,
          text:
            (id === "pt" ? "Chamado de " : "Ticket from ") +
            (cl ? cl.name : L.customer) +
            ": " +
            t.subject[id],
          at: t.data,
          type: (t.prioridade === "alta" ? "warning" : "info") as NotificationType,
        };
      }),
    ...cs.slice(0, 3).map((c) => ({
      key: "cliente:" + c.id,
      text:
        id === "pt"
          ? `${c.name} cadastrada no plano ${planName(s.plans, c.plan, id)}`
          : `${c.name} signed up on the ${planName(s.plans, c.plan, id)} plan`,
      at: c.data,
      type: "ok" as NotificationType,
    })),
  ].slice(0, 6);

  return (
    <header
      /**
       * A altura é a MESMA da faixa do topo da barra lateral (`headerHeight`),
       * e não mais a soma do título com o respiro: era essa conta que fazia as
       * duas linhas de base pararem em alturas diferentes.
       *
       * Por isso o respiro vertical sai do `padding` — quem centra o conteúdo
       * na faixa agora é o `align-items`. `flex:none` protege a altura nas
       * telas de altura travada, onde a casca é um flex que pode encolher os
       * filhos.
       */
      style={css(
        "display:flex;align-items:center;justify-content:space-between;background:var(--surface);" +
          "border-bottom:1px solid var(--border);position:sticky;top:0;z-index:6;flex:none;" +
          "height:" +
          headerHeight(isMobile) +
          ";" +
          (isMobile ? "gap:10px;padding:0 14px" : "gap:24px;padding:0 30px"),
      )}
    >
      {/* O botão da gaveta. Só existe no celular — no desktop a barra lateral
          está sempre em tela e não há o que abrir. */}
      {isMobile && (
        <Button
          onClick={() => a.set({ navOpen: true })}
          aria-label={L.abrirMenu}
          title={L.abrirMenu}
          aria-expanded={s.navOpen}
          aria-controls={NAV_ID}
          className="hv-borda"
          style={css(
            "flex:none;display:flex;align-items:center;justify-content:center;width:38px;height:38px;" +
              "border:1px solid var(--border);background:var(--surface2);color:var(--text2);" +
              `border-radius:9px;padding:0;font-family:${MONO};font-size:15px;line-height:1`,
          )}
        >
          ≡
        </Button>
      )}

      <div style={css("display:flex;flex-direction:column;gap:3px;min-width:0")}>
        <h1
          style={css(
            "margin:0;font-weight:600;letter-spacing:-.015em;color:var(--text);" +
              // O título é o nome da tela e não pode quebrar em duas linhas na
              // barra: no estreito ele encolhe e, se ainda assim não couber,
              // termina em reticências.
              (isMobile
                ? "font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
                : "font-size:19px"),
          )}
        >
          {title}
        </h1>
        {/* A linha de apoio sai no celular: ela explica a tela, e ali a barra
            precisa do espaço para o título e os controles. */}
        {!isMobile && (
          <p style={css("margin:0;font-size:12.5px;color:var(--text2)")}>{subtitle}</p>
        )}
      </div>

      <div
        style={css(
          "display:flex;align-items:center;flex:none;" + (isMobile ? "gap:7px" : "gap:10px"),
        )}
      >
        {/* A data e o filete que a separa dos botões são folga de desktop. */}
        {!isMobile && (
          <>
            <span style={css(`font-family:${MONO};font-size:11px;color:var(--muted)`)}>
              {todayLabel(id)}
            </span>
            <div style={css("width:1px;height:22px;background:var(--border)")} />
          </>
        )}

        <div style={css("position:relative;display:flex")}>
          <Button
            onClick={() => a.set((st) => ({ notificationsOpen: !st.notificationsOpen }))}
            aria-label={L.notifications}
            title={L.notifications}
            style={css(
              "position:relative;display:flex;align-items:center;justify-content:center;width:36px;" +
                "height:36px;border-radius:8px;cursor:pointer;padding:0;" +
                (s.notificationsOpen
                  ? "border:1px solid var(--accent-line);background:var(--accent-soft);color:var(--accent-text);"
                  : "border:1px solid var(--border);background:var(--surface);color:var(--text2);"),
            )}
          >
            <SinoIcone />
            {!s.lidas && notifications.length > 0 && (
              <span
                style={css(
                  "position:absolute;top:6px;right:7px;width:8px;height:8px;border-radius:99px;" +
                    "background:var(--danger);border:1.5px solid var(--surface)",
                )}
              />
            )}
          </Button>

          {s.notificationsOpen && (
            <>
              {/* Click-away layer behind the panel. */}
              <div
                onClick={() => a.set({ notificationsOpen: false })}
                style={css("position:fixed;inset:0;z-index:20")}
              />
              {/* `max-width` medido na janela, não no pai: o painel é mais
                  largo que o sino que o ancora, e num celular ele passaria da
                  borda esquerda da tela. */}
              <div
                style={css(
                  "position:absolute;top:44px;right:0;z-index:30;width:340px;" +
                    "max-width:calc(100vw - 28px);background:var(--surface);" +
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
                      {L.notifications}
                    </span>
                    <span style={css("font-size:11px;color:var(--muted)")}>
                      {s.lidas || notifications.length === 0
                        ? L.tudoSalvo
                        : notifications.length + " " + L.naoLidas}
                    </span>
                  </div>
                  <Button
                    onClick={() => a.set({ lidas: true })}
                    style={css(
                      "border:none;background:none;color:var(--accent-text);font-size:11.5px;font-weight:500;" +
                        "cursor:pointer;padding:0;text-align:right",
                    )}
                  >
                    {L.marcarLidas}
                  </Button>
                </div>

                <div style={css("max-height:320px;overflow-y:auto")}>
                  {notifications.length === 0 && (
                    <div
                      style={css(
                        "padding:22px 16px;text-align:center;font-size:12px;color:var(--muted)",
                      )}
                    >
                      {L.semNotificacoes}
                    </div>
                  )}

                  {notifications.map((n) => (
                    <div
                      key={n.key}
                      style={css(
                        "display:flex;gap:11px;align-items:flex-start;padding:12px 16px;" +
                          "border-bottom:1px solid var(--border-soft);" +
                          (s.lidas ? "opacity:.62;" : ""),
                      )}
                    >
                      <div
                        style={css(
                          "width:7px;height:7px;flex:none;margin-top:5px;border-radius:99px;background:" +
                            COLORS[n.type],
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
                          {n.text}
                        </span>
                        <span style={css(`font-family:${MONO};font-size:10.5px;color:var(--muted)`)}>
                          {n.at}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <NavLink
                  href={ROUTES.support}
                  style={css(
                    "display:block;text-align:center;width:100%;border:none;" +
                      "border-top:1px solid var(--border-soft);background:var(--surface2);" +
                      "color:var(--accent-text);font-size:12px;font-weight:500;padding:11px;cursor:pointer",
                  )}
                >
                  {L.support}
                </NavLink>
              </div>
            </>
          )}
        </div>

        <Button
          onClick={a.toggleLanguage}
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
        </Button>

        <Button
          onClick={a.toggleTheme}
          title={dark ? L.temaClaro : L.temaEscuro}
          style={css(
            "display:flex;align-items:center;justify-content:center;width:36px;height:36px;" +
              "background:var(--surface);border:1px solid var(--border);color:var(--text2);" +
              "border-radius:8px;cursor:pointer;padding:0",
          )}
        >
          {dark ? <SolIcone /> : <LuaIcone />}
        </Button>
      </div>
    </header>
  );
}
