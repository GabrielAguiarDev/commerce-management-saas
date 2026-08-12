"use client";

import { css } from "@aguiar/ui";
import { useAdmin } from "@/components/AdminProvider";
import type { HintState, ToastState } from "@/types/types";

/**
 * O véu atrás da gaveta do menu, no celular.
 *
 * Faz dois trabalhos: escurece a tela para separar o menu do conteúdo, e dá o
 * alvo de "toquei fora, fecha" — que é como se fecha uma gaveta em qualquer
 * aplicativo. Fica um degrau abaixo dela no `z-index` e um acima do resto.
 */
export function NavScrim() {
  const { s, a, isMobile } = useAdmin();
  if (!isMobile || !s.navOpen) return null;

  return (
    <div
      onClick={() => a.set({ navOpen: false })}
      aria-hidden
      style={css(
        "position:fixed;inset:0;z-index:65;background:rgba(4,15,20,.5);animation:fadein .18s ease",
      )}
    />
  );
}

/** Transient confirmations, stacked bottom-right. */
export function Toasts({ toasts }: { toasts: ToastState[] }) {
  const { isMobile } = useAdmin();

  return (
    <div
      // No celular o aviso encosta nas duas margens: preso à direita, um texto
      // um pouco mais longo já sairia da tela.
      style={css(
        "position:fixed;z-index:120;display:flex;flex-direction:column;gap:9px;" +
          "pointer-events:none;align-items:" +
          (isMobile ? "stretch;bottom:14px;left:14px;right:14px" : "flex-end;bottom:22px;right:22px"),
      )}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={css(
            "display:flex;align-items:center;gap:10px;padding:12px 15px;border-radius:10px;" +
              "box-shadow:0 10px 26px rgba(6,20,26,.22);font-size:13px;font-weight:500;" +
              (t.type === "error"
                ? "border:1px solid var(--danger-line);background:var(--danger-soft);color:var(--danger);"
                : t.type === "warning"
                  ? "border:1px solid var(--warn-line);background:var(--warn-soft);color:var(--warn);"
                  : "border:1px solid var(--pos-line);background:var(--pos-soft);color:var(--pos);"),
          )}
        >
          <span
            style={css(
              "width:18px;height:18px;flex:none;border-radius:99px;display:flex;align-items:center;" +
                "justify-content:center;font-size:11px;font-weight:700;" +
                (t.type === "error"
                  ? "background:var(--danger);color:#fff;"
                  : t.type === "warning"
                    ? "background:var(--warn);color:#fff;"
                    : "background:var(--pos);color:#fff;"),
            )}
          >
            {t.type === "ok" ? "✓" : "!"}
          </span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/**
 * Names a sidebar icon once the rail is collapsed.
 *
 * O fundo é `--tip`, uma cor SÓLIDA, e não `--side-card` como era antes. Esse
 * era o defeito: `--side-card` é um lavado de 7% de branco, desenhado para
 * empilhar sobre o azul quase-preto da barra, onde a própria barra entrega o
 * fundo. Só que este balão é `fixed` e nasce FORA da barra, sobre o conteúdo
 * claro da página — ali 7% de branco não cobre nada, e o texto branco por cima
 * de uma tela clara parecia estar atrás dela. Sobre o conteúdo, o balão tem de
 * trazer o próprio fundo.
 *
 * `pointer-events:none` para o balão não roubar o ponteiro de quem o levantou:
 * sob o cursor, ele tiraria o hover do item, o que apagaria o balão, o que
 * devolveria o hover — e ele piscaria sem parar.
 *
 * `z-index:95` passa por tudo que a tela empilha (a barra de topo está em 6, a
 * gaveta em 70) e continua abaixo do modal (105) e dos avisos (120), que devem
 * mesmo cobri-lo.
 */
export function Hint({ hint }: { hint: HintState }) {
  return (
    <div
      role="tooltip"
      style={css(
        "position:fixed;z-index:95;pointer-events:none;white-space:nowrap;padding:6px 11px;" +
          "border-radius:8px;background:var(--tip);border:1px solid var(--tip-border);" +
          "color:#fff;font-size:12px;font-weight:500;" +
          // Monta e desmonta com o hover, então a entrada é um keyframe: uma
          // `transition` não tem de onde partir num elemento que acabou de
          // nascer.
          "animation:fadein .15s ease;" +
          "box-shadow:0 6px 18px rgba(4,15,20,.35);transform:translateY(-50%);top:" +
          hint.top +
          "px;left:" +
          hint.left +
          "px",
      )}
    >
      {hint.text}
    </div>
  );
}
