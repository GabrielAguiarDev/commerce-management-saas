import { css } from "@aguiar/ui";
import { Container } from "@/components/shared";
import { COPY } from "@/lib/dictionary";
import { MODULES, PLANS, SIGNUP } from "@/lib/links";
import { EYEBROW, grid, H2, LEAD, moduleTag, SECTION } from "@/lib/styleKit";

const MODULE_CARD =
  "border:1px solid var(--border);border-radius:16px;padding:24px;background:var(--surface2);";

/**
 * "Módulos" — a dobra que sustenta a promessa de montar o sistema.
 *
 * A abertura aqui não usa `SectionIntro`: é a única da página com um link
 * alinhado à direita do texto, empurrado para o pé da coluna por
 * `align-items:flex-end`, e essa exceção não vale um parâmetro no componente
 * compartilhado.
 *
 * O último card é vazado e tracejado. Ele não é um módulo — é o argumento
 * inverso, o de DESLIGAR o que não se usa —, e a borda tracejada é o que diz
 * isso antes de alguém ler o título.
 */
export function Modules() {
  // O `id` sai da MESMA constante que o menu do topo aponta — assim renomear a
  // âncora não pode deixar o link do menu apontando para lugar nenhum.
  return (
    <section
      id={MODULES.slice(1)}
      aria-labelledby="modules-title"
      style={css(
        SECTION +
          "background:var(--surface);border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)",
      )}
    >
      <Container>
        <div
          style={css(
            "display:flex;flex-wrap:wrap;gap:20px;align-items:flex-end;" +
              "justify-content:space-between;margin-bottom:36px",
          )}
        >
          <div style={css("max-width:620px")}>
            <div style={css(EYEBROW)}>{COPY.modules.eyebrow}</div>
            <h2 id="modules-title" style={css(H2 + "margin-bottom:14px")}>
              {COPY.modules.title}
            </h2>
            <p style={css(LEAD)}>{COPY.modules.subtitle}</p>
          </div>
          <a
            className="lp-link"
            href={PLANS}
            style={css("font-size:15px;font-weight:600;color:var(--teal)")}
          >
            {COPY.modules.link}
          </a>
        </div>

        <div style={css(grid(250, 16))}>
          {COPY.modules.items.map((item) => (
            <div key={item.title} className="lp-card" style={css(MODULE_CARD)}>
              <div
                style={css(
                  "display:flex;align-items:center;justify-content:space-between;margin-bottom:14px",
                )}
              >
                <div
                  aria-hidden="true"
                  style={css("width:34px;height:34px;border-radius:10px;background:var(--petrol)")}
                />
                <span style={css(moduleTag(item.free))}>
                  {item.free ? COPY.modules.freeTag : COPY.modules.paidTag}
                </span>
              </div>
              <h3 style={css("font-size:18px;font-weight:700;margin-bottom:8px;color:var(--petrol)")}>
                {item.title}
              </h3>
              <p style={css("font-size:14.5px;line-height:1.6;color:var(--text2);margin:0")}>
                {item.text}
              </p>
            </div>
          ))}

          <div
            style={css(
              "border:1px dashed var(--dashed);border-radius:16px;padding:24px;" +
                "background:var(--surface);display:flex;flex-direction:column;justify-content:center",
            )}
          >
            <h3 style={css("font-size:18px;font-weight:700;margin-bottom:8px;color:var(--petrol)")}>
              {COPY.modules.custom.title}
            </h3>
            <p style={css("font-size:14.5px;line-height:1.6;color:var(--text2);margin:0 0 14px")}>
              {COPY.modules.custom.text}
            </p>
            <a
              className="lp-link"
              href={SIGNUP}
              style={css("font-size:14.5px;font-weight:600;color:var(--teal)")}
            >
              {COPY.modules.custom.cta}
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
