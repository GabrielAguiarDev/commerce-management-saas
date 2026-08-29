import { css } from "@aguiar/ui";
import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { PageIntro } from "@/components/shared";
import { COPY } from "@/lib/dictionary";
import { CONTACT_EMAIL } from "@/lib/links";
import { DISPLAY } from "@/lib/styleKit";
import { fetchWhatsapp, formatWhatsapp, whatsappLink } from "@/lib/whatsapp";

const P = COPY.pages.contact;

export const metadata: Metadata = {
  title: P.meta.title,
  description: P.meta.description,
};

/**
 * "Contato".
 *
 * DOIS CANAIS, E ELES NÃO SÃO EQUIVALENTES: o formulário abre o e-mail do
 * visitante (ver `components/ContactForm.tsx`) e o WhatsApp abre uma conversa
 * de verdade, com a primeira mensagem já escrita. Ficam lado a lado porque
 * cada um serve a uma pessoa diferente — e quem não tiver e-mail configurado
 * no aparelho tem o segundo à mão sem precisar procurar.
 *
 * O NÚMERO VEM DO BANCO, no build (`lib/whatsapp.ts`), e é o mesmo que o app
 * mobile mostra na tela de login. Se a leitura falhar, o bloco simplesmente
 * não é desenhado: melhor uma página com um canal do que uma com um botão que
 * abre uma conversa com ninguém.
 *
 * A PÁGINA CONTINUA ESTÁTICA. A leitura acontece no build e na revalidação —
 * `revalidate` abaixo é a mesma hora da home, e pelo mesmo motivo: é o teto
 * para o caso de o número mudar no console sem ninguém publicar de novo.
 */
export const revalidate = 3600;

/** A grade que vira uma coluna sozinha quando não couberem duas. */
const COLUMNS = "display:grid;gap:24px;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));";

const CARD =
  "background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;";
const CARD_TITLE = `font-family:${DISPLAY};font-size:17px;font-weight:700;color:var(--petrol);margin:0 0 8px;`;
const CARD_TEXT = "font-size:14.5px;line-height:1.6;color:var(--text2);margin:0 0 14px;";

export default async function Contato() {
  const whatsapp = await fetchWhatsapp();

  return (
    <>
      <PageIntro eyebrow={P.eyebrow} title={P.title} lead={P.lead} back={COPY.pages.back} />

      <div style={css("max-width:960px;margin:clamp(32px,4.5vw,48px) auto 0")}>
        <div style={css(COLUMNS)}>
          {/* O formulário é o bloco maior e vem primeiro na leitura e no HTML —
              inclusive no celular, onde as duas colunas viram uma pilha. */}
          <div style={css(CARD + "padding:clamp(24px,3vw,30px)")}>
            <ContactForm to={CONTACT_EMAIL} hasWhatsapp={whatsapp !== null} />
          </div>

          <div style={css("display:flex;flex-direction:column;gap:16px")}>
            {whatsapp ? (
              <div style={css(CARD)}>
                <h2 style={css(CARD_TITLE)}>{P.whatsapp.title}</h2>
                <p style={css(CARD_TEXT)}>{P.whatsapp.text}</p>
                <a
                  className="lp-cta-soft"
                  href={whatsappLink(whatsapp, P.whatsapp.message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={css(
                    "display:inline-block;background:var(--accent-text);color:#fff;" +
                      `font-family:${DISPLAY};font-weight:700;font-size:14.5px;` +
                      "padding:12px 18px;border-radius:11px",
                  )}
                >
                  {P.whatsapp.cta}
                </a>
                <div style={css("font-size:13.5px;color:var(--muted);margin-top:12px")}>
                  {formatWhatsapp(whatsapp)}
                </div>
              </div>
            ) : null}

            <div style={css(CARD)}>
              <h2 style={css(CARD_TITLE)}>{P.email.title}</h2>
              <p style={css(CARD_TEXT)}>{P.email.text}</p>
              <a
                className="lp-link"
                href={`mailto:${CONTACT_EMAIL}`}
                style={css("font-size:14.5px;font-weight:600;color:var(--accent-text);word-break:break-all")}
              >
                {CONTACT_EMAIL}
              </a>
            </div>

            {/* Quem já é cliente NÃO deveria estar nesta página, e mandá-lo
                para a tela de Suporte do sistema não é despachar: lá o chamado
                chega com o negócio identificado e a resposta fica registrada. */}
            <div style={css(CARD + "background:var(--surface2)")}>
              <h2 style={css(CARD_TITLE)}>{P.client.title}</h2>
              <p style={css(CARD_TEXT + "margin-bottom:0")}>{P.client.text}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
