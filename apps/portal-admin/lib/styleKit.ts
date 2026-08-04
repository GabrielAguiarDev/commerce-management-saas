import { MONO, selo, type Tom } from "@aguiar/ui";
import type { Idioma, Plano, Prioridade, StatusChamado, StatusCliente } from "@/types/types";

/**
 * O vocabulário visual que é só do painel.
 *
 * O selo, o botão, a pílula e o campo vêm de `@aguiar/ui` — são os mesmos do
 * portal do cliente. O que fica aqui é o que traduz um conceito de negócio do
 * painel numa escolha visual: qual tom um plano recebe, qual cor um chamado
 * urgente ganha, como um módulo desligado aparece.
 */

/** O selo do painel sempre tem contorno; é o que o distingue nas tabelas densas. */
export const seloPainel = (tom: Tom) => selo(tom, { borda: true });

/**
 * Tom do selo do plano, derivado do PLANO e não da sua chave.
 *
 * Antes era `k === "paid"` / `k === "custom"`, o que deixava qualquer plano
 * criado na tela de Planos sem identidade visual. Agora: sob medida usa o
 * destaque, plano sem cobrança fica neutro, e plano pago usa o verde.
 */
export function planoBadge(plano: Plano | undefined): string {
  if (!plano) return seloPainel("neutro");
  if (plano.tipo === "custom") return seloPainel("acc");
  return plano.preco && /[1-9]/.test(plano.preco) ? seloPainel("pos") : seloPainel("neutro");
}

export function statusBadge(status: StatusCliente): string {
  return seloPainel(status === "ativo" ? "acc" : "danger");
}

export function badgeChamado(status: StatusChamado): string {
  if (status === "aberto") return seloPainel("danger");
  if (status === "andamento") return seloPainel("warn");
  return seloPainel("pos");
}

export function prioridadeBadge(p: Prioridade): string {
  if (p === "alta") return seloPainel("danger");
  if (p === "media") return seloPainel("warn");
  return seloPainel("neutro");
}

/** Mesma lógica do selo: quem não é cobrado fica neutro, o resto em destaque. */
export function avatar(plano: Plano | undefined): string {
  const cobrado = !plano || plano.tipo === "custom" || !!plano.preco?.match(/[1-9]/);
  return (
    "width:34px;height:34px;flex:none;border-radius:9px;display:flex;align-items:center;" +
    "justify-content:center;font-size:11.5px;font-weight:600;" +
    (cobrado
      ? "background:var(--accent-soft);color:var(--accent);"
      : "background:var(--surface3);color:var(--muted);")
  );
}

/** Item da barra lateral escura — exclusiva do painel. */
export function navStyle(ativo: boolean, colapsada: boolean): string {
  return (
    "display:flex;align-items:center;gap:11px;width:100%;text-align:left;border:none;" +
    "cursor:pointer;font-size:13.5px;font-weight:500;padding:10px 11px;border-radius:9px;" +
    "font-family:inherit;transition:background .12s,color .12s;" +
    (colapsada ? "justify-content:center;" : "") +
    (ativo
      ? "background:var(--side-card);color:#fff;box-shadow:inset 2px 0 0 var(--accent-hi);"
      : "background:none;color:var(--side-text);")
  );
}

/** O quadradinho com a sigla do módulo, aceso ou apagado. */
export function iconeMod(ligado: boolean): string {
  return (
    "width:32px;height:32px;flex:none;border-radius:8px;display:flex;align-items:center;" +
    `justify-content:center;font-family:${MONO};font-size:11px;font-weight:600;` +
    (ligado
      ? "background:var(--accent);color:var(--accent-ink);"
      : "background:var(--surface3);color:var(--muted);")
  );
}

export const CARD_METRICA =
  "background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:17px 18px;" +
  "display:flex;flex-direction:column;gap:12px;min-height:132px;";

/** Timestamp ordenável a partir de uma data `dd/mm/aaaa`. */
export function ts(data: string): number {
  const p = data.split("/");
  return new Date(+p[2], +p[1] - 1, +p[0]).getTime();
}

/** Nome do plano no idioma atual, caindo na chave crua para planos desconhecidos. */
export function nomePlano(planos: Plano[], k: string, id: Idioma): string {
  const def = planos.find((x) => x.k === k);
  return def ? def.nome[id] || def.nome.pt : k;
}
