"use client";

import { usePathname } from "next/navigation";
import { useAdmin } from "@/components/AdminProvider";
import { Button, css, MONO } from "@aguiar/ui";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { Wordmark } from "@/components/Wordmark";
import {
  ClientesIcone,
  ColapsarIcone,
  ConfigIcone,
  FinanceiroIcone,
  ModulosIcone,
  PlanosIcone,
  SairIcone,
  SuporteIcone,
  VisaoIcone,
} from "@/lib/icons";
import { ROUTES, isActiveRoute } from "@/lib/rotas";
import { navStyle } from "@/lib/styleKit";

/**
 * O id da barra lateral. O botão da gaveta, lá na barra de topo, aponta para
 * ele com `aria-controls` — é o que liga o "abrir menu" ao que de fato abre.
 */
export const NAV_ID = "admin-nav";

interface SidebarProps {
  customerCount: number;
  chamadosAbertos: number;
  mrrValor: string;
  mrrDelta: string;
}

export function Sidebar({ customerCount, chamadosAbertos, mrrValor, mrrDelta }: SidebarProps) {
  const { s, a, isMobile } = useAdmin();
  const { L } = a;
  const pathname = usePathname();
  // No celular a barra é uma gaveta: quando ela aparece, aparece inteira.
  // Recolher só faz sentido no desktop, onde ela divide a largura com a tela.
  const col = s.collapsed && !isMobile;

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
   * São links de verdade, e não botões: é o que dá ao Next a chance de
   * pré-carregar as telas do menu antes do clique — todas as rotas do painel
   * estão aqui, visíveis, então todas chegam prontas. A parada para perguntar
   * sobre edição pendente não se perdeu: ela mora no `<NavLink>`.
   */
  const item = (
    href: string,
    etiqueta: string,
    icon: React.ReactNode,
    contador?: React.ReactNode,
  ) => {
    const active = isActiveRoute(pathname, href);
    return (
      <NavLink
        href={href}
        style={css(navStyle(active, col))}
        aria-label={etiqueta}
        aria-current={active ? "page" : undefined}
        {...hint}
      >
        <span style={{ display: "flex", flex: "none" }}>{icon}</span>
        <span style={css(label)}>{etiqueta.split(" · ")[0]}</span>
        {contador}
      </NavLink>
    );
  };

  return (
    <aside
      id={NAV_ID}
      /**
       * Duas barras na mesma marcação.
       *
       * No desktop ela é `sticky`: ocupa uma coluna própria, acompanha a
       * rolagem e o conteúdo fica ao lado. No celular ela sai do fluxo e vira
       * uma gaveta — `fixed`, deslocada para fora da tela, e volta deslizando
       * quando `navOpen` liga. Fora do fluxo, a tela abaixo ganha a largura
       * inteira sem precisar de um segundo desenho.
       *
       * `overflow-y:auto` só importa aqui: aberta num celular deitado, a barra
       * é mais alta que a tela, e sem isso o rodapé com o botão de sair ficaria
       * inalcançável.
       */
      style={css(
        "width:" +
          (col ? "84px" : "250px") +
          ";flex:none;background:var(--side);display:flex;flex-direction:column;" +
          "height:100vh;overflow-y:auto;overscroll-behavior:contain;" +
          (isMobile
            ? "position:fixed;top:0;left:0;z-index:70;box-shadow:var(--shadow-lg);" +
              `transform:translateX(${s.navOpen ? "0" : "-100%"});` +
              "transition:transform .22s ease"
            : "position:sticky;top:0;align-self:flex-start;transition:width .18s ease"),
      )}
      // Fechada, a gaveta continua no DOM (é o que permite animar a entrada),
      // mas não deve receber Tab nem ser lida: `inert` tira as duas coisas de
      // uma vez, o que `display:none` faria ao custo da animação.
      inert={isMobile && !s.navOpen}
    >
      <div
        style={css(
          "position:relative;height:66px;flex:none;display:flex;align-items:center;gap:11px;" +
            "border-bottom:1px solid var(--side-border);" +
            (col ? "padding:0 34px 0 12px;" : "padding:0 42px 0 16px;"),
        )}
      >
        <Logo size={36} priority />
        <div
          style={css(
            col
              ? "display:none"
              : "display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;overflow:hidden;padding-right:6px",
          )}
        >
          <Wordmark size={15.5} />
          <span
            style={css(
              "font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--side-text2);" +
                "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%",
            )}
          >
            {L.console}
          </span>
        </div>
        {/* Mesmo canto, dois papéis: no desktop recolhe a barra, no celular
            fecha a gaveta — que é o gesto que a pessoa procura ali. */}
        <Button
          onClick={() =>
            a.set((st) =>
              isMobile ? { navOpen: false } : { collapsed: !st.collapsed, hint: null },
            )
          }
          className="hv-side"
          style={css(
            "position:absolute;top:18px;right:0;width:26px;height:30px;border-radius:8px 0 0 8px;" +
              "display:flex;align-items:center;justify-content:center;border:1px solid var(--side-border);" +
              "border-right:none;background:var(--side-card);color:var(--side-text2);cursor:pointer;" +
              "padding:0;transition:color .12s,background .12s" +
              (isMobile ? ";font-size:17px;line-height:1" : ""),
          )}
          aria-label={isMobile ? L.fecharMenu : col ? L.expandir : L.colapsar}
          {...hint}
        >
          {isMobile ? "×" : <ColapsarIcone />}
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
