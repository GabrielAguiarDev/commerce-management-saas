import { SANS, badge } from "@aguiar/ui";

/**
 * O vocabulário visual que é só do portal.
 *
 * O painel, a lista, o selo, o botão, o field e a pílula vêm de `@aguiar/ui` —
 * são os mesmos do painel administrativo. O que fica aqui é o que só este
 * produto desenha: as variantes compactas da barra de filtros e a regra de
 * colunas que o portal usa no lugar de media query.
 */

/** Os selos prontos que as telas usam direto, sem escolher tom na hora. */
export const BADGE_NEUTRAL = badge("neutral");
export const BADGE_ACC = badge("acc");
export const BADGE_POS = badge("pos");
export const BADGE_WARN = badge("warn");
export const BADGE_DANGER = badge("danger");

/** Versão compacta do field, usada nas barras de filtro. */
export function filterField(): string {
  return (
    "padding:10px 13px;border:1px solid var(--border);border-radius:10px;background:var(--surface);" +
    `font:500 13px ${SANS};color:var(--text);outline:none`
  );
}

export function filterPicker(): string {
  return (
    "padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface);" +
    `font:600 12.5px ${SANS};color:var(--text2);outline:none`
  );
}

/** Colunas que se adaptam sem media query — o portal só tem dois tamanhos. */
export function columns(mobile: boolean, desktop: string, celular = "1fr"): string {
  return mobile ? celular : desktop;
}
