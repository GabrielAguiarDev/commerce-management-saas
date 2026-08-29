"use client";

import { ErrorPanel } from "@aguiar/ui";
import { useEffect } from "react";
import { DIC } from "@/lib/dictionary";
import "./globals.css";

/**
 * O limite de último recurso: quando o que estourou foi o PRÓPRIO LAYOUT RAIZ.
 *
 * POR QUE ELE É DIFERENTE DO `error.tsx`: aquele fica dentro da casca, porque o
 * layout sobreviveu. Este substitui o layout inteiro — inclusive o `<html>` e o
 * `<body>` —, e por isso precisa desenhá-los.
 *
 * O RISCO AQUI É MAIOR QUE NO PORTAL DO CLIENTE. O layout raiz do console faz
 * SETE leituras antes de desenhar qualquer coisa (clientes, chamados, módulos,
 * planos, financeiro, configurações e perfil) e não as embrulha em `try` como
 * `loadPortal` faz do outro lado. É um caminho real, não teórico.
 *
 * PORTUGUÊS FIXO, e é a única tela do console que não fala os dois idiomas: o
 * idioma escolhido vive no `AdminProvider`, que é justamente o que não está de
 * pé aqui. Ler `DIC.pt` direto é o mesmo padrão do provider quando o estado
 * ainda não chegou (`DIC[state.language] || DIC.pt`).
 *
 * SEM `next/font`: elas são carregadas no layout que acabou de morrer.
 * `tokens.css` monta `--sans-stack` com "Public Sans" e `system-ui` atrás das
 * variáveis, então o texto continua legível na fonte do sistema.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const L = DIC.pt;

  useEffect(() => {
    console.error("[console] o layout raiz estourou:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body data-theme="light">
        <ErrorPanel
          fullScreen
          title={L.erroGlobalTitulo}
          text={L.erroGlobalTexto}
          retryLabel={L.erroTentar}
          onRetry={reset}
          digest={error.digest}
          digestLabel={L.erroCodigo}
        />
      </body>
    </html>
  );
}
