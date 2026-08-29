"use client";

import { ErrorPanel } from "@aguiar/ui";
import { useEffect } from "react";
import "./globals.css";

/**
 * O limite de último recurso: quando o que estourou foi o PRÓPRIO LAYOUT RAIZ.
 *
 * POR QUE ELE É DIFERENTE DO `error.tsx`: aquele fica dentro da casca, porque o
 * layout sobreviveu. Este substitui o layout inteiro — inclusive o `<html>` e o
 * `<body>` —, e por isso precisa desenhá-los. Não há menu, não há barra de topo
 * e não há `PortalProvider`: nada do portal está de pé neste ponto.
 *
 * QUANDO ELE APARECE: o layout raiz deste portal monta o retrato inteiro do
 * negócio antes de desenhar qualquer coisa. `loadPortal` já devolve o erro em
 * vez de lançá-lo, e é por isso que a queda do Supabase NÃO chega aqui — mas
 * essa proteção é uma linha de `try` que alguém pode mexer, e o que sobra sem
 * este arquivo é a tela de erro crua do Next, em inglês.
 *
 * SEM `next/font`. As fontes são carregadas no layout que acabou de morrer;
 * `tokens.css` monta `--sans-stack` com "Public Sans" e `system-ui` atrás das
 * variáveis, então o texto continua legível na fonte do sistema. Trocar a
 * fonte é o menor dos problemas nesta tela.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[portal] o layout raiz estourou:", error);
  }, [error]);

  return (
    /* O `lang` e o `data-theme` são os mesmos do layout raiz: sem eles, o leitor
       de tela lê português com fonética inglesa e os tokens caem no tema do
       sistema, que pode não ser o que a pessoa escolheu no portal. */
    <html lang="pt-BR">
      <body data-theme="light">
        <ErrorPanel
          fullScreen
          title="O portal não conseguiu abrir"
          text="Isto é uma falha nossa. Tente de novo em alguns instantes — seus dados continuam salvos."
          retryLabel="Tentar de novo"
          onRetry={reset}
          digest={error.digest}
          digestLabel="Código do erro:"
        />
      </body>
    </html>
  );
}
