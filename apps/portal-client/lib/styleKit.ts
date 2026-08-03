import { MONO, SANS } from "@/lib/css";

/**
 * Vocabulário visual compartilhado. Cada auxiliar devolve uma string de
 * declaração CSS para entregar a `css()` — ver `css.ts` para o porquê de o
 * portal trabalhar com strings.
 */

/** O cartão branco com borda e sombra que sustenta quase toda a interface. */
export const PAINEL =
  "border:1px solid var(--border);border-radius:14px;background:var(--surface);box-shadow:var(--shadow)";

export const PAINEL_GRANDE =
  "border:1px solid var(--border);border-radius:15px;background:var(--surface);box-shadow:var(--shadow);overflow:hidden";

/** Cabeçalho interno de painel: título em cima, explicação embaixo. */
export const CABECA_PAINEL = "padding:15px 18px;border-bottom:1px solid var(--border)";

/**
 * Listas e tabelas: a "borda" entre linhas é o fundo do contêiner aparecendo
 * pelo `gap` de 1px. Um truque do design que evita bordas dobradas.
 */
export const LISTA =
  "display:flex;flex-direction:column;gap:1px;background:var(--border);" +
  "border:1px solid var(--border);border-radius:12px";

export const CABECALHO_TABELA =
  "align-items:center;padding:11px 14px;background:var(--surface2);border-radius:11px 11px 0 0";

export function rotuloColuna(alinhamento?: "right" | "center"): string {
  return (
    `font:600 10.5px ${MONO};letter-spacing:.1em;color:var(--muted)` +
    (alinhamento ? `;text-align:${alinhamento}` : "")
  );
}

/** O selo arredondado — status, categoria, forma de pagamento. */
export function selo(bg: string, cor: string, tamanho: "sm" | "md" = "md"): string {
  const fonte = tamanho === "sm" ? "600 10.5px" : "600 11px";
  return (
    `display:inline-flex;align-items:center;padding:${tamanho === "sm" ? "2px 8px" : "3px 9px"};` +
    `border-radius:999px;background:${bg};color:${cor};font:${fonte} ${SANS};white-space:nowrap`
  );
}

export const SELO_NEUTRO = selo("var(--surface3)", "var(--text2)");
export const SELO_ACC = selo("var(--accent-soft)", "var(--accent)");
export const SELO_POS = selo("var(--pos-soft)", "var(--pos)");
export const SELO_WARN = selo("var(--warn-soft)", "var(--warn)");

/** Botão de ação primária — o verbo principal de cada tela. */
export function botaoPrimario(tamanho: "sm" | "md" | "lg" = "md"): string {
  const p =
    tamanho === "sm"
      ? "padding:11px 18px;border-radius:10px;font:700 13px"
      : tamanho === "lg"
        ? "padding:15px;border-radius:12px;font:700 14.5px"
        : "padding:12px 20px;border-radius:11px;font:700 14px";
  return `${p} ${SANS};background:var(--accent);color:var(--accent-ink);box-shadow:var(--shadow)`;
}

export function botaoSecundario(tamanho: "sm" | "md" = "md"): string {
  const p =
    tamanho === "sm"
      ? "padding:9px 14px;border-radius:9px;font:600 12px"
      : "padding:12px 18px;border-radius:11px;font:600 13px";
  return `${p} ${SANS};border:1px solid var(--border2);background:var(--surface);color:var(--text2)`;
}

/** O botão "⋯" que abre o menu de ações de uma linha. */
export const BOTAO_MENU =
  `width:30px;height:30px;border-radius:8px;color:var(--muted);font:700 14px/1 ${MONO}`;

export const ITEM_MENU =
  `display:block;width:100%;padding:10px 11px;border-radius:8px;text-align:left;font:500 13px ${SANS};color:var(--text2)`;

export function itemMenuDestaque(cor: string): string {
  return `display:block;width:100%;padding:10px 11px;border-radius:8px;text-align:left;font:600 13px ${SANS};color:${cor}`;
}

export const MENU_FLUTUANTE =
  "position:absolute;right:12px;top:44px;z-index:30;padding:6px;background:var(--surface);" +
  "border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-lg);animation:pop .14s ease";

/** Campo de texto do portal — a mesma borda, raio e altura em toda tela. */
export function campo(erro = false, forte = false): string {
  return (
    `width:100%;padding:13px 14px;border:1.5px solid ${erro ? "var(--danger)" : "var(--border2)"};` +
    `border-radius:11px;background:var(--surface2);font:${forte ? "600" : "500"} 13.5px ${SANS};` +
    "color:var(--text);outline:none"
  );
}

/** Versão compacta, usada nas barras de filtro. */
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

export const ROTULO_CAMPO = `display:block;margin-bottom:6px;font:600 11px ${SANS};color:var(--text2)`;

/** Pílula de filtro, dentro de um grupo com fundo próprio. */
export function pilula(ativo: boolean, tamanho: "sm" | "md" = "md"): string {
  const p = tamanho === "sm" ? "padding:7px 13px;border-radius:7px" : "padding:9px 14px;border-radius:9px";
  return (
    `${p};font:${ativo ? "700" : "500"} 12.5px ${SANS};` +
    (ativo
      ? "background:var(--surface);color:var(--accent);box-shadow:var(--shadow)"
      : "background:transparent;color:var(--muted)")
  );
}

export const GRUPO_PILULAS =
  "display:flex;gap:3px;padding:3px;border:1px solid var(--border);border-radius:11px;background:var(--surface2);flex-wrap:wrap";

/** O interruptor. `ligado` decide cor da trilha e para que lado a bolinha vai. */
export function trilha(ligado: boolean, largura = 38, altura = 22): string {
  return (
    `flex:none;width:${largura}px;height:${altura}px;border-radius:999px;` +
    `background:${ligado ? "var(--accent)" : "var(--border2)"};display:flex;align-items:center;` +
    `padding:2px;justify-content:${ligado ? "flex-end" : "flex-start"};transition:background .2s ease`
  );
}

/** Estado vazio: um título, uma explicação e — quando houver — o próximo passo. */
export const CAIXA_VAZIA =
  "display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;" +
  "padding:38px 20px;border:1px dashed var(--border2);border-radius:13px;background:var(--surface2)";

export const TITULO_TELA = `margin:0;font:700 22px/1.2 ${SANS};letter-spacing:-.015em`;
export const SUB_TELA = `margin:5px 0 0;font:400 13.5px/1.45 ${SANS};color:var(--muted)`;
export const TITULO_PAINEL = `margin:0;font:600 15px/1.2 ${SANS}`;

/** Números que se comparam ficam alinhados: tabular-nums em tudo que é dinheiro. */
export const NUM = "font-variant-numeric:tabular-nums";

export const ROTULO_KPI =
  `font:600 10.5px ${MONO};letter-spacing:.1em;text-transform:uppercase;color:var(--muted)`;

/** Grade de KPIs coladas por 1px de borda, como no design. */
export function faixaKpis(colunas: string): string {
  return (
    `display:grid;grid-template-columns:${colunas};gap:1px;background:var(--border);` +
    "border:1px solid var(--border);border-radius:14px;overflow:hidden"
  );
}

/** Colunas que se adaptam sem media query — o portal só tem dois tamanhos. */
export function colunas(mobile: boolean, desktop: string, celular = "1fr"): string {
  return mobile ? celular : desktop;
}
