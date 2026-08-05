"use client";

import { usePathname } from "next/navigation";
import { usePortal } from "@/components/PortalProvider";
import { Button, css, MONO, NUM, SANS } from "@aguiar/ui";
import { brl } from "@/lib/formato";
import { POS_ROUTE } from "@/lib/rotas";

/** O véu que escurece o conteúdo quando a gaveta do menu está aberta. */
export function NavVeil() {
  const { s, a, isMobile } = usePortal();
  if (!isMobile || !s.navOpen) return null;

  return (
    <div
      onClick={() => a.set({ navOpen: false })}
      style={css("position:fixed;inset:0;z-index:55;background:rgba(9,18,25,.5);animation:fadein .15s ease")}
    />
  );
}

/**
 * O aviso curto do rodapé. Confirma o que acabou de acontecer e some sozinho —
 * quem precisa de resposta usa a caixa de confirmação, não isto.
 */
export function Toast() {
  const { s, isMobile } = usePortal();
  if (!s.toast) return null;

  return (
    <div
      style={css(
        "position:fixed;left:50%;transform:translateX(-50%);z-index:120;padding:12px 18px;" +
          `bottom:${isMobile ? "86px" : "24px"};border-radius:11px;background:var(--petrol);color:#fff;` +
          `font:600 13px ${SANS};box-shadow:var(--shadow-lg);animation:rise .2s ease`,
      )}
      role="status"
    >
      {s.toast}
    </div>
  );
}

/**
 * A caixa de confirmação.
 *
 * Sempre com a mesma anatomia: o que vai acontecer, sobre o quê, e se dá para
 * voltar atrás. A última linha existe justamente para tirar o medo de clicar —
 * estornar uma venda e excluir um produto assustam de formas diferentes.
 */
export function Confirm() {
  const { s, a } = usePortal();
  const c = s.confirmDialog;
  if (!c) return null;

  return (
    <div
      onClick={a.closeConfirm}
      style={css(
        "position:fixed;inset:0;z-index:110;display:flex;align-items:center;justify-content:center;" +
          "padding:20px;background:rgba(8,17,24,.6);animation:fadein .15s ease",
      )}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={css(
          "width:100%;max-width:410px;background:var(--surface);border:1px solid var(--border);" +
            "border-radius:16px;box-shadow:var(--shadow-lg);animation:rise .2s ease;overflow:hidden",
        )}
      >
        <div style={css("padding:20px 20px 16px")}>
          <h2 style={css(`margin:0;font:700 17px/1.25 ${SANS};color:${c.color}`)}>{c.title}</h2>
          <p style={css(`margin:8px 0 0;font:400 13px/1.55 ${SANS};color:var(--text2)`)}>{c.text}</p>
          <div
            style={css(
              "margin-top:13px;padding:11px 13px;border-radius:11px;background:var(--surface2);border:1px solid var(--border)",
            )}
          >
            <div style={css(`font:600 12.5px/1.35 ${SANS}`)}>{c.summary}</div>
            {c.detail && (
              <div style={css(`margin-top:3px;font:500 11.5px ${SANS};color:var(--muted)`)}>{c.detail}</div>
            )}
          </div>
          {c.reversal && (
            <p style={css(`margin:12px 0 0;font:500 11.5px/1.5 ${SANS};color:var(--muted)`)}>
              {c.reversal}
            </p>
          )}
        </div>
        <div
          style={css(
            "display:flex;gap:10px;padding:14px 20px;border-top:1px solid var(--border);background:var(--surface2)",
          )}
        >
          <Button
            onClick={a.closeConfirm}
            style={css(
              `flex:1;padding:13px;border-radius:11px;border:1px solid var(--border2);background:var(--surface);color:var(--text2);font:600 13.5px ${SANS}`,
            )}
          >
            Voltar
          </Button>
          <Button
            onClick={c.action}
            className="hv-brilho"
            style={css(
              `flex:1;padding:13px;border-radius:11px;background:${c.buttonBg};color:${c.buttonInk};font:700 13.5px ${SANS}`,
            )}
          >
            {c.button}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * No celular o botão principal vira barra fixa no rodapé — é onde o polegar
 * alcança. Fora do PDV ela chama a venda nova; dentro dele, abre o carrinho.
 */
export function BottomBar() {
  const { s, a, has, isMobile } = usePortal();
  const pathname = usePathname();
  const inPos = pathname === POS_ROUTE;

  if (!isMobile || !has("sales")) return null;

  if (inPos) {
    if (!s.cart.length || s.cartOpen) return null;
    const items = s.cart.reduce((x, c) => x + c.qtd, 0);
    const total = s.cart.reduce((x, c) => x + c.qtd * c.price, 0);

    return (
      <div
        style={css(
          "position:fixed;left:0;right:0;bottom:0;z-index:46;padding:10px 14px 14px;" +
            "background:linear-gradient(to top,var(--bg) 62%,rgba(0,0,0,0))",
        )}
      >
        <Button
          onClick={() => a.set({ cartOpen: true })}
          style={css(
            "display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;" +
              `padding:14px 18px;border-radius:13px;background:var(--accent);color:var(--accent-ink);font:700 14.5px ${SANS};box-shadow:var(--shadow-lg)`,
          )}
        >
          <span>
            Ver {items} {items === 1 ? "item" : "items"}
          </span>
          <span style={css(NUM)}>{brl(total)}</span>
        </Button>
      </div>
    );
  }

  return (
    <div
      style={css(
        "position:fixed;left:0;right:0;bottom:0;z-index:45;padding:10px 14px 14px;" +
          "background:linear-gradient(to top,var(--bg) 62%,rgba(0,0,0,0))",
      )}
    >
      <Button
        onClick={() => a.goTo(POS_ROUTE)}
        style={css(
          "display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:15px;" +
            `border-radius:13px;background:var(--accent);color:var(--accent-ink);font:700 15px ${SANS};box-shadow:var(--shadow-lg)`,
        )}
      >
        <span style={css(`font:600 17px/1 ${MONO}`)}>+</span>Nova sale
      </Button>
    </div>
  );
}
