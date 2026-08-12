"use client";

import { usePathname } from "next/navigation";
import { usePortal } from "@/components/PortalProvider";
import { Button, css, MONO, SANS } from "@aguiar/ui";
import { NavLink } from "@/components/NavLink";
import { GROUPS, MODULES } from "@/lib/dados/perfis";
import { ModuleIcon } from "@/lib/icons";
import { moduleFromRoute, ROUTES } from "@/lib/rotas";
import type { ModuleKey } from "@/types/types";

const LARGURA = 250;
const LARGURA_COLAPSADA = 68;

/**
 * O menu lateral, montado a partir dos módulos do plano.
 *
 * Um grupo cujos itens o cliente não tem simplesmente não é desenhado — é o que
 * faz a barraca de acarajé não ver "Catálogo › Estoque" nem descobrir que
 * existe um caixa que ela não contratou.
 */
export function Sidebar() {
  const { s, a, has, isMobile, d } = usePortal();
  const pathname = usePathname();
  const current = moduleFromRoute(pathname);

  const business = d.business;
  // No celular a barra é uma gaveta: quando aparece, aparece inteira. Colapsar
  // só faz sentido no desktop, onde ela divide espaço com o conteúdo.
  const collapsed = s.collapsed && !isMobile;
  const showLabels = !collapsed;

  const unreadCount = d.tickets.filter((c) => c.unread).length;

  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((m) => has(m)),
  })).filter((g) => g.items.length > 0);

  return (
    <aside
      style={css(
        "flex:none;top:0;left:0;bottom:0;height:100vh;max-height:100vh;z-index:60;display:flex;" +
          "flex-direction:column;background:var(--surface);border-right:1px solid var(--border);" +
          `width:${collapsed ? LARGURA_COLAPSADA : LARGURA}px;` +
          `position:${isMobile ? "fixed" : "sticky"};` +
          `transform:translateX(${isMobile && !s.navOpen ? "-100%" : "0"});` +
          `box-shadow:${isMobile ? "var(--shadow-lg)" : "none"};` +
          "transition:width .18s ease,transform .22s ease",
      )}
    >
      {/* Identidade do negócio */}
      <div
        style={css(
          "flex:none;display:flex;align-items:center;gap:10px;padding:14px 12px;" +
            "border-bottom:1px solid var(--border);min-height:64px",
        )}
      >
        <div
          style={css(
            "flex:none;width:34px;height:34px;border-radius:9px;background:var(--petrol);display:flex;" +
              `align-items:center;justify-content:center;font:700 13px ${MONO};color:#fff;letter-spacing:-.5px`,
          )}
        >
          {business.initials}
        </div>
        {showLabels && (
          <div style={css("min-width:0;flex:1")}>
            <div
              style={css(
                `font:600 14px/1.25 ${SANS};color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis`,
              )}
            >
              {d.data.name}
            </div>
            <div
              style={css(
                `font:500 11px/1.3 ${SANS};color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis`,
              )}
            >
              {business.type}
            </div>
          </div>
        )}
        <Button
          onClick={() => (isMobile ? a.set({ navOpen: false }) : a.set({ collapsed: !s.collapsed }))}
          title={isMobile ? "Fechar menu" : collapsed ? "Expandir menu" : "Recolher menu"}
          className="hv-borda-tx"
          style={css(
            "flex:none;width:28px;height:28px;border-radius:8px;border:1px solid var(--border);" +
              `background:var(--surface2);color:var(--muted);display:flex;align-items:center;justify-content:center;font:600 13px ${MONO}`,
          )}
        >
          {isMobile ? "×" : collapsed ? "»" : "«"}
        </Button>
      </div>

      {/* Módulos */}
      <nav
        style={css(
          "flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:12px 10px;" +
            "display:flex;flex-direction:column;gap:3px",
        )}
      >
        {groups.map((g) => (
          <div key={g.title} style={css("display:flex;flex-direction:column;gap:2px;margin-bottom:10px")}>
            {showLabels ? (
              <div
                style={css(
                  `padding:8px 8px 6px;font:600 9.5px/1 ${MONO};letter-spacing:.14em;text-transform:uppercase;color:var(--muted)`,
                )}
              >
                {g.title}
              </div>
            ) : (
              // Recolhida não há espaço para o título do grupo; um filete o
              // substitui para o agrupamento não se perder.
              <div style={css("height:1px;margin:5px 8px 7px;background:var(--border)")} />
            )}

            {g.items.map((m) => (
              <ItemMenu
                key={m}
                module={m}
                active={current === m}
                mostrarRotulo={showLabels}
                badge={m === "support" && unreadCount > 0 ? unreadCount : 0}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Sair */}
      <div style={css("flex:none;border-top:1px solid var(--border);padding:10px;background:var(--surface)")}>
        {s.signOutOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={css(
              "margin-bottom:8px;padding:11px;border:1px solid var(--border);border-radius:10px;background:var(--surface2);animation:pop .16s ease",
            )}
          >
            <div style={css(`font:600 12px/1.4 ${SANS}`)}>Sair da account?</div>
            <div style={css(`margin-top:3px;font:400 11px/1.4 ${SANS};color:var(--muted)`)}>
              Você precisará entrar de novo.
            </div>
            <div style={css("display:flex;gap:6px;margin-top:9px")}>
              {/* Devolve a promessa: é dela que o botão tira o girador. O
                  popover fica aberto até o servidor responder — fechá-lo aqui
                  desmontaria o botão antes do girador aparecer. */}
              <Button
                onClick={() => a.signOut()}
                loadingLabel="Saindo…"
                style={css(
                  `flex:1;padding:7px;border-radius:8px;background:var(--danger);color:#fff;font:600 12px ${SANS}`,
                )}
              >
                Sair
              </Button>
              <Button
                onClick={() => a.set({ signOutOpen: false })}
                style={css(
                  `flex:1;padding:7px;border-radius:8px;border:1px solid var(--border2);background:var(--surface);color:var(--text2);font:600 12px ${SANS}`,
                )}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <Button
          onClick={(e) => {
            e.stopPropagation();
            a.set({ signOutOpen: !s.signOutOpen });
          }}
          className="hv-linha"
          style={css("display:flex;align-items:center;gap:10px;width:100%;padding:8px;border-radius:10px;text-align:left")}
        >
          <span
            style={css(
              "flex:none;width:30px;height:30px;border-radius:50%;background:var(--accent-soft);color:var(--accent-text);" +
                `display:flex;align-items:center;justify-content:center;font:600 11px ${MONO}`,
            )}
          >
            {business.user.initials}
          </span>
          {showLabels && (
            <span style={css("min-width:0;flex:1")}>
              <span
                style={css(
                  `display:block;font:600 12.5px/1.3 ${SANS};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`,
                )}
              >
                {business.user.name}
              </span>
              <span style={css(`display:block;font:400 11px/1.3 ${SANS};color:var(--muted)`)}>Sair</span>
            </span>
          )}
        </Button>
      </div>
    </aside>
  );
}

/**
 * Um item do menu.
 *
 * É um link de verdade, e não um botão: é o que dá ao Next a chance de
 * pré-carregar as telas do menu antes do clique — todas as rotas do plano estão
 * aqui, visíveis, então todas chegam prontas. Fechar a gaveta do celular ao
 * navegar não se perdeu: mora no `<NavLink>`.
 */
function ItemMenu({
  module,
  active,
  mostrarRotulo,
  badge,
}: {
  module: ModuleKey;
  active: boolean;
  mostrarRotulo: boolean;
  badge: number;
}) {
  const info = MODULES[module];

  return (
    <NavLink
      href={ROUTES[module]}
      // Recolhida, o rótulo vira o `title` — é como o item continua legível
      // sem ocupar largura.
      title={info.name}
      aria-current={active ? "page" : undefined}
      className={active ? undefined : "hv-linha"}
      style={css(
        "position:relative;display:flex;align-items:center;gap:11px;width:100%;padding:9px;" +
          "border-radius:9px;text-align:left;" +
          (active
            ? `background:var(--accent-soft);color:var(--accent-text);font:600 13.5px ${SANS};box-shadow:inset 0 0 0 1px var(--accent-soft)`
            : `background:transparent;color:var(--text2);font:500 13.5px ${SANS}`),
      )}
    >
      {active && (
        <span
          style={css(
            "position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:20px;" +
              "border-radius:0 3px 3px 0;background:var(--accent)",
          )}
        />
      )}
      <span
        style={css(
          `flex:none;width:26px;height:26px;display:flex;align-items:center;justify-content:center;color:${active ? "var(--accent)" : "var(--muted)"}`,
        )}
      >
        <ModuleIcon module={module} />
      </span>
      {mostrarRotulo && (
        <span style={css("white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{info.name}</span>
      )}
      {badge > 0 && (
        <span
          style={css(
            "margin-left:auto;flex:none;min-width:19px;height:19px;padding:0 6px;border-radius:10px;" +
              `background:var(--accent);color:var(--accent-ink);display:flex;align-items:center;justify-content:center;font:700 10.5px/1 ${MONO}`,
          )}
        >
          {badge}
        </span>
      )}
    </NavLink>
  );
}
