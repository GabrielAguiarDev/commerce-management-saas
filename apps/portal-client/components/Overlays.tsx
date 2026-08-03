"use client";

import { usePathname } from "next/navigation";
import { usePortal } from "@/components/PortalProvider";
import { css, MONO, SANS } from "@/lib/css";
import { brl } from "@/lib/formato";
import { ROTA_PDV } from "@/lib/rotas";
import { NUM } from "@/lib/styleKit";

/** O véu que escurece o conteúdo quando a gaveta do menu está aberta. */
export function VeuNav() {
  const { s, a, isMobile } = usePortal();
  if (!isMobile || !s.navAberto) return null;

  return (
    <div
      onClick={() => a.set({ navAberto: false })}
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
export function Confirmacao() {
  const { s, a } = usePortal();
  const c = s.conf;
  if (!c) return null;

  return (
    <div
      onClick={a.fecharConf}
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
          <h2 style={css(`margin:0;font:700 17px/1.25 ${SANS};color:${c.cor}`)}>{c.titulo}</h2>
          <p style={css(`margin:8px 0 0;font:400 13px/1.55 ${SANS};color:var(--text2)`)}>{c.texto}</p>
          <div
            style={css(
              "margin-top:13px;padding:11px 13px;border-radius:11px;background:var(--surface2);border:1px solid var(--border)",
            )}
          >
            <div style={css(`font:600 12.5px/1.35 ${SANS}`)}>{c.resumo}</div>
            {c.sub && (
              <div style={css(`margin-top:3px;font:500 11.5px ${SANS};color:var(--muted)`)}>{c.sub}</div>
            )}
          </div>
          {c.reversao && (
            <p style={css(`margin:12px 0 0;font:500 11.5px/1.5 ${SANS};color:var(--muted)`)}>
              {c.reversao}
            </p>
          )}
        </div>
        <div
          style={css(
            "display:flex;gap:10px;padding:14px 20px;border-top:1px solid var(--border);background:var(--surface2)",
          )}
        >
          <button
            onClick={a.fecharConf}
            style={css(
              `flex:1;padding:13px;border-radius:11px;border:1px solid var(--border2);background:var(--surface);color:var(--text2);font:600 13.5px ${SANS}`,
            )}
          >
            Voltar
          </button>
          <button
            onClick={c.acao}
            className="hv-brilho"
            style={css(
              `flex:1;padding:13px;border-radius:11px;background:${c.btnBg};color:${c.btnFg};font:700 13.5px ${SANS}`,
            )}
          >
            {c.btn}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * No celular o botão principal vira barra fixa no rodapé — é onde o polegar
 * alcança. Fora do PDV ela chama a venda nova; dentro dele, abre o carrinho.
 */
export function BarraInferior() {
  const { s, a, tem, isMobile } = usePortal();
  const pathname = usePathname();
  const noPdv = pathname === ROTA_PDV;

  if (!isMobile || !tem("vendas")) return null;

  if (noPdv) {
    if (!s.carrinho.length || s.carrinhoAberto) return null;
    const itens = s.carrinho.reduce((x, c) => x + c.qtd, 0);
    const total = s.carrinho.reduce((x, c) => x + c.qtd * c.preco, 0);

    return (
      <div
        style={css(
          "position:fixed;left:0;right:0;bottom:0;z-index:46;padding:10px 14px 14px;" +
            "background:linear-gradient(to top,var(--bg) 62%,rgba(0,0,0,0))",
        )}
      >
        <button
          onClick={() => a.set({ carrinhoAberto: true })}
          style={css(
            "display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;" +
              `padding:14px 18px;border-radius:13px;background:var(--accent);color:var(--accent-ink);font:700 14.5px ${SANS};box-shadow:var(--shadow-lg)`,
          )}
        >
          <span>
            Ver {itens} {itens === 1 ? "item" : "itens"}
          </span>
          <span style={css(NUM)}>{brl(total)}</span>
        </button>
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
      <button
        onClick={() => a.irPara(ROTA_PDV)}
        style={css(
          "display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:15px;" +
            `border-radius:13px;background:var(--accent);color:var(--accent-ink);font:700 15px ${SANS};box-shadow:var(--shadow-lg)`,
        )}
      >
        <span style={css(`font:600 17px/1 ${MONO}`)}>+</span>Nova venda
      </button>
    </div>
  );
}
