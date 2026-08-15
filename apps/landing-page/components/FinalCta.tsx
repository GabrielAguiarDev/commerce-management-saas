import { css } from "@aguiar/ui";
import { Reveal } from "@/components/Reveal";
import { COPY } from "@/lib/dictionary";
import { PLANS, SIGNUP } from "@/lib/links";
import { ctaPrimary } from "@/lib/styleKit";

/**
 * A última dobra: a mesma chamada da primeira, agora para quem leu a página
 * inteira. Centralizada e sem nada em volta — não há mais nada para comparar,
 * só para decidir.
 */
export function FinalCta() {
  return (
    <section
      id="cta"
      aria-labelledby="cta-title"
      style={css("padding:clamp(56px,7vw,92px) 20px;background:var(--petrol);color:#fff")}
    >
      {/* A dobra inteira num bloco só, sem cascata: aqui não há lista para
          ordenar, e escalonar título, texto e botão faria a decisão esperar. */}
      <Reveal style={css("max-width:760px;margin:0 auto;text-align:center")}>
        <h2
          id="cta-title"
          style={css(
            "font-size:clamp(28px,4vw,44px);line-height:1.1;font-weight:800;" +
              "letter-spacing:-.025em;margin-bottom:16px",
          )}
        >
          {COPY.finalCta.title}
        </h2>
        <p
          style={css(
            "font-size:clamp(16px,1.7vw,19px);line-height:1.55;color:var(--on-petrol2);" +
              "margin:0 auto 30px;max-width:44ch",
          )}
        >
          {COPY.finalCta.subtitle}
        </p>
        <div
          style={css("display:flex;flex-wrap:wrap;gap:12px;justify-content:center;align-items:center")}
        >
          <a className="lp-cta" href={SIGNUP} style={css(ctaPrimary(16.5, "16px 30px"))}>
            {COPY.finalCta.primary}
          </a>
          <a
            className="lp-on-petrol"
            href={PLANS}
            style={css(
              "color:var(--on-petrol);font-size:15px;font-weight:500;padding:16px 8px;display:inline-block",
            )}
          >
            {COPY.finalCta.secondary}
          </a>
        </div>
        <p style={css("margin:20px 0 0;font-size:13.5px;color:var(--on-petrol-muted)")}>
          {COPY.finalCta.note}
        </p>
      </Reveal>
    </section>
  );
}
