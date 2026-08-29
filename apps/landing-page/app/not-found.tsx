import { css } from "@aguiar/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NOTICE_CTA, PageNotice } from "@/components/PageNotice";
import { COPY } from "@/lib/dictionary";

/**
 * Endereço que não existe no site.
 *
 * SEM `"use client"` e sem JavaScript: é a mesma regra da página inteira. O
 * cabeçalho, o rodapé e o botão são HTML e CSS, e a tela funciona igual se o
 * pacote nunca chegar.
 *
 * O `<Link>` para `/` em vez de um `<a>`: o cabeçalho já foi carregado, e o
 * roteador leva para a vitrine sem recarregar nada.
 */
export const metadata: Metadata = {
  title: `${COPY.notFound.title} · ${COPY.brand}`,
  // Um 404 não pertence ao índice de busca — e é ele que o robô encontra
  // quando um link antigo continua publicado em algum lugar.
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <PageNotice
        code={COPY.notFound.code}
        title={COPY.notFound.title}
        text={COPY.notFound.text}
        action={
          <Link href="/" className="lp-cta" style={css(NOTICE_CTA)}>
            {COPY.notFound.cta}
          </Link>
        }
      />
      <Footer />
    </>
  );
}
