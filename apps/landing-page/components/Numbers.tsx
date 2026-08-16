import { css } from "@aguiar/ui";
import { CountUp } from "@/components/CountUp";
import { Reveal } from "@/components/Reveal";
import { Container, SectionIntro } from "@/components/shared";
import { COPY } from "@/lib/dictionary";
import { HOW } from "@/lib/links";
import { DISPLAY, SECTION } from "@/lib/styleKit";

/**
 * A dobra dos números — quatro contagens lado a lado, separadas por divisórias.
 *
 * ELA OCUPA O LUGAR DE "COMO FUNCIONA", inclusive a ÂNCORA: o `id` é o mesmo
 * `#como` de antes porque a chamada secundária da primeira dobra ("Ver como
 * funciona →") aponta para ele, e essa dobra não foi tocada nesta entrega.
 * Como a dobra nova está exatamente na mesma posição da antiga, o link leva o
 * visitante ao mesmo ponto da página; o que mudou é o que ele encontra lá. Se
 * "Como funciona" um dia voltar, as duas não podem declarar `id="como"` ao
 * mesmo tempo — uma das duas tem de abrir mão dele.
 *
 * A ABERTURA É CENTRALIZADA, e é a única da página que é: as quatro colunas
 * abaixo são simétricas em torno do eixo do meio, e um título encostado à
 * esquerda em cima delas ficaria pendurado fora do desenho.
 *
 * UM `<Reveal>` SÓ PARA AS QUATRO COLUNAS, sem escalonamento. No resto da
 * página os cards entram em cascata de 80ms porque são coisas independentes que
 * se leem em ordem; aqui é um placar, e as quatro contagens só leem como uma
 * coisa se subirem juntas. O `<Reveal>` também é o que esconde o quadro em que
 * os números são zerados — ver o bloco de comentário em `CountUp.tsx`, que
 * depende disso.
 *
 * O ARRANJO (4 colunas / 2×2 no celular) e as divisórias moram no `globals.css`,
 * atrás de `.lp-stats`. Não dá para fazer inline: o que muda entre as duas
 * larguras é QUAIS itens têm borda, e isso é `nth-child` mais uma media query —
 * e `style` inline venceria a media query na cascata.
 */
export function Numbers() {
  return (
    <section
      id={HOW.slice(1)}
      aria-labelledby="numbers-title"
      style={css(SECTION + "background:var(--bg)")}
    >
      <Container>
        <Reveal>
          <SectionIntro
            id="numbers-title"
            eyebrow={COPY.numbers.eyebrow}
            title={COPY.numbers.title}
            lead={COPY.numbers.subtitle}
            center
          />
        </Reveal>

        <Reveal className="lp-stats">
          {COPY.numbers.items.map((item) => (
            <div key={item.label} className="lp-stat" style={css("text-align:center")}>
              <div
                style={css(
                  `font-family:${DISPLAY};font-weight:800;color:var(--petrol);` +
                    "font-size:clamp(36px,4.6vw,50px);line-height:1.05;letter-spacing:-.03em;" +
                    "margin-bottom:12px",
                )}
              >
                <CountUp value={item.value} prefix={item.prefix} suffix={item.suffix} />
              </div>

              {/* `h3` e não mais uma `div`: são as quatro coisas que esta dobra
                  afirma, e é assim que elas aparecem na lista de títulos de um
                  leitor de tela em vez de sumirem no meio do texto. */}
              <h3
                style={css(
                  "font-size:15px;font-weight:700;color:var(--petrol);margin-bottom:7px;" +
                    "letter-spacing:-.01em",
                )}
              >
                {item.label}
              </h3>

              <p style={css("font-size:14px;line-height:1.5;color:var(--text2);margin:0")}>
                {item.text}
              </p>
            </div>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
