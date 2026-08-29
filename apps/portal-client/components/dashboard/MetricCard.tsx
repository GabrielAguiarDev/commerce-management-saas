"use client";

import { css, NUM, PANEL, SANS } from "@aguiar/ui";
import { ehLargo } from "@/lib/grid";

/**
 * Um número do resumo de hoje, em dois feitios.
 *
 * EMPILHADO, quando o cartão tem a largura de uma coluna: o ponto colorido e o
 * rótulo em cima, o valor embaixo, a nota colada no rodapé. É o feitio de
 * sempre.
 *
 * HORIZONTAL, quando a grade deu ao cartão mais de uma coluna: rótulo à
 * esquerda, valor à direita, na mesma linha de base. Existe porque a grade
 * fecha a última linha esticando quem sobrou, e um cartão esticado no feitio
 * empilhado é um retângulo com um número pequeno no canto e um vazio enorme
 * embaixo — pior que o buraco que o esticamento veio consertar.
 *
 * O gatilho é `span > 1`, e não uma fração de largura: no celular, com duas
 * colunas, meia linha é a largura NORMAL de um cartão. Ver `ehLargo` em
 * `lib/grid.ts`.
 *
 * QUEM ESCOLHE É O CSS, NÃO ESTE COMPONENTE. Os dois spans chegam como
 * variáveis inline e a media query de `globals.css` decide qual vale — assim o
 * feitio já vem certo no primeiro pixel, em vez de saltar quando o navegador
 * finalmente mede a janela.
 *
 * A cor do valor entra por fora porque é significado, não estilo: verde é lucro,
 * vermelho é prejuízo, e o padrão é `--text` porque um faturamento não é nem uma
 * coisa nem outra.
 */
export interface MetricCardProps {
  label: string;
  value: string;
  note: string;
  /** A cor do NÚMERO. `--pos` só quando o número for de fato positivo. */
  color: string;
  /** O ponto que identifica o cartão à esquerda do rótulo. */
  dot: string;
}

export function MetricCard({
  label,
  value,
  note,
  color,
  dot,
  spanDesktop,
  spanMobile,
}: MetricCardProps & { spanDesktop: number; spanMobile: number }) {
  return (
    <div
      className="kpi-card"
      style={css(
        `display:flex;flex-direction:column;height:100%;min-height:132px;padding:16px;${PANEL};` +
          `--span-d:${spanDesktop};--span-m:${spanMobile};` +
          `--dir-d:${ehLargo(spanDesktop) ? "row" : "column"};` +
          `--dir-m:${ehLargo(spanMobile) ? "row" : "column"}`,
      )}
    >
      <div className="kpi-head">
        <div style={css("display:flex;align-items:center;gap:8px;min-width:0")}>
          <span style={css(`flex:none;width:8px;height:8px;border-radius:3px;background:${dot}`)} />
          <span style={css(`font:500 12px ${SANS};color:var(--muted)`)}>{label}</span>
        </div>
        <div
          style={css(
            `flex:none;font:700 clamp(19px,2.1vw,26px)/1.15 ${SANS};${NUM};letter-spacing:-.02em;white-space:nowrap;color:${color}`,
          )}
        >
          {value}
        </div>
      </div>
      <div style={css(`margin-top:auto;padding-top:8px;font:500 11.5px/1.35 ${SANS};color:var(--muted)`)}>
        {note}
      </div>
    </div>
  );
}
