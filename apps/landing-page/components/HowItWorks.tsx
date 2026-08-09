import { css } from "@aguiar/ui";
import { Container, SectionIntro } from "@/components/shared";
import { COPY } from "@/lib/dictionary";
import { HOW } from "@/lib/links";
import { CARD, CARD_TEXT, grid, DISPLAY, SECTION } from "@/lib/styleKit";

/**
 * "Como funciona" — três passos.
 *
 * O número do último passo é o teal de chamada, e não o petrol dos outros dois:
 * é onde a pessoa chega, e o único dos três que descreve o sistema já em uso.
 */
export function HowItWorks() {
  const steps = COPY.how.steps;

  return (
    <section
      id={HOW.slice(1)}
      aria-labelledby="how-title"
      style={css(SECTION + "background:var(--bg)")}
    >
      <Container>
        <SectionIntro id="how-title" eyebrow={COPY.how.eyebrow} title={COPY.how.title} />

        {/* Uma lista ordenada: a ordem dos passos é conteúdo, não visual, e é o
            que um leitor de tela anuncia como "item 1 de 3". */}
        <ol style={css(grid(260, 18) + "list-style:none;margin:0;padding:0")}>
          {steps.map((step, i) => (
            <li key={step.title} style={css(CARD)}>
              <div
                aria-hidden="true"
                style={css(
                  `font-family:${DISPLAY};font-weight:800;font-size:15px;color:#fff;` +
                    "width:32px;height:32px;border-radius:9px;display:flex;align-items:center;" +
                    "justify-content:center;margin-bottom:16px;background:" +
                    (i === steps.length - 1 ? "var(--accent)" : "var(--petrol)"),
                )}
              >
                {i + 1}
              </div>
              <h3 style={css("font-size:18px;font-weight:700;margin-bottom:9px;color:var(--petrol)")}>
                {step.title}
              </h3>
              <p style={css(CARD_TEXT + "margin:0")}>{step.text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
