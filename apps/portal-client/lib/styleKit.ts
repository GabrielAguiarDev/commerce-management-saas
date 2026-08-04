import { SANS, selo } from "@aguiar/ui";

/**
 * O vocabulário visual que é só do portal.
 *
 * O painel, a lista, o selo, o botão, o campo e a pílula vêm de `@aguiar/ui` —
 * são os mesmos do painel administrativo. O que fica aqui é o que só este
 * produto desenha: as variantes compactas da barra de filtros e a regra de
 * colunas que o portal usa no lugar de media query.
 */

/** Os selos prontos que as telas usam direto, sem escolher tom na hora. */
export const SELO_NEUTRO = selo("neutro");
export const SELO_ACC = selo("acc");
export const SELO_POS = selo("pos");
export const SELO_WARN = selo("warn");
export const SELO_DANGER = selo("danger");

/** Versão compacta do campo, usada nas barras de filtro. */
export function campoFiltro(): string {
  return (
    "padding:10px 13px;border:1px solid var(--border);border-radius:10px;background:var(--surface);" +
    `font:500 13px ${SANS};color:var(--text);outline:none`
  );
}

export function seletorFiltro(): string {
  return (
    "padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface);" +
    `font:600 12.5px ${SANS};color:var(--text2);outline:none`
  );
}

/** Colunas que se adaptam sem media query — o portal só tem dois tamanhos. */
export function colunas(mobile: boolean, desktop: string, celular = "1fr"): string {
  return mobile ? celular : desktop;
}
