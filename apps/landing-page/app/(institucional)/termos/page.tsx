import { css } from "@aguiar/ui";
import Link from "next/link";
import type { Metadata } from "next";
import { PageIntro } from "@/components/shared";
import { COPY } from "@/lib/dictionary";
import { CONTACT } from "@/lib/links";
import { DISPLAY } from "@/lib/styleKit";

const P = COPY.pages.terms;

export const metadata: Metadata = {
  title: P.meta.title,
  description: P.meta.description,
};

/**
 * "Termos de uso".
 *
 * ┌─ O QUE FALTA ANTES DE ISTO VALER ──────────────────────────────────────┐
 * │ Os colchetes do texto — razão social, CNPJ, cidade e comarca — são     │
 * │ marcadores, e estão no dicionário, não aqui. E o texto inteiro pede    │
 * │ UMA LEITURA DE ADVOGADO: ele foi escrito em português claro, na ordem  │
 * │ em que as dúvidas aparecem, e isso não é o mesmo que uma peça          │
 * │ jurídica conferida.                                                    │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * SEM `<Reveal>`, e é a única página do site sem. Texto legal que aparece
 * conforme se rola é texto legal que alguém pode não ter visto; aqui tudo já
 * está na tela desde o primeiro quadro, e o "buscar na página" do navegador
 * encontra qualquer trecho sem que nada precise ter passado pela viewport.
 */
export default function Termos() {
  return (
    <>
      <PageIntro eyebrow={P.eyebrow} title={P.title} back={COPY.pages.back} />

      <div style={css("max-width:720px;margin:22px auto 0")}>
        <p style={css("font-size:13.5px;color:var(--muted);margin:0 0 22px")}>{P.updated}</p>

        <p style={css("font-size:16.5px;line-height:1.65;color:var(--text3);margin:0 0 34px")}>
          {P.intro}
        </p>

        {P.sections.map((s) => (
          <section key={s.title} style={css("margin-bottom:28px")}>
            <h2
              style={css(
                `font-family:${DISPLAY};font-size:18px;font-weight:700;letter-spacing:-.01em;` +
                  "color:var(--petrol);margin:0 0 8px",
              )}
            >
              {s.title}
            </h2>
            <p style={css("font-size:15.5px;line-height:1.7;color:var(--text2);margin:0")}>
              {s.text}
            </p>
          </section>
        ))}

        <p
          style={css(
            "border-top:1px solid var(--rule);padding-top:22px;margin:34px 0 0;" +
              "font-size:14.5px;line-height:1.6;color:var(--text3)",
          )}
        >
          {P.note}{" "}
          <Link className="lp-link" href={CONTACT} style={{ fontWeight: 600, color: "var(--accent-text)" }}>
            {COPY.footer.contact}
          </Link>
        </p>
      </div>
    </>
  );
}
