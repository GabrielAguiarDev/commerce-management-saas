import { css } from "@aguiar/ui";
import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { Container } from "@/components/shared";
import { COPY } from "@/lib/dictionary";
import { DISPLAY, EYEBROW, grid } from "@/lib/styleKit";

/**
 * Os depoimentos.
 *
 * ERAM UM, AGORA SÃO DOIS LADO A LADO — e a mudança não é de estética, é de
 * argumento: um depoimento é uma pessoa satisfeita, dois de ramos diferentes
 * são um padrão. Como a dobra "Para quem é" divide o público em quem vende
 * comida e quem vende produto de prateleira, os dois cards aqui embaixo são a
 * prova de cada metade — e é por isso que vale a pena um de cada.
 *
 * A GRADE É A MESMA DAS OUTRAS DOBRAS (`auto-fit` com mínimo), então a
 * quantidade não está travada em dois: um terceiro depoimento entra no
 * dicionário e a fila se reparte sozinha; no celular os cards viram uma pilha.
 * A faixa é a ESTREITA (1000px) — em 1160 cada citação ficaria com uma linha
 * longa demais para o corpo grande em que ela é escrita.
 *
 * O OLHO-MÁGICO SAIU DE DENTRO DO CARD e virou o rótulo da dobra, uma vez só,
 * centralizado sobre as duas colunas. Repetido em cada card ele seria lido duas
 * vezes seguidas por quem ouve a página, para dizer a mesma coisa.
 *
 * Cada card continua sendo `<figure>` + `<blockquote>` + `<figcaption>`: quem
 * diz é parte do que é dito, e essa ligação some se forem `div` empilhadas.
 */
export function Testimonial() {
  const { eyebrow, items } = COPY.testimonial;

  return (
    <section
      aria-labelledby="testimonial-label"
      style={css("padding:clamp(56px,7vw,80px) 20px;background:var(--bg)")}
    >
      <Container narrow>
        <Reveal>
          {/* `id` para a seção ter nome na lista de regiões de um leitor de
              tela: esta dobra não tem manchete, e o rótulo é tudo que há. */}
          <div id="testimonial-label" style={css(EYEBROW + "text-align:center;margin-bottom:22px")}>
            {eyebrow}
          </div>
        </Reveal>

        <div style={css(grid(300, 20))}>
          {items.map((item, i) => (
            <Reveal
              key={item.name + i}
              as="figure"
              delay={i * 80}
              style={css(
                "margin:0;background:var(--surface);border:1px solid var(--border);" +
                  "border-radius:18px;padding:clamp(26px,3vw,34px)",
              )}
            >
              {/* O corpo é menor que o dos 25px de quando havia uma citação só:
                  a coluna caiu para ~490px, e o tamanho antigo daria quatro
                  palavras por linha. */}
              <blockquote
                style={css(
                  "font-size:clamp(18px,2vw,21px);line-height:1.45;" +
                    `font-family:${DISPLAY};font-weight:600;color:var(--petrol);` +
                    "letter-spacing:-.01em;margin:0 0 24px",
                )}
              >
                {item.quote}
              </blockquote>

              <figcaption style={css("display:flex;align-items:center;gap:14px")}>
                <Avatar photo={item.photo} name={item.name} />
                <div>
                  <div
                    style={css(
                      `font-family:${DISPLAY};font-weight:700;font-size:15.5px;color:var(--petrol)`,
                    )}
                  >
                    {item.name}
                  </div>
                  <div style={css("font-size:14px;color:var(--muted)")}>{item.role}</div>
                </div>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/**
 * A foto de quem falou — ou o marcador, enquanto ela não existe.
 *
 * A REGRA É O `/` NA FRENTE. `photo` começando com barra é tratado como arquivo
 * em `public/` e vira imagem; qualquer outra coisa ("foto", vazio) desenha o
 * círculo riscado do arquivo de design. Assim publicar a foto de verdade é
 * trocar uma string no dicionário, sem tocar em componente nenhum.
 *
 * O `alt` é vazio de propósito: o nome de quem falou está escrito ao lado, em
 * texto, e um `alt` com o mesmo nome faria o leitor de tela dizê-lo duas vezes.
 */
function Avatar({ photo, name }: { photo: string; name: string }) {
  if (photo.startsWith("/")) {
    return (
      <Image
        src={photo}
        alt=""
        width={46}
        height={46}
        style={{ flex: "none", borderRadius: "50%", objectFit: "cover", display: "block" }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      title={name}
      style={css(
        "width:46px;height:46px;border-radius:50%;flex:none;" +
          "background:repeating-linear-gradient(135deg,#e4eaec 0 6px,#f2f5f6 6px 12px);" +
          "border:1px solid #dce3e6;display:flex;align-items:center;justify-content:center;" +
          "font-family:ui-monospace,Menlo,monospace;font-size:8px;color:var(--muted2)",
      )}
    >
      {photo}
    </div>
  );
}
