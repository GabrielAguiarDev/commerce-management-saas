import { css } from "@aguiar/ui";
import Link from "next/link";
import { Wordmark } from "@/components/shared";
import { COPY } from "@/lib/dictionary";
import { ABOUT, CONTACT, TERMS } from "@/lib/links";
import { CONTAINER } from "@/lib/styleKit";

const FOOTER_LINK = "color:var(--on-petrol3);";

export function Footer() {
  return (
    <footer style={css("background:var(--petrol-deep);color:var(--on-petrol-muted);padding:36px 20px")}>
      <div
        style={css(
          CONTAINER +
            "display:flex;flex-wrap:wrap;gap:18px;align-items:center;justify-content:space-between",
        )}
      >
        <Wordmark brand={COPY.brand} size={26} fontSize={16} color="#fff" />

        <nav style={css("display:flex;flex-wrap:wrap;gap:22px;font-size:14.5px")}>
          {/* `next/link` nos três: são páginas do próprio site, e o Link as
              busca antes do clique. O `lp-on-petrol` continua sendo o que
              abre a cor para o branco no hover. */}
          <Link className="lp-on-petrol" href={ABOUT} style={css(FOOTER_LINK)}>
            {COPY.footer.about}
          </Link>
          <Link className="lp-on-petrol" href={CONTACT} style={css(FOOTER_LINK)}>
            {COPY.footer.contact}
          </Link>
          <Link className="lp-on-petrol" href={TERMS} style={css(FOOTER_LINK)}>
            {COPY.footer.terms}
          </Link>
        </nav>

        <div style={css("font-size:13.5px;color:var(--on-petrol-faint)")}>
          {COPY.footer.copyright}
        </div>
      </div>
    </footer>
  );
}
