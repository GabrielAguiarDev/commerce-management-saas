import { css } from "@aguiar/ui";
import { Reveal } from "@/components/Reveal";
import { Container, SectionIntro } from "@/components/shared";
import { COPY } from "@/lib/dictionary";
import { HOW_ID } from "@/lib/links";
import { CARD, CARD_TEXT, grid, DISPLAY, SECTION } from "@/lib/styleKit";

/**
 * ===========================================================================
 * FORA DA PÁGINA. Este componente NÃO é renderizado hoje: `<Numbers>` ocupa a
 * posição que era dele em `app/page.tsx`. Ele fica aqui de propósito, e o texto
 * dele continua em `COPY.how` — voltar atrás é trocar uma linha na página.
 *
 * SE VOLTAR, RESOLVA A ÂNCORA PRIMEIRO: `<Numbers>` herdou o `id="como"`, que é
 * para onde a chamada secundária da primeira dobra aponta. As duas dobras não
 * podem declarar o mesmo `id` na mesma página — ou uma abre mão dele, ou
 * `lib/links.ts` ganha uma âncora nova para a outra.
 * ===========================================================================
 *
 * "Como funciona" — três passos.
 *
 * O número do último passo é a primária, e não o petrol dos outros dois:
 * é onde a pessoa chega, e o único dos três que descreve o sistema já em uso.
 */
export function HowItWorks() {
  const steps = COPY.how.steps;

  return (
    <section
      id={HOW_ID}
      aria-labelledby="how-title"
      style={css(SECTION + "background:var(--bg)")}
    >
      <Container>
        <Reveal>
          <SectionIntro id="how-title" eyebrow={COPY.how.eyebrow} title={COPY.how.title} />
        </Reveal>

        {/* Uma lista ordenada: a ordem dos passos é conteúdo, não visual, e é o
            que um leitor de tela anuncia como "item 1 de 3". */}
        <ol style={css(grid(260, 18) + "list-style:none;margin:0;padding:0")}>
          {/* `as="li"` e não um `<div>` dentro do `<li>`: a lista ordenada é o
              que faz um leitor de tela anunciar "item 1 de 3", e um invólucro
              entre o `ol` e o `li` desmontaria isso. */}
          {steps.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 80} style={css(CARD)}>
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
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}
