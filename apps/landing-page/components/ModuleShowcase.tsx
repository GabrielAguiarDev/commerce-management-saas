"use client";

import { css } from "@aguiar/ui";
import { Children, useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/Reveal";
import { DISPLAY, moduleTag } from "@/lib/styleKit";

/**
 * A vitrine dos módulos: um índice que fica parado à esquerda enquanto os
 * painéis passam à direita.
 *
 * É `position:sticky` PURO. Não há biblioteca, não há `pin`, não há scroll
 * substituído: a rolagem continua sendo a do navegador, com a inércia do
 * celular, o arrastar da barra de rolagem, o Page Down e o "buscar na página"
 * funcionando como sempre funcionaram. O JavaScript daqui não move nada — ele
 * só OBSERVA e troca qual nome está aceso.
 *
 * DUAS ARMADILHAS DO STICKY, as duas evitadas de propósito:
 *
 * 1. `align-items:start` na grade (em `globals.css`). Sem isso o item da grade
 *    estica até a altura da linha inteira, e um elemento tão alto quanto o
 *    contêiner não tem para onde deslizar — o sticky não "quebra", ele
 *    simplesmente não tem folga, o que é pior porque parece um bug de CSS.
 *
 * 2. Nenhum `overflow` em ancestral nenhum. O único da página é o
 *    `overflow-x:hidden` do `<body>`, e esse é propagado para a viewport pela
 *    especificação — o `<body>` não vira contêiner de rolagem e o sticky
 *    sobrevive. É o ponto a conferir primeiro se algum dia isto parar de
 *    grudar em algum navegador.
 *
 * NO CELULAR O STICKY É DESLIGADO (abaixo de 768px). Índice parado em tela de
 * 6" gasta metade da largura para não dizer nada; ali os painéis viram uma
 * pilha vertical e o índice some — cada bloco já leva o próprio título.
 */
export function ModuleShowcase({
  items,
  freeTag,
  paidTag,
  intro,
  footer,
  children,
}: {
  items: readonly { title: string; text: string; free: boolean }[];
  freeTag: string;
  paidTag: string;
  /** A abertura da dobra, que mora no alto da coluna parada. */
  intro?: React.ReactNode;
  /** O que fecha a coluna, embaixo da lista. */
  footer?: React.ReactNode;
  /** Uma ilustração por item, na mesma ordem. */
  children: React.ReactNode;
}) {
  const panels = Children.toArray(children);
  const [active, setActive] = useState(0);
  const stack = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = stack.current;
    if (!root || typeof IntersectionObserver === "undefined") return;

    // Quais painéis estão na faixa central AGORA. Sem este conjunto, dois
    // painéis cruzando a faixa ao mesmo tempo fariam o destaque piscar entre
    // eles conforme a ordem em que o observador reporta.
    const inBand = new Set<number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const i = Number(entry.target.getAttribute("data-panel"));
          if (entry.isIntersecting) inBand.add(i);
          else inBand.delete(i);
        }
        // Nenhum na faixa — entre um painel e outro, ou fora da dobra. Mantém
        // o último aceso em vez de apagar tudo.
        if (inBand.size > 0) setActive(Math.min(...inBand));
      },
      // Uma faixa de 10% no meio da tela. É o que faz o nome trocar quando o
      // painel está CENTRALIZADO, e não quando ele encosta na borda de baixo —
      // que é o erro que deixa o índice sempre um item adiantado.
      { rootMargin: "-45% 0px -45% 0px" },
    );

    for (const panel of root.querySelectorAll("[data-panel]")) observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="lp-showcase">
      {/* A coluna parada. Ela carrega TRÊS coisas, e só a do meio é decoração:
          a abertura da dobra em cima, o índice no meio, o link dos planos
          embaixo. O `aria-hidden` fica no `<ol>` e em mais nada — o título e o
          link precisam continuar existindo para quem ouve a página, e o link
          ainda por cima recebe foco. */}
      <div className="lp-showcase-index">
        {intro}

        {/* O índice é decoração: os mesmos nomes estão logo ao lado, como `h3`
            de cada painel, e um leitor de tela que lesse os dois leria a dobra
            inteira em dobro. Aqui ele não tem link nem foco — é um marcador de
            onde a leitura está, e nada mais. */}
        <ol
          className="lp-showcase-list"
          aria-hidden="true"
          style={css("list-style:none;margin:0;padding:0")}
        >
          {items.map((item, i) => (
            <li
              key={item.title}
              className="lp-index-item"
              style={css(
                `font-family:${DISPLAY};font-size:15px;padding:11px 0 11px 16px;` +
                  "border-left:2px solid " +
                  (i === active ? "var(--accent);" : "var(--rule);") +
                  (i === active
                    ? "color:var(--petrol);font-weight:700;"
                    : "color:var(--text2);font-weight:600;"),
              )}
            >
              {item.title}
            </li>
          ))}
        </ol>

        {footer}
      </div>

      {/* O `<Reveal>` fica DENTRO do painel, e não É o painel. `[data-panel]`
          é a caixa que o observador acima mede para decidir qual nome acende;
          se ela fosse também a que sobe 16px, a medida se moveria junto com a
          animação e o destaque trocaria fora de hora. Assim a caixa fica
          parada e só o conteúdo dela chega. */}
      <div ref={stack}>
        {items.map((item, i) => (
          <div key={item.title} data-panel={i} className="lp-panel">
            <Reveal>
              <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:14px")}>
                <div
                  aria-hidden="true"
                  style={css(
                    "width:34px;height:34px;border-radius:10px;flex:none;background:var(--petrol)",
                  )}
                />
                <h3 style={css("font-size:20px;font-weight:700;margin:0;color:var(--petrol)")}>
                  {item.title}
                </h3>
                <span style={css(moduleTag(item.free) + "margin-left:auto")}>
                  {item.free ? freeTag : paidTag}
                </span>
              </div>

              <p
                style={css(
                  "font-size:15px;line-height:1.6;color:var(--text2);margin:0 0 22px;max-width:52ch",
                )}
              >
                {item.text}
              </p>

              {panels[i]}
            </Reveal>
          </div>
        ))}
      </div>
    </div>
  );
}
