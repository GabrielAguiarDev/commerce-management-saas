"use client";

import { usePathname } from "next/navigation";
import { usePortal } from "@/components/PortalProvider";
import { Button, css, MONO, NUM, SANS } from "@aguiar/ui";
import { brl } from "@/lib/formato";
import { TOAST_MS } from "@/lib/estado";
import { POS_ROUTE } from "@/lib/rotas";
import type { ToastTone } from "@/types/estado";

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
 * A cara de cada tom.
 *
 * A cor mora no selo e na barrinha do tempo, não no fundo: o cartão é a mesma
 * superfície do resto do portal, e é o selo que responde num relance "deu certo
 * ou não". Um retângulo vermelho inteiro no canto da tela grita mais alto do que
 * o problema que ele está anunciando.
 */
const TOAST_TONES: Record<ToastTone, { ink: string; soft: string; line: string; glyph: string }> = {
  ok: { ink: "var(--pos)", soft: "var(--pos-soft)", line: "var(--pos-line)", glyph: "✓" },
  warn: { ink: "var(--warn)", soft: "var(--warn-soft)", line: "var(--warn-line)", glyph: "!" },
  error: { ink: "var(--danger)", soft: "var(--danger-soft)", line: "var(--danger-line)", glyph: "!" },
};

/**
 * O aviso curto. Confirma o que acabou de acontecer e some sozinho — quem
 * precisa de resposta usa a caixa de confirmação, não isto.
 *
 * Ele nasce no canto inferior direito porque é o canto que nenhuma tela usa: o
 * conteúdo começa na esquerda, e no celular a barra de venda ocupa o rodapé
 * inteiro — daí ele subir acima dela em vez de cobrir o botão que a pessoa
 * provavelmente ia apertar em seguida.
 *
 * Entrar e sair são as duas animações, e o componente não decide nenhuma das
 * duas: ele desenha `leaving`, que o `PortalProvider` liga quando o tempo se
 * esgota ou alguém fecha no ✕, e que segura o aviso no estado só o tempo da
 * saída. Um aviso que some entre dois frames é lido como falha da tela.
 *
 * A `key` no número de série é o que faz a entrada e a barrinha recomeçarem
 * quando um aviso substitui o outro; sem ela o React reaproveitaria o mesmo nó
 * e a troca passaria despercebida — inclusive quando o texto se repete.
 */
export function Toast() {
  const { s, a, isMobile } = usePortal();
  if (!s.toast) return null;

  const { id, text, tone, leaving } = s.toast;
  const t = TOAST_TONES[tone];

  return (
    <div
      key={id}
      role="status"
      aria-live="polite"
      className={leaving ? "toast-out" : "toast-in"}
      style={css(
        `position:fixed;z-index:120;right:${isMobile ? "14px" : "22px"};` +
          `bottom:${isMobile ? "100px" : "24px"};${isMobile ? "left:14px;" : "max-width:390px;"}` +
          "display:flex;align-items:flex-start;gap:11px;padding:13px 12px 13px 14px;" +
          "border-radius:13px;background:var(--surface);border:1px solid var(--border);" +
          "box-shadow:var(--shadow-lg);overflow:hidden;" +
          // Saindo ele ainda está na tela por um piscar de olhos: sem isto, um
          // clique apressado no que está atrás acertaria o aviso já invisível.
          (leaving ? "pointer-events:none" : ""),
      )}
    >
      <span
        aria-hidden
        style={css(
          "flex:none;width:21px;height:21px;margin-top:1px;border-radius:99px;display:flex;" +
            `align-items:center;justify-content:center;background:${t.soft};border:1px solid ${t.line};` +
            `color:${t.ink};font:700 12px/1 ${SANS}`,
        )}
      >
        {t.glyph}
      </span>

      {/* A mensagem do servidor pode ser longa e vir com um código sem espaços;
          ela quebra dentro do cartão em vez de esticá-lo para fora da tela. */}
      <div
        style={css(
          `flex:1;min-width:0;overflow-wrap:anywhere;font:600 13px/1.45 ${SANS};color:var(--text)`,
        )}
      >
        {text}
      </div>

      {/* Fechar existe para o erro: ele fica cinco segundos na tela, e quem já
          leu não deveria ter de esperar o aviso sair da frente. */}
      <Button
        onClick={a.closeToast}
        className="hv-text"
        aria-label="Fechar aviso"
        style={css(
          "flex:none;width:22px;height:22px;display:flex;align-items:center;justify-content:center;" +
            `border-radius:7px;color:var(--muted);font:600 14px/1 ${SANS}`,
        )}
      >
        ✕
      </Button>

      {/* O tempo que resta, desenhado. `transform-origin` na esquerda faz a
          linha encolher para o lado de onde a leitura vem. */}
      <span
        aria-hidden
        style={css(
          `position:absolute;left:0;right:0;bottom:0;height:2px;background:${t.ink};opacity:.45;` +
            `transform-origin:left;animation:toast-timer ${TOAST_MS[tone]}ms linear forwards`,
        )}
      />
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
            Ver {items} {items === 1 ? "item" : "itens"}
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
