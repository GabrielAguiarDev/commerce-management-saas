"use client";

import { usePathname } from "next/navigation";
import { useAdmin } from "@/components/AdminProvider";
import { Button, css, MONO } from "@aguiar/ui";
import {
  ClientesIcone,
  ColapsarIcone,
  ConfigIcone,
  FinanceiroIcone,
  MarcaIcone,
  ModulosIcone,
  PlanosIcone,
  SairIcone,
  SuporteIcone,
  VisaoIcone,
} from "@/lib/icons";
import { ROUTES, isActiveRoute } from "@/lib/rotas";
import { navStyle } from "@/lib/styleKit";

interface SidebarProps {
  customerCount: number;
  chamadosAbertos: number;
  mrrValor: string;
  mrrDelta: string;
}

export function Sidebar({ customerCount, chamadosAbertos, mrrValor, mrrDelta }: SidebarProps) {
  const { s, a } = useAdmin();
  const { L } = a;
  const pathname = usePathname();
  const col = s.collapsed;

  const label = col ? "display:none" : "white-space:nowrap";
  const group = col
    ? "display:block;height:1px;margin:12px 14px;background:var(--side-border);font-size:0;line-height:0;overflow:hidden;color:transparent"
    : "font-size:9.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--side-text2);padding:14px 11px 5px";

  // Hover and focus both raise the tooltip, so the collapsed rail stays usable
  // from the keyboard.
  const hint = {
    onMouseEnter: a.showHint,
    onMouseLeave: a.hideHint,
    onFocus: a.showHint,
    onBlur: a.hideHint,
  };

  /**
   * `etiqueta` doubles as the aria-label, which is what the tooltip reads — so
   * the counted entries pass "Clientes · 10" and show only the part before the
   * separator inline.
   *
   * These are buttons rather than links because navigation runs through `ir`,
   * which may stop to ask about unsaved edits first.
   */
  const item = (
    href: string,
    etiqueta: string,
    icon: React.ReactNode,
    contador?: React.ReactNode,
  ) => {
    const active = isActiveRoute(pathname, href);
    return (
      <Button
        onClick={() => a.goTo(href)}
        style={css(navStyle(active, col))}
        aria-label={etiqueta}
        aria-current={active ? "page" : undefined}
        {...hint}
      >
        <span style={{ display: "flex", flex: "none" }}>{icon}</span>
        <span style={css(label)}>{etiqueta.split(" · ")[0]}</span>
        {contador}
      </Button>
    );
  };

  return (
    <aside
      style={css(
        "width:" +
          (col ? "84px" : "250px") +
          ";flex:none;background:var(--side);display:flex;flex-direction:column;" +
          "position:sticky;top:0;align-self:flex-start;height:100vh;transition:width .18s ease",
      )}
    >
      <div
        style={css(
          "position:relative;height:66px;flex:none;display:flex;align-items:center;gap:11px;" +
            "border-bottom:1px solid var(--side-border);" +
            (col ? "padding:0 34px 0 12px;" : "padding:0 42px 0 16px;"),
        )}
      >
        <div
          style={css(
            "width:36px;height:36px;flex:none;border-radius:10px;background:var(--accent);" +
              "color:var(--accent-ink);display:flex;align-items:center;justify-content:center;position:relative",
          )}
        >
          <MarcaIcone />
        </div>
        <div
          style={css(
            col
              ? "display:none"
              : "display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;overflow:hidden;padding-right:6px",
          )}
        >
          <span
            style={css(
              "font-size:15.5px;font-weight:600;color:#fff;letter-spacing:-.015em;white-space:nowrap",
            )}
          >
            Aguiar One
          </span>
          <span
            style={css(
              "font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--side-text2);" +
                "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%",
            )}
          >
            {L.console}
          </span>
        </div>
        <Button
          onClick={() => a.set((st) => ({ collapsed: !st.collapsed, hint: null }))}
          className="hv-side"
          style={css(
            "position:absolute;top:18px;right:0;width:26px;height:30px;border-radius:8px 0 0 8px;" +
              "display:flex;align-items:center;justify-content:center;border:1px solid var(--side-border);" +
              "border-right:none;background:var(--side-card);color:var(--side-text2);cursor:pointer;" +
              "padding:0;transition:color .12s,background .12s",
          )}
          aria-label={col ? L.expandir : L.colapsar}
          {...hint}
        >
          <ColapsarIcone />
        </Button>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "12px 12px 0" }}>
        <span style={css(group)}>{L.gestao}</span>
        {item(ROUTES.overview, L.overview, <VisaoIcone />)}
        {item(
          ROUTES.customers,
          L.customers + " · " + customerCount,
          <ClientesIcone />,
          <span
            style={css(
              col
                ? "display:none"
                : `margin-left:auto;font-family:${MONO};font-size:10.5px;padding:2px 7px;` +
                    "border-radius:99px;background:rgba(255,255,255,.07);color:var(--side-text)",
            )}
          >
            {customerCount}
          </span>,
        )}
        {item(ROUTES.financeiro, L.financeiro, <FinanceiroIcone />)}
        {item(
          ROUTES.support,
          L.support + " · " + chamadosAbertos,
          <SuporteIcone />,
          <span
            style={css(
              col
                ? "display:none"
                : `margin-left:auto;font-family:${MONO};font-size:10.5px;padding:2px 7px;` +
                    "border-radius:99px;background:var(--danger-soft);color:var(--danger)",
            )}
          >
            {chamadosAbertos}
          </span>,
        )}

        <span style={css(group)}>{L.catalogo}</span>
        {item(ROUTES.plans, L.plans, <PlanosIcone />)}
        {item(ROUTES.modules, L.modules, <ModulosIcone />)}

        <span style={css(group)}>{L.system}</span>
        {item(ROUTES.settings, L.settings, <ConfigIcone />)}
      </nav>

      <div
        style={css(
          col
            ? "display:none"
            : "margin:16px 12px 0;padding:13px 14px;border-radius:11px;background:var(--side-card);" +
                "display:flex;flex-direction:column;gap:3px",
        )}
      >
        <span
          style={css(
            "font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--side-text2)",
          )}
        >
          {L.mrr}
        </span>
        <span
          style={css(
            `font-family:${MONO};font-size:19px;font-weight:600;color:#fff;letter-spacing:-.02em`,
          )}
        >
          {mrrValor}
        </span>
        <span style={css("font-size:11px;color:var(--pos)")}>{mrrDelta}</span>
      </div>

      <div
        style={css(
          "margin-top:auto;padding:12px;border-top:1px solid var(--side-border);display:flex;" +
            "flex-direction:column;gap:8px",
        )}
      >
        <div
          style={css(
            "display:flex;align-items:center;gap:12px;padding:8px 4px 2px;" +
              (col ? "justify-content:center;" : ""),
          )}
        >
          <div
            style={css(
              "width:32px;height:32px;flex:none;border-radius:8px;background:var(--side-card);" +
                "color:var(--side-text);display:flex;align-items:center;justify-content:center;" +
                "font-size:12px;font-weight:600",
            )}
          >
            RA
          </div>
          <div
            style={css(
              col ? "display:none" : "display:flex;flex-direction:column;gap:1px;min-width:0;flex:1",
            )}
          >
            <span
              style={css(
                "font-size:12.5px;color:#e4edf1;font-weight:500;white-space:nowrap;" +
                  "overflow:hidden;text-overflow:ellipsis",
              )}
            >
              {/* `profiles.full_name` do usuário logado; cai no e-mail, e
                  depois no rótulo genérico, se o perfil não tiver nome. */}
              {s.adminName || L.admin}
            </span>
            <span style={css("font-size:10.5px;color:var(--side-text2)")}>{L.admin}</span>
          </div>
          <Button
            onClick={() => a.openModal("signOut")}
            style={css(
              col
                ? "display:none"
                : "flex:none;display:flex;align-items:center;justify-content:center;width:30px;" +
                    "height:30px;margin-left:6px;border:none;background:none;color:var(--side-text2);" +
                    "border-radius:7px;cursor:pointer;padding:0",
            )}
            aria-label={L.signOut}
            title={L.signOut}
          >
            <SairIcone />
          </Button>
        </div>
      </div>
    </aside>
  );
}
