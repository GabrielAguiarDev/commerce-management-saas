import { css } from "@aguiar/ui";
import { Container, SectionIntro } from "@/components/shared";
import { COPY } from "@/lib/dictionary";
import { CARD, CARD_TEXT, CARD_TITLE, grid, SECTION } from "@/lib/styleKit";

/**
 * Os três ícones da dobra: um quadrado, um círculo e um losango.
 *
 * São formas e não pictogramas de propósito — nenhum desenho serve igualmente
 * bem para "acarajé, lanches e food" e para "barbearia, mercadinho, ateliê,
 * oficina". Elas marcam que os três cards são coisas diferentes sem afirmar o
 * que cada uma é; o título ao lado já faz isso.
 */
const SHAPES = [
  "width:14px;height:14px;border-radius:4px;background:var(--teal)",
  "width:14px;height:14px;border-radius:50%;background:var(--teal)",
  "width:14px;height:14px;background:var(--accent);transform:rotate(45deg)",
];

/**
 * "Para quem é".
 *
 * O terceiro card é escuro: ele é o que fala com todo mundo que não se
 * reconheceu nos dois primeiros, e é o que a página mais precisa que seja lido.
 */
export function Audiences() {
  const items = COPY.audiences.items;

  return (
    <section aria-labelledby="audiences-title" style={css(SECTION + "background:var(--bg)")}>
      <Container>
        <SectionIntro
          id="audiences-title"
          eyebrow={COPY.audiences.eyebrow}
          title={COPY.audiences.title}
          lead={COPY.audiences.subtitle}
        />

        <div style={css(grid(260, 18))}>
          {items.map((item, i) => {
            const dark = i === items.length - 1;
            return (
              <div
                key={item.title}
                style={css(
                  dark
                    ? "background:var(--petrol);border:1px solid var(--petrol);border-radius:16px;padding:26px;color:#fff"
                    : CARD,
                )}
              >
                <div
                  aria-hidden="true"
                  style={css(
                    "width:38px;height:38px;border-radius:11px;display:flex;align-items:center;" +
                      "justify-content:center;margin-bottom:16px;background:" +
                      (dark ? "rgba(255,255,255,.12)" : "var(--teal-soft)"),
                  )}
                >
                  <div style={css(SHAPES[i] ?? SHAPES[0])} />
                </div>

                <h3 style={css(CARD_TITLE + (dark ? "color:#fff" : ""))}>{item.title}</h3>
                <p style={css(CARD_TEXT + (dark ? "color:var(--on-petrol3)" : ""))}>{item.text}</p>
                <div
                  style={css(
                    "font-size:13px;font-weight:500;color:" +
                      (dark ? "var(--on-petrol-accent)" : "var(--text3)"),
                  )}
                >
                  {item.note}
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
