import { css } from "@aguiar/ui";
import type { ReactNode } from "react";
import { Container } from "@/components/shared";
import { ctaPrimary, DISPLAY, H2, LEAD } from "@/lib/styleKit";

/**
 * A tela que aparece no lugar da página: o endereço que não existe e a falha na
 * geração. Ver `app/not-found.tsx` e `app/error.tsx`.
 *
 * POR QUE UMA SÓ: as duas são a mesma composição — um selo, uma manchete, uma
 * frase e um botão. Escritas separadas, a segunda é a que ficaria para trás no
 * primeiro ajuste de espaçamento.
 *
 * ELA VEM COM CABEÇALHO E RODAPÉ EM VOLTA, montados por quem chama. Quem chega
 * aqui veio por um link quebrado e ainda não conhece o produto: o menu do topo
 * é o que transforma o beco sem saída numa entrada.
 *
 * SEM `Reveal`. A dobra que revela ao entrar na viewport é para quem rola uma
 * página de argumento; aqui há uma tela só, sem rolagem, e conteúdo que começa
 * invisível numa tela de erro é conteúdo que pode não aparecer nunca.
 */
export function PageNotice({
  code,
  title,
  text,
  action,
}: {
  /** O selo pequeno acima da manchete: "404", "Erro". */
  code: string;
  title: string;
  text: string;
  /** O botão. É um `<a>` no 404 e um `<button>` no erro — por isso entra pronto. */
  action: ReactNode;
}) {
  return (
    <main
      style={css(
        // Altura mínima em vez de fixa: a faixa ocupa o que sobra da tela
        // depois do cabeçalho e do rodapé, e cresce se o texto quebrar em mais
        // linhas no celular.
        "display:flex;align-items:center;min-height:min(62vh,520px);" +
          "padding:clamp(56px,9vw,104px) 20px;background:var(--bg)",
      )}
    >
      <Container narrow>
        {/* A caixa é mais estreita que a faixa e centrada dentro dela: 560px é
            onde uma manchete de duas linhas e um parágrafo de quatro ainda se
            leem como um bloco só. Centralizar é `margin:0 auto` E
            `text-align:center` — a mesma dupla que `SectionIntro` usa. */}
        <div style={css("max-width:560px;margin:0 auto;text-align:center")}>
          <p
            style={css(
              `font-family:${DISPLAY};font-weight:800;font-size:13px;letter-spacing:.14em;` +
                "text-transform:uppercase;color:var(--accent);margin:0 0 14px",
            )}
          >
            {code}
          </p>

          <h1 style={css(H2 + "margin:0 0 14px")}>{title}</h1>

          <p style={css(LEAD + "margin:0 auto;max-width:44ch")}>{text}</p>

          <div style={css("margin-top:28px")}>{action}</div>
        </div>
      </Container>
    </main>
  );
}

/** O estilo do botão das duas telas — o mesmo das chamadas da página. */
export const NOTICE_CTA = ctaPrimary(15.5, "15px 26px");
