import { css } from "@aguiar/ui";
import { COPY } from "@/lib/dictionary";
import { DISPLAY, EYEBROW } from "@/lib/styleKit";

/**
 * O depoimento.
 *
 * A citação é um `<blockquote>` com `<figcaption>`: quem diz é parte do que é
 * dito, e essa ligação some se os dois forem só duas `div` empilhadas.
 *
 * A foto é um marcador riscado — o mesmo do arquivo de design — porque ainda
 * não há um depoimento real. Trocar `COPY.testimonial` e pôr a foto no lugar do
 * marcador é tudo que falta.
 */
export function Testimonial() {
  return (
    <section style={css("padding:clamp(56px,7vw,80px) 20px;background:var(--bg)")}>
      <figure
        style={css(
          "max-width:820px;margin:0 auto;background:var(--surface);border:1px solid var(--border);" +
            "border-radius:18px;padding:clamp(28px,4vw,44px)",
        )}
      >
        <div style={css(EYEBROW + "margin-bottom:20px")}>{COPY.testimonial.eyebrow}</div>

        <blockquote
          style={css(
            "font-size:clamp(19px,2.4vw,25px);line-height:1.45;" +
              `font-family:${DISPLAY};font-weight:600;color:var(--petrol);` +
              "letter-spacing:-.01em;margin:0 0 26px",
          )}
        >
          {COPY.testimonial.quote}
        </blockquote>

        <figcaption style={css("display:flex;align-items:center;gap:14px")}>
          <div
            aria-hidden="true"
            style={css(
              "width:46px;height:46px;border-radius:50%;flex:none;" +
                "background:repeating-linear-gradient(135deg,#e4eaec 0 6px,#f2f5f6 6px 12px);" +
                "border:1px solid #dce3e6;display:flex;align-items:center;justify-content:center;" +
                "font-family:ui-monospace,Menlo,monospace;font-size:8px;color:var(--muted2)",
            )}
          >
            {COPY.testimonial.photo}
          </div>
          <div>
            <div
              style={css(
                `font-family:${DISPLAY};font-weight:700;font-size:15.5px;color:var(--petrol)`,
              )}
            >
              {COPY.testimonial.name}
            </div>
            <div style={css("font-size:14px;color:var(--muted)")}>{COPY.testimonial.role}</div>
          </div>
        </figcaption>
      </figure>
    </section>
  );
}
