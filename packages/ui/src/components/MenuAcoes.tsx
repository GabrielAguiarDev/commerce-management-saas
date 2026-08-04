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
import { css } from "../css";
import { BOTAO_MENU, ITEM_MENU, itemMenuDestaque, PAINEL_MENU } from "../styleKit";

/** Folga entre o botão e o painel. */
const FOLGA = 6;
/** Respiro mínimo das bordas da janela. */
const MARGEM = 10;

export interface AcaoMenu {
  texto: string;
  onClick: () => void;
  /** Ação destrutiva ou de atenção — ganha cor própria. */
  cor?: string;
  desabilitada?: boolean;
}

/**
 * O botão "⋯" de uma linha e o menu que ele abre — um só componente para todas
 * as tabelas dos portais.
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
 *
 * O componente é controlado de fora porque os dois portais guardam "qual menu
 * está aberto" no seu próprio estado — só um por vez, em qualquer tela.
 */
export function MenuAcoes({
  aberto,
  onAbertoChange,
  rotulo,
  larguraMin = 180,
  alinhamento = "bottom-end",
  estiloBotao,
  children,
}: {
  aberto: boolean;
  /** Chamado tanto ao abrir quanto ao fechar (clique fora, Esc, ação escolhida). */
  onAbertoChange: (aberto: boolean) => void;
  /** `aria-label` do botão. */
  rotulo: string;
  larguraMin?: number;
  alinhamento?: "bottom-end" | "bottom-start";
  estiloBotao?: string;
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
    placement: alinhamento,
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
        className="hv-menu"
        style={css(estiloBotao ?? BOTAO_MENU)}
        {...getReferenceProps()}
      >
        ⋯
      </button>

      {aberto && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={setFloating}
              style={{ ...css(PAINEL_MENU), minWidth: larguraMin, ...floatingStyles }}
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

/** Um item do menu. A cor só aparece na ação destrutiva ou de atenção. */
export function ItemMenu({ texto, onClick, cor, desabilitada }: AcaoMenu) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      disabled={desabilitada}
      className={desabilitada ? undefined : "hv-linha2"}
      style={css(
        (cor ? itemMenuDestaque(cor) : ITEM_MENU) +
          (desabilitada ? ";opacity:.5;cursor:not-allowed" : ""),
      )}
    >
      {texto}
    </button>
  );
}

/**
 * O caso comum: menu montado a partir de uma lista de ações. Quando um item
 * precisa de mais que texto (um ícone, um separador), use `MenuAcoes` com
 * `ItemMenu` na mão.
 */
export function MenuDeAcoes({
  aberto,
  onAbertoChange,
  rotulo,
  acoes,
  larguraMin,
}: {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  rotulo: string;
  acoes: AcaoMenu[];
  larguraMin?: number;
}) {
  return (
    <MenuAcoes
      aberto={aberto}
      onAbertoChange={onAbertoChange}
      rotulo={rotulo}
      larguraMin={larguraMin}
    >
      {acoes.map((a) => (
        <ItemMenu key={a.texto} {...a} />
      ))}
    </MenuAcoes>
  );
}
