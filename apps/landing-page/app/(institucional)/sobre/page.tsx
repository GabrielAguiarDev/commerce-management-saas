import { css } from "@aguiar/ui";
import Link from "next/link";
import type { Metadata } from "next";
import { Reveal } from "@/components/Reveal";
import { PageIntro } from "@/components/shared";
import { COPY } from "@/lib/dictionary";
import { CONTACT } from "@/lib/links";
import { DISPLAY } from "@/lib/styleKit";

const P = COPY.pages.about;

export const metadata: Metadata = {
  title: P.meta.title,
  description: P.meta.description,
};

/**
 * "Sobre".
 *
 * Quatro blocos numa coluna só: o que é, por que existe, como é pensado e o
 * que acontece com os dados de quem usa. Nenhum deles conta uma história de
 * fundação — o que a página afirma é o que o produto faz, que é o que dá para
 * conferir abrindo o sistema.
 *
 * Os blocos são `<h2>` + parágrafo e não cards: numa página de leitura, uma
 * grade de caixas faria o olho pular em vez de ler na ordem.
 */
export default function Sobre() {
  return (
    <>
      <PageIntro eyebrow={P.eyebrow} title={P.title} lead={P.lead} back={COPY.pages.back} />

      <div style={css("max-width:720px;margin:clamp(36px,5vw,52px) auto 0")}>
        {P.blocks.map((b, i) => (
          <Reveal key={b.title} delay={i * 60} style={css("margin-bottom:34px")}>
            <h2
              style={css(
                `font-family:${DISPLAY};font-size:21px;font-weight:700;letter-spacing:-.015em;` +
                  "color:var(--petrol);margin:0 0 10px",
              )}
            >
              {b.title}
            </h2>
            <p style={css("font-size:16.5px;line-height:1.65;color:var(--text2);margin:0")}>
              {b.text}
            </p>
          </Reveal>
        ))}

        {/* O fecho leva para o contato, e não para o cadastro: quem abriu
            "Sobre" está decidindo se confia, e o passo seguinte dessa dúvida é
            falar com alguém. */}
        <Reveal
          style={css(
            "border:1px solid var(--border);border-radius:16px;background:var(--surface);" +
              "padding:26px;margin-top:8px",
          )}
        >
          <h2 style={css("font-size:18px;font-weight:700;color:var(--petrol);margin:0 0 8px")}>
            {P.cta.title}
          </h2>
          <p style={css("font-size:15px;line-height:1.6;color:var(--text2);margin:0 0 14px")}>
            {P.cta.text}
          </p>
          <Link
            className="lp-link"
            href={CONTACT}
            style={{ fontSize: "15px", fontWeight: 600, color: "var(--accent-text)" }}
          >
            {P.cta.button} →
          </Link>
        </Reveal>
      </div>
    </>
  );
}
