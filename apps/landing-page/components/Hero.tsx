import { css } from "@aguiar/ui";
import { DashboardPreview } from "@/components/DashboardPreview";
import { COPY } from "@/lib/dictionary";
import { HOW, SIGNUP } from "@/lib/links";
import { CONTAINER, CTA_GHOST, ctaPrimary } from "@/lib/styleKit";

/**
 * A primeira dobra.
 *
 * Duas colunas que viram uma sozinhas: `auto-fit` com mínimo de 320px, que é a
 * largura abaixo da qual a ilustração do painel deixa de ser legível. Não há
 * breakpoint em lugar nenhum da página pelo mesmo motivo.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      style={css(
        "background:linear-gradient(180deg,var(--petrol) 0%,var(--petrol2) 100%);color:#fff;" +
          "padding:clamp(48px,7vw,88px) 20px clamp(56px,8vw,96px)",
      )}
    >
      <div
        style={css(
          CONTAINER +
            "display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));" +
            "gap:clamp(32px,5vw,56px);align-items:center",
        )}
      >
        <div>
          <div
            style={css(
              "display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.2);" +
                "background:rgba(255,255,255,.06);border-radius:999px;padding:6px 13px;" +
                "font-size:12.5px;letter-spacing:.02em;color:var(--on-petrol3);margin-bottom:22px",
            )}
          >
            {COPY.hero.badge}
          </div>

          <h1
            id="hero-title"
            style={css(
              "font-size:clamp(34px,5.2vw,54px);line-height:1.06;font-weight:800;" +
                "letter-spacing:-.025em;margin-bottom:20px",
            )}
          >
            {COPY.hero.title}
          </h1>

          {/* `46ch` e não uma largura em pixels: o limite de leitura confortável
              é medido em caracteres por linha, não em milímetros de tela. */}
          <p
            style={css(
              "font-size:clamp(16px,1.6vw,19px);line-height:1.55;color:var(--on-petrol2);" +
                "max-width:46ch;margin:0 0 30px",
            )}
          >
            {COPY.hero.subtitle}
          </p>

          <div
            style={css(
              "display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:22px",
            )}
          >
            <a className="lp-cta" href={SIGNUP} style={css(ctaPrimary(16, "15px 26px"))}>
              {COPY.hero.ctaPrimary}
            </a>
            <a className="lp-on-petrol" href={HOW} style={css(CTA_GHOST)}>
              {COPY.hero.ctaSecondary}
            </a>
          </div>

          {/* As três objeções respondidas antes de serem feitas: custa?, pede
              cartão?, funciona no meu celular? */}
          <p style={css("margin:0;font-size:13.5px;color:var(--on-petrol-muted)")}>
            {COPY.hero.note}
          </p>
        </div>

        <DashboardPreview />
      </div>
    </section>
  );
}
