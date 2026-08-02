"use client";

import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import type { ReactNode } from "react";
import { css } from "@/lib/css";

/** Folga entre o botão e o painel. */
const FOLGA = 6;
/** Respiro mínimo das bordas da janela. */
const MARGEM = 10;

const BOTAO =
  "border:1px solid var(--line);background:var(--panel);color:var(--tx3);" +
  "font-size:13px;line-height:1;padding:7px 9px;border-radius:7px;cursor:pointer";

// Sem `position`/`top`/`left` aqui: o posicionamento vem do Floating UI e é
// aplicado por cima deste estilo.
const PAINEL =
  "z-index:70;background:var(--panel);border:1px solid var(--line);border-radius:9px;" +
  "box-shadow:0 10px 24px rgba(9,26,33,.16);padding:5px;display:flex;" +
  "flex-direction:column;overflow-y:auto";

/**
 * Um item do menu: a cor fica com quem usa, porque a ação destrutiva é vermelha.
 */
export const ITEM_MENU =
  "text-align:left;background:none;border:none;font-size:12.5px;" +
  "padding:8px 10px;border-radius:6px;cursor:pointer;white-space:nowrap;";

/**
 * O botão "⋯" de uma linha de tabela e o menu que ele abre — um só componente
 * para todas as tabelas do painel.
 *
 * O painel vai para um portal em `<body>`: dentro da linha ele era recortado
 * pelo `overflow` do painel da tabela — que existe para a rolagem horizontal e
 * não vai sair de lá.
 *
 * Quem posiciona é o Floating UI. `autoUpdate` reancora o painel ao botão em
 * tempo real — rolagem (da janela e da própria tabela), resize, mudança de
 * layout —, e não só na abertura: o `flip` vira o menu para cima assim que ele
 * deixa de caber abaixo, o `shift` o segura dentro da janela na horizontal e o
 * `size` limita a altura ao espaço que sobra. É a mesma mecânica que os
 * dropdowns do Radix/Headless UI usam por baixo.
 */
export function MenuAcoes({
  aberto,
  onAbertoChange,
  rotulo,
  larguraMin = 168,
  children,
}: {
  aberto: boolean;
  /** Chamado tanto ao abrir quanto ao fechar (clique fora, Esc, ação escolhida). */
  onAbertoChange: (aberto: boolean) => void;
  /** `aria-label` do botão. */
  rotulo: string;
  larguraMin?: number;
  children: ReactNode;
}) {
  // `setReference`/`setFloating` são callback refs estáveis do Floating UI —
  // desestruturadas aqui para não parecerem leitura de ref no corpo do render.
  const {
    refs: { setReference, setFloating },
    floatingStyles,
    context,
  } = useFloating({
    open: aberto,
    onOpenChange: onAbertoChange,
    // Alinhado à direita do botão, como a coluna de ações pede.
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(FOLGA),
      flip({ padding: MARGEM }),
      shift({ padding: MARGEM }),
      size({
        padding: MARGEM,
        apply({ availableHeight, elements }) {
          // Só entra em cena em janelas muito baixas; aí o menu rola por dentro
          // em vez de vazar da tela.
          elements.floating.style.maxHeight = `${Math.max(120, availableHeight)}px`;
        },
      }),
    ],
  });

  // Abrir/fechar pelo botão, fechar ao clicar fora ou com Esc, e a semântica de
  // menu (`aria-haspopup`/`aria-expanded`) — tudo pelas interações da lib.
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useDismiss(context),
    useRole(context, { role: "menu" }),
  ]);

  return (
    <>
      <button
        ref={setReference}
        aria-label={rotulo}
        className="hv-tx"
        style={css(BOTAO)}
        {...getReferenceProps()}
      >
        ⋯
      </button>

      {aberto && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={setFloating}
              style={{ ...css(PAINEL), minWidth: larguraMin, ...floatingStyles }}
              {...getFloatingProps({
                // Escolher uma ação fecha o menu: o clique do item sobe até aqui.
                onClick: () => onAbertoChange(false),
              })}
            >
              {children}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}
