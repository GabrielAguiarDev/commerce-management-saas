"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    /**
     * O sinal de que o React hidratou. Quem lê é o script inline do `<head>`
     * (em `layout.tsx`): se dois segundos passarem sem esta bandeira, ele
     * derruba a trava `js-reveal` e a página aparece inteira, sem animação.
     */
    __revealReady?: boolean;
  }
}

/**
 * As tags que a página precisa revelar. Nenhuma delas é escolha estética: é a
 * tag que já estava no lugar, e trocá-la mudaria a semântica — `li` dentro do
 * `ol` de "Como funciona", `figure` no depoimento.
 */
type Tag = "div" | "li" | "figure";

/**
 * Revela o conteúdo quando ele entra na viewport: sobe 16px e ganha opacidade,
 * uma vez só.
 *
 * ELE NÃO ENVOLVE, ELE É. O elemento recebe `style` e `className` do chamador e
 * vira o próprio card — um `<div>` a mais em volta quebraria a altura igual dos
 * cards nas grades, porque o item da grade passaria a ser o invólucro e o card
 * de dentro não esticaria junto.
 *
 * O que anima são `opacity` e `transform`, e só. Ambas vivem no compositor: não
 * há recálculo de layout a cada quadro, que é o que trava a rolagem no celular
 * fraco.
 *
 * `unobserve` no primeiro cruzamento — a animação é de chegada, não de
 * passagem. Quem rola de volta para cima não vê o conteúdo piscar de novo.
 *
 * O estado escondido NÃO mora aqui: mora no CSS, atrás da classe `js-reveal`
 * (ver `globals.css`). O HTML que o servidor manda já está no estado final, e é
 * por isso que a página continua legível se este arquivo nunca chegar.
 */
export function Reveal({
  as = "div",
  delay = 0,
  className,
  style,
  children,
}: {
  as?: Tag;
  /** Atraso em ms. Serve para escalonar os itens de uma mesma lista. */
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const node = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = node.current;
    if (!el) return;

    // Quem pediu menos movimento recebe o conteúdo pousado — e quem garante
    // isso é o CSS, sozinho. Aqui basta não montar observador nenhum.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      window.__revealReady = true;
      return;
    }

    // Navegador sem `IntersectionObserver` é o único caso em que NÃO
    // levantamos a bandeira de propósito: sem ela, o fusível do `<head>`
    // derruba a trava aos dois segundos e a página aparece inteira. Um
    // caminho a menos para manter, e é o mesmo que socorre o pacote que não
    // chegou.
    if (typeof IntersectionObserver === "undefined") return;

    window.__revealReady = true;

    // Sem `threshold`: uma margem negativa embaixo dispara quando o elemento
    // cruza 10% acima do pé da tela. Fração de área não serviria — um painel
    // mais alto que a viewport nunca alcançaria 15% de si mesmo visível, e é
    // exatamente essa a forma dos painéis que vêm na Etapa 3.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          setShown(true);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // As três tags são todas `HTMLElement` e nenhuma recebe atributo próprio; o
  // estreitamento existe só para o `ref` ter um tipo, e não para o React.
  const Element = as as "div";

  return (
    <Element
      ref={node}
      className={className ? `${className} lp-reveal` : "lp-reveal"}
      data-shown={shown ? "" : undefined}
      style={delay ? { ...style, animationDelay: `${delay}ms` } : style}
    >
      {children}
    </Element>
  );
}
