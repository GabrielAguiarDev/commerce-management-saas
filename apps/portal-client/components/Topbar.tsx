"use client";

import { usePathname } from "next/navigation";
import { usePortal } from "@/components/PortalProvider";
import { primaryButton, Button, css, MONO, NUM, SANS } from "@aguiar/ui";
import { brl, longDate } from "@/lib/formato";
import { totalRevenue, productsOutOfStock } from "@/lib/selectors";
import { POS_ROUTE, ROUTES } from "@/lib/rotas";

/**
 * A barra de topo carrega o número que a pessoa mais quer ver — quanto vendeu
 * hoje — e os avisos que não podem esperar ela abrir uma tela.
 */
export function Topbar() {
  const { s, a, has, isMobile, isDesktop, d } = usePortal();
  const pathname = usePathname();

  const salesToday = brl(totalRevenue(d.sales.filter((v) => v.d === 0)));
  const alerts = productsOutOfStock(d.products);
  const openRegister = !!d.openRegister;

  // O PDV já é a tela de vender; oferecer "Nova venda" ali seria redundante.
  const inPos = pathname === POS_ROUTE;

  return (
    <header
      style={css(
        "position:sticky;top:0;z-index:40;background:var(--surface);border-bottom:1px solid var(--border)",
      )}
    >
      <div
        style={css(
          `display:flex;align-items:center;gap:12px;padding:${isMobile ? "10px 14px" : "12px 22px"};min-height:64px`,
        )}
      >
        {isMobile && (
          <Button
            onClick={() => a.set({ navOpen: true })}
            title="Menu"
            style={css(
              "flex:none;width:36px;height:36px;border-radius:9px;border:1px solid var(--border);" +
                `background:var(--surface2);color:var(--text2);font:600 14px ${MONO}`,
            )}
          >
            ≡
          </Button>
        )}

        <div style={css("min-width:0;flex:1;display:flex;align-items:center;gap:10px;flex-wrap:wrap")}>
          {isDesktop ? (
            <div
              style={css(
                "display:flex;align-items:baseline;gap:8px;padding-right:14px;margin-right:2px;border-right:1px solid var(--border)",
              )}
            >
              <span style={css(`font:400 12px ${SANS};color:var(--muted)`)}>Vendas de hoje</span>
              <span style={css(`font:700 19px/1 ${SANS};color:var(--text);${NUM}`)}>{salesToday}</span>
            </div>
          ) : (
            <div style={css("min-width:0")}>
              <div style={css(`font:400 10.5px/1.2 ${SANS};color:var(--muted)`)}>Vendas de hoje</div>
              <div style={css(`font:700 17px/1.15 ${SANS};${NUM}`)}>{salesToday}</div>
            </div>
          )}

          {has("register") && (
            <Button
              onClick={() => a.goTo(ROUTES.register)}
              title="Ver o caixa"
              style={css(
                "display:inline-flex;align-items:center;gap:7px;padding:5px 10px;border-radius:999px;" +
                  `background:${openRegister ? "var(--pos-soft)" : "var(--surface3)"};` +
                  `color:${openRegister ? "var(--pos)" : "var(--muted)"};font:600 11.5px ${SANS}`,
              )}
            >
              <span
                style={css(
                  `width:7px;height:7px;border-radius:50%;background:${openRegister ? "var(--pos)" : "var(--muted)"}`,
                )}
              />
              {openRegister ? `Caixa aberto desde ${d.openRegister?.openedAt}` : "Caixa fechado"}
            </Button>
          )}

          {isDesktop && (
            <span style={css(`font:500 12px ${SANS};color:var(--muted)`)}>{longDate()}</span>
          )}
        </div>

        <div style={css("flex:none;display:flex;align-items:center;gap:8px")}>
          {has("stock") && alerts.length > 0 && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                a.set({ notificationsOpen: !s.notificationsOpen });
              }}
              title="Alertas do negócio"
              className="hv-borda"
              style={css(
                "position:relative;width:36px;height:36px;border-radius:9px;border:1px solid var(--border);" +
                  `background:var(--surface2);color:var(--text2);font:600 13px ${MONO}`,
              )}
            >
              !
              <span
                style={css(
                  "position:absolute;top:-5px;right:-5px;min-width:17px;height:17px;padding:0 4px;" +
                    `border-radius:999px;background:var(--danger);color:#fff;font:700 10px/17px ${MONO}`,
                )}
              >
                {alerts.length}
              </span>
            </Button>
          )}

          <Button
            onClick={a.toggleTheme}
            title={s.theme === "light" ? "Usar tema escuro" : "Usar tema claro"}
            className="hv-borda"
            style={css(
              "width:36px;height:36px;border-radius:9px;border:1px solid var(--border);" +
                `background:var(--surface2);color:var(--text2);font:600 13px ${MONO}`,
            )}
          >
            {s.theme === "light" ? "☾" : "☀"}
          </Button>

          {isDesktop && has("sales") && !inPos && (
            <Button
              onClick={() => a.goTo(POS_ROUTE)}
              className="hv-brilho"
              style={css(`display:flex;align-items:center;gap:9px;${primaryButton("sm")}`)}
            >
              <span style={css(`font:600 15px/1 ${MONO}`)}>+</span>Nova sale
            </Button>
          )}
        </div>
      </div>

      {s.notificationsOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={css(
            "position:absolute;right:14px;top:60px;width:290px;max-width:calc(100vw - 28px);z-index:50;" +
              "background:var(--surface);border:1px solid var(--border);border-radius:12px;" +
              "box-shadow:var(--shadow-lg);overflow:hidden;animation:pop .16s ease",
          )}
        >
          <div style={css(`padding:11px 13px;border-bottom:1px solid var(--border);font:600 12.5px ${SANS}`)}>
            Alertas do negócio
          </div>
          {alerts.map((p) => (
            <div
              key={p.id}
              style={css("display:flex;gap:10px;padding:11px 13px;border-bottom:1px solid var(--border)")}
            >
              <span
                style={css("flex:none;width:6px;height:6px;margin-top:6px;border-radius:50%;background:var(--warn)")}
              />
              <span>
                <span style={css(`display:block;font:600 12.5px/1.35 ${SANS}`)}>{p.name}</span>
                <span style={css(`display:block;font:400 11.5px/1.4 ${SANS};color:var(--muted)`)}>
                  {p.stock === 0
                    ? "Acabou"
                    : `Restam ${p.stock} ${p.stock === 1 ? "unidade" : "unidades"}`}
                </span>
              </span>
            </div>
          ))}
          <Button
            onClick={() => a.set({ notificationsOpen: false })}
            style={css(`width:100%;padding:10px;font:600 12px ${SANS};color:var(--accent)`)}
          >
            Fechar
          </Button>
        </div>
      )}
    </header>
  );
}
