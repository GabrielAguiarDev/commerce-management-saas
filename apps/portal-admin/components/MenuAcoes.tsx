"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { css } from "@/lib/css";

/** Folga entre o botão e o painel. */
const FOLGA = 6;
/** Respiro mínimo das bordas da janela. */
const MARGEM = 10;

const BOTAO =
  "border:1px solid var(--line);background:var(--panel);color:var(--tx3);" +
  "font-size:13px;line-height:1;padding:7px 9px;border-radius:7px;cursor:pointer";

// Nasce invisível e no canto: a posição só existe depois de medir o painel, e
// medir exige que ele já esteja no documento.
const PAINEL =
  "position:fixed;top:0;left:0;visibility:hidden;z-index:70;background:var(--panel);" +
  "border:1px solid var(--line);border-radius:9px;box-shadow:0 10px 24px rgba(9,26,33,.16);" +
  "padding:5px;display:flex;flex-direction:column;min-width:168px";

/**
 * O botão "⋯" de uma linha de tabela e o menu que ele abre.
 *
 * O painel vai para um portal em `<body>`: dentro da linha ele era recortado
 * pelo `overflow` do painel da tabela — que existe para a rolagem horizontal e
 * não vai sair de lá. Fora da hierarquia da tabela nenhum container o corta, e
 * a posição é calculada a partir do retângulo do botão, em coordenadas de
 * viewport (`position:fixed`). Nas últimas linhas, quando não cabe abaixo, o
 * menu abre para cima.
 */
export function MenuAcoes({
  aberto,
  onAlternar,
  onFechar,
  rotulo,
  children,
}: {
  aberto: boolean;
  /** Clique no próprio botão: abre ou fecha. */
  onAlternar: () => void;
  onFechar: () => void;
  /** `aria-label` do botão. */
  rotulo: string;
  children: ReactNode;
}) {
  const botaoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  // Guardado num ref para o efeito dos listeners não depender da identidade da
  // função — quem chama costuma passar uma closure nova a cada render.
  const fecharRef = useRef(onFechar);
  useEffect(() => {
    fecharRef.current = onFechar;
  });

  // A posição é escrita direto no nó: é medida do DOM alimentando o DOM, e
  // guardá-la em estado só custaria um render a mais por abertura. Roda antes
  // da pintura, então o painel nunca aparece no lugar errado.
  useLayoutEffect(() => {
    if (!aberto) return;

    const posicionar = () => {
      const botao = botaoRef.current;
      const painel = painelRef.current;
      if (!botao || !painel) return;

      const r = botao.getBoundingClientRect();
      const { offsetHeight: alt, offsetWidth: larg } = painel;
      const abaixo = window.innerHeight - r.bottom;

      // Abre para cima quando não cabe abaixo e sobra mais espaço acima.
      const paraCima = abaixo < alt + FOLGA + MARGEM && r.top > abaixo;
      const topo = paraCima ? r.top - alt - FOLGA : r.bottom + FOLGA;
      // Alinhado à direita do botão, sem passar das bordas da janela.
      const esquerda = r.right - larg;

      painel.style.top =
        Math.min(Math.max(MARGEM, topo), Math.max(MARGEM, window.innerHeight - alt - MARGEM)) + "px";
      painel.style.left =
        Math.min(Math.max(MARGEM, esquerda), Math.max(MARGEM, window.innerWidth - larg - MARGEM)) +
        "px";
      painel.style.visibility = "visible";
    };

    posicionar();
    // A captura pega também a rolagem da própria tabela, não só a da janela.
    window.addEventListener("scroll", posicionar, true);
    window.addEventListener("resize", posicionar);
    return () => {
      window.removeEventListener("scroll", posicionar, true);
      window.removeEventListener("resize", posicionar);
    };
  }, [aberto]);

  // Fecha ao clicar fora ou com Esc. O clique no próprio botão é ignorado aqui
  // — quem alterna é o `onClick` dele, senão fecharia e reabriria no mesmo
  // gesto.
  useEffect(() => {
    if (!aberto) return;

    const foraDaqui = (e: PointerEvent) => {
      const alvo = e.target as Node;
      if (botaoRef.current?.contains(alvo) || painelRef.current?.contains(alvo)) return;
      fecharRef.current();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") fecharRef.current();
    };

    document.addEventListener("pointerdown", foraDaqui, true);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", foraDaqui, true);
      document.removeEventListener("keydown", escape);
    };
  }, [aberto]);

  return (
    <>
      <button
        ref={botaoRef}
        onClick={onAlternar}
        aria-label={rotulo}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className="hv-tx"
        style={css(BOTAO)}
      >
        ⋯
      </button>

      {aberto &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={painelRef}
            role="menu"
            // Escolher uma ação fecha o menu: o clique do item sobe até aqui.
            onClick={onFechar}
            style={css(PAINEL)}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
