import { css } from "@aguiar/ui";
import { Check, Container, SectionIntro } from "@/components/shared";
import { COPY } from "@/lib/dictionary";
import { PLANS, SIGNUP } from "@/lib/links";
import { DISPLAY, SECTION } from "@/lib/styleKit";

const PRICE = `font-family:${DISPLAY};font-weight:800;font-size:38px;letter-spacing:-.02em;`;
const PLAN_NAME = "font-size:20px;font-weight:700;margin-bottom:6px;";
const PITCH = "font-size:14.5px;margin:0 0 18px;";
const PLAN_CTA =
  `display:block;text-align:center;font-family:${DISPLAY};font-weight:700;` +
  "font-size:15.5px;padding:14px;border-radius:12px;margin-bottom:24px;";

/**
 * "Planos".
 *
 * A faixa é a estreita (1000px): duas colunas de plano numa faixa de 1160
 * ficariam largas demais e a comparação entre elas exigiria varrer a tela.
 *
 * As duas chamadas levam ao MESMO lugar, o cadastro gratuito — inclusive a do
 * plano pago. É de propósito: ninguém digita cartão antes de ver o sistema
 * funcionando, e é isso que "começar grátis e testar" está dizendo.
 */
export function Plans() {
  const { free, full } = COPY.plans;

  return (
    <section
      id={PLANS.slice(1)}
      aria-labelledby="plans-title"
      style={css(SECTION + "background:var(--surface);border-top:1px solid var(--rule)")}
    >
      <Container narrow>
        <SectionIntro
          id="plans-title"
          eyebrow={COPY.plans.eyebrow}
          title={COPY.plans.title}
          lead={COPY.plans.subtitle}
        />

        {/* `align-items:start` para que o card do plano pago, que tem um item a
            mais, não estique o gratuito junto. */}
        <div
          style={css(
            "display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));" +
              "gap:20px;align-items:start",
          )}
        >
          {/* Gratuito */}
          <div
            style={css(
              "border:1px solid var(--border);border-radius:18px;padding:28px;background:var(--surface2)",
            )}
          >
            <h3 style={css(PLAN_NAME + "color:var(--petrol)")}>{free.name}</h3>
            <p style={css(PITCH + "color:var(--text2)")}>{free.pitch}</p>
            <div style={css("display:flex;align-items:baseline;gap:6px;margin-bottom:22px")}>
              <span style={css(PRICE + "color:var(--petrol)")}>{free.price}</span>
              <span style={css("font-size:14.5px;color:var(--muted)")}>{free.unit}</span>
            </div>
            <a
              className="lp-outline"
              href={SIGNUP}
              style={css(PLAN_CTA + "border:1px solid var(--petrol);color:var(--petrol)")}
            >
              {free.cta}
            </a>
            <div style={css("display:flex;flex-direction:column;gap:11px")}>
              {free.features.map((f) => (
                <Check key={f}>{f}</Check>
              ))}
            </div>
          </div>

          {/* Completo. A etiqueta "Recomendado" fica montada sobre a borda
              superior — daí o `position:relative` no card e o topo negativo. */}
          <div
            style={css(
              "border:1.5px solid var(--petrol);border-radius:18px;padding:28px;" +
                "background:var(--petrol);color:#fff;position:relative;" +
                "box-shadow:0 16px 40px rgba(18,50,60,.18)",
            )}
          >
            <div
              style={css(
                "position:absolute;top:-13px;left:28px;background:var(--accent);color:#fff;" +
                  `font-family:${DISPLAY};font-weight:700;font-size:11.5px;letter-spacing:.05em;` +
                  "text-transform:uppercase;padding:6px 12px;border-radius:999px",
              )}
            >
              {COPY.plans.recommended}
            </div>
            <h3 style={css(PLAN_NAME + "color:#fff")}>{full.name}</h3>
            <p style={css(PITCH + "color:var(--on-petrol3)")}>{full.pitch}</p>
            <div style={css("display:flex;align-items:baseline;gap:6px;margin-bottom:22px")}>
              <span style={css(PRICE + "color:#fff")}>{full.price}</span>
              <span style={css("font-size:14.5px;color:var(--on-petrol-muted)")}>{full.unit}</span>
            </div>
            <a
              className="lp-cta"
              href={SIGNUP}
              style={css(PLAN_CTA + "background:var(--accent);color:#fff")}
            >
              {full.cta}
            </a>
            <div style={css("display:flex;flex-direction:column;gap:11px")}>
              {full.features.map((f) => (
                <Check key={f} dark>
                  {f}
                </Check>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
