"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { SCRIPT, SCRIPT_MOBILE, type Frame } from "@/lib/demo";

/**
 * O RELÓGIO DA DEMONSTRAÇÃO — e nada além disso.
 *
 * Ele não desenha tela nenhuma. Recebe a demo inteira já montada pelo servidor
 * em `children`, e a única coisa que faz é escrever, na raiz, os `data-*` do
 * quadro em que o roteiro está. Quem lê esses atributos e pinta é o CSS.
 *
 * A RAZÃO É O TAMANHO DO PACOTE. Se as três telas fossem daqui para dentro,
 * elas viajariam duas vezes até o celular do visitante: no HTML, porque a
 * primeira dobra é o LCP e precisa vir pintada do servidor, e OUTRA VEZ dentro
 * do JavaScript, para o React saber redesenhá-las. Como componente de servidor,
 * a marcação viaja uma vez só e este arquivo custa menos de um kilobyte.
 *
 * O QUE ELE GARANTE, em ordem de importância:
 *
 *   1. NADA COMEÇA ANTES DA HIDRATAÇÃO. O primeiro render não tem atributo
 *      nenhum — igual ao HTML do servidor —, então não há diferença para o
 *      React reclamar nem quadro para o navegador repintar. Sem JavaScript, a
 *      demo simplesmente não anda, e o que fica na tela é o painel do dia.
 *
 *   2. QUEM PEDIU MENOS MOVIMENTO NÃO RECEBE MOVIMENTO. `prefers-reduced-motion`
 *      sai antes de montar timer ou observador — não é uma animação mais
 *      curta, é nenhuma. O CSS repete a trava do lado dele, para o caso de
 *      alguém trocar a preferência com a página aberta.
 *
 *   3. FORA DA TELA, PARADO. Um laço infinito rodando em segundo plano é
 *      bateria queimada por nada. Sai da viewport (ou a aba vai para trás), o
 *      timer morre; volta, o quadro atual recomeça com o tempo cheio.
 *
 *   4. NENHUM TIMER SOBREVIVE AO `unmount`. É o vazamento clássico desta
 *      técnica: o `setTimeout` reagenda a si mesmo para sempre, e um só que
 *      escape continua chamando `setState` num componente que não existe mais.
 */
export function DemoDriver({ children }: { children: ReactNode }) {
  const node = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  /**
   * A paridade do passo, e por que ela existe.
   *
   * O pulso do clique é uma animação de CSS. Quando dois quadros seguidos
   * clicam — no celular, o `+` e o `−` da quantidade —, o atributo `data-click`
   * continua lá entre um e outro, a regra não muda e a animação NÃO recomeça:
   * o segundo clique não apareceria. Alternando o nome da animação a cada
   * passo, toda entrada em `data-click` é uma regra nova, e toda regra nova
   * dispara. Duas linhas de CSS resolvem o que em JavaScript seria remover e
   * reinserir o nó.
   */
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const el = node.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    // A escolha do roteiro é feita UMA VEZ, na montagem. Girar o aparelho
    // atravessa os 768px e deixa o roteiro curto rodando no arranjo largo —
    // que continua correto, porque os alvos do ponteiro são os mesmos; só passa
    // a faltar a digitação. Um `matchMedia` ouvindo mudança de largura custaria
    // mais do que o defeito que evita.
    const script = window.matchMedia?.("(min-width: 768px)").matches ? SCRIPT : SCRIPT_MOBILE;

    let step = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onScreen = true;

    const stop = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    };

    const play = () => {
      stop();
      const f = script[step];
      setFrame(f);
      setTick((t) => t + 1);
      timer = setTimeout(() => {
        step = (step + 1) % script.length;
        play();
      }, f.ms);
    };

    // Parado é o estado padrão de quem não está sendo visto: só volta a andar
    // quando a demo está na tela E a aba está à frente.
    const sync = () => {
      if (onScreen && !document.hidden) {
        if (timer === undefined) play();
      } else {
        stop();
      }
    };

    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) onScreen = entry.isIntersecting;
          sync();
        },
        // Sem `threshold`: a demo é mais alta que meia tela em celular, e
        // exigir fração de área dela visível seria pedir o que nunca acontece.
        { rootMargin: "0px" },
      );
      observer.observe(el);
    }

    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      stop();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <div
      ref={node}
      className="lp-demo"
      data-screen={frame?.screen}
      data-before={frame?.before ? "" : undefined}
      data-cursor={frame?.cursor}
      data-click={frame?.click ? "" : undefined}
      data-typed={frame?.typed}
      data-results={frame?.results ? "" : undefined}
      data-cart={frame?.cart ? "" : undefined}
      data-qty={frame?.qty}
      data-pay={frame?.pay}
      data-saving={frame?.saving ? "" : undefined}
      data-toast={frame?.toast ? "" : undefined}
      data-hl={frame?.hl ? "" : undefined}
      data-tick={tick % 2}
    >
      {children}
    </div>
  );
}
