import { MONO, SANS } from "./css";

/**
 * Vocabulário visual compartilhado pelos portais. Cada auxiliar devolve uma
 * string de declaração CSS para entregar a `css()` — ver `css.ts` para o porquê
 * de os portais trabalharem com strings.
 *
 * O que está aqui é o que os dois portais desenham igual. O que é próprio de um
 * produto (cartão de módulo, faixa de KPI de venda, item de navegação) fica no
 * `styleKit` do app.
 */

/* -------------------------------------------------------------------------- */
/* Superfícies                                                                 */
/* -------------------------------------------------------------------------- */

/** O cartão com borda e sombra que sustenta quase toda a interface. */
export const PAINEL =
  "border:1px solid var(--border);border-radius:14px;background:var(--surface);box-shadow:var(--shadow)";

/** Igual, mas com o raio maior e recorte — para painéis com cabeçalho próprio. */
export const PAINEL_GRANDE =
  "border:1px solid var(--border);border-radius:15px;background:var(--surface);" +
  "box-shadow:var(--shadow);overflow:hidden";

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

/* -------------------------------------------------------------------------- */
/* Selos                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Os cinco tons que qualquer estado do sistema assume. Um status novo escolhe
 * um tom — nunca uma cor solta —, e é isso que mantém a leitura igual entre os
 * portais: verde é sempre "resolvido", vermelho é sempre "exige ação".
 */
export type Tom = "neutro" | "acc" | "pos" | "warn" | "danger";

const TONS: Record<Tom, { fundo: string; cor: string; borda: string }> = {
  neutro: { fundo: "var(--surface3)", cor: "var(--muted)", borda: "var(--border)" },
  acc: { fundo: "var(--accent-soft)", cor: "var(--accent)", borda: "var(--accent-line)" },
  pos: { fundo: "var(--pos-soft)", cor: "var(--pos)", borda: "var(--pos-line)" },
  warn: { fundo: "var(--warn-soft)", cor: "var(--warn)", borda: "var(--warn-line)" },
  danger: { fundo: "var(--danger-soft)", cor: "var(--danger)", borda: "var(--danger-line)" },
};

/**
 * O selo arredondado — status, categoria, forma de pagamento.
 *
 * `borda` existe porque os dois portais nasceram com selos diferentes: o painel
 * os desenhava com contorno, o portal do cliente sem. Continua sendo uma
 * escolha de cada tela, mas agora as cores saem sempre da mesma tabela.
 */
export function selo(
  tom: Tom,
  { tamanho = "md", borda = false }: { tamanho?: "sm" | "md"; borda?: boolean } = {},
): string {
  const t = TONS[tom];
  const peso = tamanho === "sm" ? "600 10.5px" : "600 11px";
  const espaco = tamanho === "sm" ? "2px 8px" : "3px 9px";
  return (
    `display:inline-flex;align-items:center;gap:5px;padding:${espaco};border-radius:999px;` +
    `background:${t.fundo};color:${t.cor};font:${peso} ${SANS};white-space:nowrap;` +
    (borda ? `border:1px solid ${t.borda};` : "")
  );
}

/** A cor de um tom, para quando só o texto ou só o ponto precisa dela. */
export function corDoTom(tom: Tom): string {
  return TONS[tom].cor;
}

/** Fundo lavado e texto de um tom — a base de um selo, ícone ou aviso. */
export function fundoDoTom(tom: Tom, borda = false): string {
  const t = TONS[tom];
  return `background:${t.fundo};color:${t.cor};` + (borda ? `border:1px solid ${t.borda};` : "");
}

/**
 * A largura em que os portais passam a se desenhar como celular: a barra
 * lateral vira gaveta e o modal vira folha. Um número só, para que a mesma
 * tela não seja "estreita" num portal e "larga" no outro.
 */
export const QUEBRA_MOBILE = 900;

/** O ponto de status que antecede uma nota. */
export function ponto(cor: string): string {
  return `width:6px;height:6px;flex:none;border-radius:99px;background:${cor}`;
}

/* -------------------------------------------------------------------------- */
/* Botões                                                                      */
/* -------------------------------------------------------------------------- */

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
export const BOTAO_MENU = `width:30px;height:30px;border-radius:8px;color:var(--muted);font:700 14px/1 ${MONO}`;

/* -------------------------------------------------------------------------- */
/* Menu de ações                                                               */
/* -------------------------------------------------------------------------- */

/**
 * O painel do menu. Sem `position`/`top`/`left`: quem posiciona é o Floating UI
 * dentro de `MenuAcoes`, e o estilo dele é aplicado por cima deste.
 */
export const PAINEL_MENU =
  "z-index:70;background:var(--surface);border:1px solid var(--border);border-radius:12px;" +
  "box-shadow:var(--shadow-lg);padding:6px;display:flex;flex-direction:column;overflow-y:auto";

export const ITEM_MENU =
  `display:block;width:100%;padding:10px 11px;border-radius:8px;text-align:left;` +
  `font:500 13px ${SANS};color:var(--text2);white-space:nowrap`;

/** A variante colorida — a ação destrutiva, ou a que exige atenção. */
export function itemMenuDestaque(cor: string): string {
  return (
    `display:block;width:100%;padding:10px 11px;border-radius:8px;text-align:left;` +
    `font:600 13px ${SANS};color:${cor};white-space:nowrap`
  );
}

/* -------------------------------------------------------------------------- */
/* Campos                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A borda, o raio e a altura dos campos vivem na classe `.campo` do
 * `tokens.css`, e não aqui: é o que garante que input, select e textarea fiquem
 * idênticos, inclusive nos estados de foco e desabilitado. Estes auxiliares
 * cobrem só o que é variação de tamanho ou de erro.
 */

/** Campo de formulário mais alto, do corpo dos modais. */
export function campo(erro = false, forte = false): string {
  return (
    `width:100%;padding:13px 14px;border:1.5px solid ${erro ? "var(--danger)" : "var(--border2)"};` +
    `border-radius:11px;background:var(--surface2);font:${forte ? "600" : "500"} 13.5px ${SANS};` +
    "color:var(--text);outline:none"
  );
}

export const ROTULO_CAMPO = `display:block;margin-bottom:6px;font:600 11px ${SANS};color:var(--text2)`;

/* -------------------------------------------------------------------------- */
/* Filtros                                                                     */
/* -------------------------------------------------------------------------- */

/** Pílula de filtro, dentro de um grupo com fundo próprio. */
export function pilula(ativo: boolean, tamanho: "sm" | "md" = "md"): string {
  const p =
    tamanho === "sm" ? "padding:7px 13px;border-radius:7px" : "padding:9px 14px;border-radius:9px";
  return (
    `${p};font:${ativo ? "700" : "500"} 12.5px ${SANS};` +
    (ativo
      ? "background:var(--surface);color:var(--accent);box-shadow:var(--shadow)"
      : "background:transparent;color:var(--muted)")
  );
}

export const GRUPO_PILULAS =
  "display:flex;gap:3px;padding:3px;border:1px solid var(--border);border-radius:11px;" +
  "background:var(--surface2);flex-wrap:wrap";

/** Pílula solta, sem grupo — a barra de filtros das listas longas. */
export function chip(ativo: boolean, tamanho: "sm" | "md" = "sm"): string {
  const base =
    tamanho === "sm"
      ? "font-size:11.5px;font-weight:500;padding:6px 11px;"
      : "font-size:12px;font-weight:500;padding:7px 12px;";
  return (
    base +
    "border-radius:99px;" +
    (ativo
      ? "border:1px solid var(--accent-line);background:var(--accent-soft);color:var(--accent);"
      : "border:1px solid var(--border);background:var(--surface);color:var(--muted);")
  );
}

/* -------------------------------------------------------------------------- */
/* Interruptor                                                                 */
/* -------------------------------------------------------------------------- */

/** A trilha. `ligado` decide a cor e para que lado a bolinha vai. */
export function trilha(ligado: boolean, largura = 38, altura = 22): string {
  return (
    `flex:none;width:${largura}px;height:${altura}px;border-radius:999px;` +
    `background:${ligado ? "var(--accent)" : "var(--border2)"};display:flex;align-items:center;` +
    `padding:2px;justify-content:${ligado ? "flex-end" : "flex-start"};transition:background .2s ease`
  );
}

/* -------------------------------------------------------------------------- */
/* Tipografia e estados                                                        */
/* -------------------------------------------------------------------------- */

export const TITULO_TELA = `margin:0;font:700 22px/1.2 ${SANS};letter-spacing:-.015em`;
export const SUB_TELA = `margin:5px 0 0;font:400 13.5px/1.45 ${SANS};color:var(--muted)`;
export const TITULO_PAINEL = `margin:0;font:600 15px/1.2 ${SANS}`;

/** Números que se comparam ficam alinhados: tabular-nums em tudo que é dinheiro. */
export const NUM = "font-variant-numeric:tabular-nums";

export const ROTULO_KPI =
  `font:600 10.5px ${MONO};letter-spacing:.1em;text-transform:uppercase;color:var(--muted)`;

/** Estado vazio: um título, uma explicação e — quando houver — o próximo passo. */
export const CAIXA_VAZIA =
  "display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;" +
  "padding:38px 20px;border:1px dashed var(--border2);border-radius:13px;background:var(--surface2)";

/** Grade de indicadores colados por 1px de borda, como no design. */
export function faixaKpis(colunas: string): string {
  return (
    `display:grid;grid-template-columns:${colunas};gap:1px;background:var(--border);` +
    "border:1px solid var(--border);border-radius:14px;overflow:hidden"
  );
}

/** Até duas iniciais, ignorando pontuação e dígitos. */
export function iniciais(nome: string): string {
  return nome
    .replace(/[^A-Za-zÀ-ú ]/g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}
