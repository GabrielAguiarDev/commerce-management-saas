import { css } from "@aguiar/ui";
import { BrandLink } from "@/components/BrandLink";
import { Wordmark } from "@/components/shared";
import { COPY } from "@/lib/dictionary";
import { MODULES, PLANS } from "@/lib/links";
import { CONTAINER } from "@/lib/styleKit";
import { ctaLink, fetchWhatsapp } from "@/lib/whatsapp";

const NAV_LINK = "font-size:14px;color:var(--text2);font-weight:500;";

/**
 * A barra do topo.
 *
 * Fica grudada: a página tem sete dobras e a chamada para ação precisa estar
 * ao alcance em todas elas. O botão dela abre a conversa no WhatsApp, como os
 * outros cinco da vitrine — ver `lib/whatsapp.ts`. O fundo é a cor da página com transparência mais
 * `backdrop-filter` — assim o conteúdo que passa por baixo aparece
 * desfocado em vez de sumir atrás de uma tarja opaca.
 */
export async function Header() {
  const cta = ctaLink(await fetchWhatsapp(), COPY.cta.whatsapp.header);

  return (
    <header
      style={css(
        "position:sticky;top:0;z-index:20;background:rgba(247,249,250,.88);" +
          "backdrop-filter:blur(10px);border-bottom:1px solid rgba(22,35,43,.08)",
      )}
    >
      <div
        style={css(CONTAINER + "padding:14px 20px;display:flex;align-items:center;gap:16px")}
      >
        {/* A marca leva ao topo: para a home, quando se está numa das páginas
            do rodapé; para o começo da página, quando já se está nela. Ver
            `BrandLink`. */}
        <div style={css("margin-right:auto")}>
          <BrandLink>
            <Wordmark brand={COPY.brand} />
          </BrandLink>
        </div>
        <nav
          aria-label={COPY.nav.label}
          style={css("display:flex;align-items:center;gap:16px")}
        >
          <a className="lp-nav" href={MODULES} style={css(NAV_LINK)}>
            {COPY.nav.modules}
          </a>
          <a className="lp-nav" href={PLANS} style={css(NAV_LINK)}>
            {COPY.nav.plans}
          </a>
        </nav>
        <a
          className="lp-cta-soft"
          {...cta}
          style={css(
            "background:var(--accent-text);color:#fff;font-size:14px;font-weight:600;" +
              "padding:10px 16px;border-radius:10px",
          )}
        >
          {COPY.nav.cta}
        </a>
      </div>
    </header>
  );
}
