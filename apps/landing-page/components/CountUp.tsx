"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

/**
 * ~1,2s. Tempo suficiente para o olho pegar o movimento e curto o bastante para
 * a contagem já ter acabado quando a pessoa terminar de ler o rótulo ao lado.
 */
const DURATION = 1200;

/**
 * Desaceleração cúbica: começa rápido e chega devagar. É a mesma sensação da
 * curva de `lp-reveal-in` no `globals.css` — o número pousa junto com a coluna.
 */
function ease(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * A parte numérica, escrita como o visitante lê.
 *
 * FICA FIXO EM `pt-BR` porque a página é servida em pt-BR e não tem troca de
 * idioma (ver `lib/dictionary.ts`). O ponto de importar: esta função é a MESMA
 * no servidor e no navegador, então o texto que o HTML traz e o texto do último
 * quadro da contagem são construídos pelo mesmo caminho — não há um "1200" do
 * servidor virando "1.200" no fim da animação.
 */
function format(n: number): string {
  return n.toLocaleString("pt-BR");
}

/**
 * Um número que sobe de zero até o valor final quando entra na viewport.
 *
 * ---------------------------------------------------------------------------
 * O VALOR FINAL ESTÁ NO HTML, e é ele que o servidor manda. O componente
 * renderiza `value` já formatado; quem zera é o efeito, DEPOIS da hidratação.
 * Se este arquivo nunca chegar — JavaScript desligado, 4G que morreu no meio —,
 * o visitante lê "100%", nunca "0%".
 *
 * ELE PRECISA ESTAR DENTRO DE UM `<Reveal>`, e isso não é decoração: é o que
 * esconde o único quadro feio deste componente. Zerar acontece na hidratação, e
 * a contagem só começa quando o observador dispara — se o número estivesse
 * visível nesse intervalo, quem já tem a dobra na tela veria "100%" virar "0%"
 * e subir de novo. Sob o `<Reveal>` a coluna inteira está em `opacity:0` até o
 * mesmo cruzamento, e o pulo acontece atrás da cortina.
 *
 * A TRAVA `js-reveal` É QUEM AUTORIZA ZERAR. Ela mora no `<html>`, entra pelo
 * script do `<head>` (ver `layout.tsx`) e cai sozinha em dois segundos se a
 * hidratação não chegar. Sem ela no elemento, o `<Reveal>` acima NÃO está
 * escondendo nada — ou o fusível já queimou, ou o script nunca rodou — e zerar
 * aqui seria trocar o número certo, já visível, por um zero. Então não zeramos:
 * o valor final fica onde está. Mesmo interruptor, mesma autoridade, um caminho
 * só de manter.
 *
 * `prefers-reduced-motion: reduce` sai pela mesma porta, uma linha depois: o
 * número aparece direto no valor final, sem contagem nenhuma.
 *
 * `requestAnimationFrame` e não `setInterval`: o quadro é do navegador, não
 * nosso. Um intervalo de 16ms desalinha do quadro, acumula atraso na aba de
 * fundo e continua rodando quando ninguém está olhando.
 *
 * ESCREVE DIRETO NO DOM (`textContent`), sem estado do React. São ~70 quadros
 * por contagem, e quatro contagens ao mesmo tempo; passar cada um por `setState`
 * seriam 280 renderizações para trocar dígitos que ninguém mais lê. O nó é
 * seguro para escrever à mão porque o React nunca o renderiza de novo — as
 * props não mudam e a árvore acima é toda de servidor.
 * ---------------------------------------------------------------------------
 */
export function CountUp({
  value,
  prefix = "",
  suffix = "",
  style,
}: {
  /** O valor final. É só a parte inteira: `R$ ` e `%` vêm nos outros dois. */
  value: number;
  /** O que vem ANTES do número e não anima (`R$ `). */
  prefix?: string;
  /** O que vem DEPOIS e não anima (`%`, ` min`). */
  suffix?: string;
  style?: CSSProperties;
}) {
  const node = useRef<HTMLSpanElement>(null);
  const final = format(value);

  useEffect(() => {
    const el = node.current;
    if (!el) return;

    // As três saídas. Ver o bloco acima: em todas elas o número já está no
    // valor final e mexer nele só pioraria.
    if (!document.documentElement.classList.contains("js-reveal")) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    el.textContent = format(0);

    let frame = 0;
    let start = 0;

    const step = (now: number) => {
      if (!start) start = now;
      const t = Math.min((now - start) / DURATION, 1);
      // Em `t === 1` a conta dá `value` exato, sem depender do arredondamento.
      el.textContent = format(Math.round(value * ease(t)));
      if (t < 1) frame = requestAnimationFrame(step);
    };

    // A MESMA margem do `<Reveal>`: dispara quando o elemento cruza 10% acima
    // do pé da tela, e não por fração de área. Se as duas margens divergirem, a
    // contagem começa antes ou depois do fade da coluna e o efeito se desfaz.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          // Uma vez só: a contagem é de chegada. Quem rola de volta não vê o
          // número zerar e subir outra vez.
          observer.unobserve(entry.target);
          frame = requestAnimationFrame(step);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      // Deixa o número no valor final ao desmontar. Vale para o StrictMode do
      // desenvolvimento, que monta, desmonta e monta de novo: sem esta linha o
      // primeiro ciclo deixaria um zero no DOM.
      el.textContent = final;
    };
  }, [value, final]);

  return (
    <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {prefix}
      {/*
        A LARGURA DO NÚMERO, RESERVADA.

        `tabular-nums` iguala a largura de cada DÍGITO, mas não a de "0" e "100"
        — e é essa diferença que faria o sufixo andar para os lados durante a
        contagem. As duas caixas abaixo ocupam a MESMA célula de uma grade: a de
        cima é o valor final, invisível, e é ela quem dita a largura da célula; a
        de baixo é a que conta, por cima, dentro de uma caixa que nunca muda de
        tamanho.

        `text-align:right` para a contagem crescer para a ESQUERDA. O dígito das
        unidades fica parado colado no sufixo, que é como um contador se
        comporta; centralizado, o número balançaria dentro da própria caixa.
      */}
      <span style={{ display: "inline-grid" }}>
        <span aria-hidden="true" style={{ gridArea: "1 / 1", visibility: "hidden" }}>
          {final}
        </span>
        <span ref={node} style={{ gridArea: "1 / 1", textAlign: "right" }}>
          {final}
        </span>
      </span>
      {suffix}
    </span>
  );
}
