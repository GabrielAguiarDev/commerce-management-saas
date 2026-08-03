import type { ItemVenda, Venda } from "@/types/types";

/**
 * Dinheiro, datas e siglas.
 *
 * Valores circulam como número (reais, com centavos) e só viram texto na hora
 * de mostrar — o contrário do portal-admin, que guarda "R$ 89,00" e converte
 * para calcular. Aqui há soma, média e diferença de caixa em todo lugar, e o
 * número cru é o que evita erro de arredondamento acumulado.
 */

export function brl(n: number): string {
  const p = (Math.round(n * 100) / 100).toFixed(2).split(".");
  return "R$ " + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + p[1];
}

/** "R$ 1.284" — para eixos de gráfico, onde os centavos só poluem. */
export function brlCurto(n: number): string {
  return "R$ " + Math.round(n).toLocaleString("pt-BR");
}

/** Lê o que a pessoa digitou num campo de dinheiro ("1.284,50" → 1284.5). */
export function numBR(v: string | number | null | undefined): number {
  const n = parseFloat(
    String(v == null ? "" : v)
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  );
  return isNaN(n) ? 0 : n;
}

/** Diferença de conferência: o sinal é o recado, então vem antes do valor. */
export function brlDif(n: number): string {
  if (Math.abs(n) < 0.005) return brl(0);
  return (n > 0 ? "+ " : "− ") + brl(Math.abs(n));
}

export interface EstiloDif {
  cor: string;
  bg: string;
  rotulo: string;
}

/**
 * Sobra é aviso, não erro: dinheiro a mais na gaveta costuma ser troco não
 * lançado. Falta é o que pede atenção de verdade, e por isso vai em vermelho.
 */
export function corDif(n: number): EstiloDif {
  if (Math.abs(n) < 0.005) {
    return { cor: "var(--pos)", bg: "var(--pos-soft)", rotulo: "Bateu" };
  }
  if (n > 0) return { cor: "var(--warn)", bg: "var(--warn-soft)", rotulo: "Sobra" };
  return { cor: "var(--danger)", bg: "var(--warn-soft)", rotulo: "Falta" };
}

export function totalV(v: Venda): number {
  return v.itens.reduce((a, i) => a + i.qtd * i.preco, 0);
}

export function qtdV(v: Venda): number {
  return v.itens.reduce((a, i) => a + i.qtd, 0);
}

export function resumoItens(itens: ItemVenda[]): string {
  return itens.map((i) => (i.qtd > 1 ? `${i.qtd}× ${i.nome}` : i.nome)).join(", ");
}

/* -------------------------------------------------------------------------- */
/* Datas                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * O histórico é semeado em "dias atrás" (`d`), não em datas absolutas, então
 * tudo o que a tela mostra sai de uma subtração sobre o relógio de agora.
 *
 * CUIDADO COM A HIDRATAÇÃO: estas funções leem o relógio e dão respostas
 * diferentes no servidor e no navegador se cruzarem a virada do dia. Só use
 * dentro de Client Components — que é o caso de todas as telas deste portal.
 */
export function diaDe(d: number): Date {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() - d);
  return base;
}

export function ddmm(d: number): string {
  const x = diaDe(d);
  return (
    String(x.getDate()).padStart(2, "0") + "/" + String(x.getMonth() + 1).padStart(2, "0")
  );
}

/** "Hoje · 14:32", "Ontem · 09:10", "23/07 · 16:40". */
export function rotuloData(d: number, hora: string): string {
  const quando = d === 0 ? "Hoje" : d === 1 ? "Ontem" : ddmm(d);
  return hora ? `${quando} · ${hora}` : quando;
}

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Rótulo curto do eixo dos gráficos — "Hoje" ganha do nome do dia. */
export function diaSemana(d: number): string {
  return d === 0 ? "Hoje" : DIAS[diaDe(d).getDay()];
}

/** "sábado, 2 de agosto" — o carimbo do topo. */
export function dataPorExtenso(): string {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function agoraHora(): string {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

/** Bom dia / boa tarde / boa noite, pelo relógio de quem está olhando. */
export function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/** Até duas iniciais, ignorando pontuação e números. */
export function siglaDe(nome: string): string {
  const p = String(nome || "")
    .split(/\s+/)
    .filter((t) => /^[\p{L}]/u.test(t));
  if (!p.length) return "";
  return ((p[0][0] || "") + ((p[1] || "")[0] || "")).toUpperCase();
}
