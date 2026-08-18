/**
 * O vocabulário visual da página de entrada.
 *
 * Mesma forma dos portais (`lib/styleKit.ts` do console): strings de declaração
 * CSS, que `css()` converte no objeto que o React quer. O que mora aqui é o que
 * aparece em mais de uma dobra — a medida da faixa, o olho-mágico, a manchete
 * de seção, o card, o botão. O que é de uma dobra só fica no componente dela.
 *
 * As cores nunca são literais: todas apontam para as variáveis de
 * `app/globals.css`. Uma cor escrita à mão aqui é uma cor que ninguém encontra
 * depois.
 */

export const DISPLAY = "var(--display-stack)";

/** A largura útil da página. A dobra de planos usa a estreita. */
export const CONTAINER = "max-width:1160px;margin:0 auto;";
export const CONTAINER_NARROW = "max-width:1000px;margin:0 auto;";

/**
 * A respiração vertical de uma dobra.
 *
 * `clamp` e não breakpoint: entre o celular e o desktop a folga cresce junto
 * com a largura, em vez de saltar em dois ou três degraus.
 */
export const SECTION = "padding:clamp(56px,7vw,88px) 20px;";

/** O rótulo miúdo, na primária escrita, que abre cada dobra. */
export const EYEBROW =
  `font-family:${DISPLAY};font-size:12.5px;font-weight:700;letter-spacing:.09em;` +
  "text-transform:uppercase;color:var(--accent-text);margin-bottom:12px;";

/** A manchete de dobra. */
export const H2 =
  "font-size:clamp(26px,3.4vw,38px);line-height:1.12;font-weight:800;" +
  "letter-spacing:-.02em;color:var(--petrol);";

/** O parágrafo de apoio da manchete. */
export const LEAD = "font-size:17px;line-height:1.6;color:var(--text2);margin:0;";

/** A coluna de texto que abre a dobra. Não passa de ~620px por legibilidade. */
export const SECTION_INTRO = "max-width:620px;";

/** O card branco padrão. */
export const CARD =
  "background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:26px;";

/** Título de card. */
export const CARD_TITLE = "font-size:19px;font-weight:700;margin-bottom:9px;color:var(--petrol);";

/** Corpo de card. */
export const CARD_TEXT = "font-size:15px;line-height:1.6;color:var(--text2);margin:0 0 14px;";

/**
 * Grade que se reparte sozinha.
 *
 * `auto-fit` com um mínimo é o que substitui os breakpoints: as colunas cabem
 * enquanto couberem e viram uma só quando não couberem mais. O mínimo muda por
 * dobra porque o conteúdo muda — card de módulo aperta mais que card de plano.
 */
export const grid = (min: number, gap: number) =>
  `display:grid;grid-template-columns:repeat(auto-fit,minmax(${min}px,1fr));gap:${gap}px;`;

/** A chamada para ação, na primária viva. Vem sempre com a classe `lp-cta`. */
export const ctaPrimary = (size: number, padding: string) =>
  `background:var(--accent);color:#fff;font-family:${DISPLAY};font-weight:700;` +
  `font-size:${size}px;padding:${padding};border-radius:12px;` +
  "box-shadow:0 6px 20px var(--accent-glow);display:inline-block;";

/**
 * A chamada secundária ao lado do botão: só texto, sem caixa. Vem com a classe
 * `lp-link`.
 *
 * Era `--on-petrol` de quando a primeira dobra era escura. Sobre o claro de
 * agora quem serve é `--petrol`, e não o `--accent-text` que a página usa em
 * link: medido, a primária escrita dá ~4.4:1 no ponto mais forte do véu da
 * dobra e não alcança o AA. O petrol dá 10.54:1 no mesmo ponto.
 *
 * Só o Hero usa esta constante — a última dobra, que também tem uma chamada
 * secundária, escreve a dela inline porque continua sobre petrol.
 */
export const CTA_GHOST =
  "color:var(--petrol);font-size:15px;font-weight:500;padding:15px 6px;display:inline-block;";

/** O selo de plano de um card de módulo. */
export const moduleTag = (free: boolean) =>
  "font-size:11.5px;font-weight:600;border-radius:999px;padding:5px 10px;" +
  (free
    ? "color:var(--pos);background:var(--pos-soft);"
    : "color:var(--text3);background:var(--neutral-soft);");
