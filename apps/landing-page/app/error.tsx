"use client";

import { css } from "@aguiar/ui";
import { useEffect } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NOTICE_CTA, PageNotice } from "@/components/PageNotice";
import { COPY } from "@/lib/dictionary";

/**
 * Quando a geração da página falha.
 *
 * QUANDO ISSO ACONTECE, na prática: a vitrine é lida do banco no build e na
 * revalidação (`lib/vitrine.ts`). Ela já trata a ausência das variáveis e o erro
 * de leitura devolvendo a copy de reserva do dicionário — a página NÃO cai por
 * causa do banco fora do ar, de propósito. Este arquivo é o que sobra para o
 * que ninguém previu, e sem ele o que aparece é a tela crua do Next, em inglês,
 * no primeiro contato de alguém que ainda não é cliente.
 *
 * É O ÚNICO ARQUIVO COM `"use client"` fora de `Reveal` e `CountUp`, e pelo
 * mesmo motivo que eles: o `reset` do Next é uma função, e função precisa de
 * um manipulador de clique. O peso disso só chega ao navegador de quem viu o
 * erro — a página em pé continua sem ele.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[landing] a página estourou:", error);
  }, [error]);

  return (
    <>
      <Header />
      <PageNotice
        code={COPY.error.code}
        title={COPY.error.title}
        text={COPY.error.text}
        action={
          <button type="button" onClick={reset} className="lp-cta" style={css(NOTICE_CTA)}>
            {COPY.error.cta}
          </button>
        }
      />
      <Footer />
    </>
  );
}
