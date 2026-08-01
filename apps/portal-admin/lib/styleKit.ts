import { MONO } from "@/lib/css";
import type { Idioma, Plano, Prioridade, StatusChamado, StatusCliente } from "@/types/types";

/**
 * Shared visual vocabulary. Every helper returns a CSS declaration string to be
 * handed to `css()` — see `css.ts` for why the console works in strings.
 */

export function badge(bg: string, cor: string, borda: string): string {
  return (
    "display:inline-flex;align-items:center;gap:5px;justify-self:start;font-size:11.5px;" +
    "font-weight:600;padding:4px 9px;border-radius:99px;background:" +
    bg +
    ";color:" +
    cor +
    ";border:1px solid " +
    borda +
    ";white-space:nowrap"
  );
}

export const badgeOk = () => badge("var(--okBg)", "var(--ok)", "var(--okLine)");
export const badgeAcc = () => badge("var(--accSoft)", "var(--acc)", "var(--accLine)");
export const badgeWarn = () => badge("var(--warnBg)", "var(--warn)", "var(--warnLine)");
export const badgeBad = () => badge("var(--badBg)", "var(--bad)", "var(--badLine)");
export const badgeNeutro = () => badge("var(--neu)", "var(--neuTx)", "var(--neuLine)");

export function planoBadge(plano: string): string {
  if (plano === "Pago") return badgeOk();
  if (plano === "Customizado") return badgeAcc();
  return badgeNeutro();
}

export function statusBadge(status: StatusCliente): string {
  return status === "ativo" ? badgeAcc() : badgeBad();
}

export function badgeChamado(status: StatusChamado): string {
  if (status === "aberto") return badgeBad();
  if (status === "andamento") return badgeWarn();
  return badgeOk();
}

export function prioridadeBadge(p: Prioridade): string {
  if (p === "alta") return badgeBad();
  if (p === "media") return badgeWarn();
  return badgeNeutro();
}

export function avatar(plano: string): string {
  return (
    "width:34px;height:34px;flex:none;border-radius:9px;display:flex;align-items:center;" +
    "justify-content:center;font-size:11.5px;font-weight:600;" +
    (plano === "Gratuito"
      ? "background:var(--neu);color:var(--neuTx);"
      : "background:var(--accSoft);color:var(--acc);")
  );
}

export function navStyle(ativo: boolean, colapsada: boolean): string {
  return (
    "display:flex;align-items:center;gap:11px;width:100%;text-align:left;border:none;" +
    "cursor:pointer;font-size:13.5px;font-weight:500;padding:10px 11px;border-radius:9px;" +
    "font-family:inherit;transition:background .12s,color .12s;" +
    (colapsada ? "justify-content:center;" : "") +
    (ativo
      ? "background:var(--sideCard);color:#fff;box-shadow:inset 2px 0 0 var(--accHi);"
      : "background:none;color:var(--sideTx);")
  );
}

export function iconeMod(ligado: boolean): string {
  return (
    "width:32px;height:32px;flex:none;border-radius:8px;display:flex;align-items:center;" +
    `justify-content:center;font-family:${MONO};font-size:11px;font-weight:600;` +
    (ligado
      ? "background:var(--acc);color:var(--accTx);"
      : "background:var(--neu);color:var(--tx3);")
  );
}

export const CARD_METRICA =
  "background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:17px 18px;" +
  "display:flex;flex-direction:column;gap:12px;min-height:132px;";

export function ponto(cor: string): string {
  return "width:6px;height:6px;flex:none;border-radius:99px;background:" + cor;
}

/** Filter pill used by the support and finance toolbars. */
export function chip(ativo: boolean, tamanho: "sm" | "md" = "sm"): string {
  const base =
    tamanho === "sm"
      ? "font-size:11.5px;font-weight:500;padding:6px 11px;"
      : "font-size:12px;font-weight:500;padding:7px 12px;";
  return (
    base +
    "border-radius:99px;cursor:pointer;" +
    (ativo
      ? "border:1px solid var(--accLine);background:var(--accSoft);color:var(--acc);"
      : "border:1px solid var(--line);background:var(--panel);color:var(--tx3);")
  );
}

/** Up to two initials, ignoring punctuation and digits. */
export function iniciais(nome: string): string {
  return nome
    .replace(/[^A-Za-zÀ-ú ]/g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/** Sortable timestamp from a `dd/mm/yyyy` string. */
export function ts(data: string): number {
  const p = data.split("/");
  return new Date(+p[2], +p[1] - 1, +p[0]).getTime();
}

/** Localised plan name, falling back to the raw key for unknown plans. */
export function nomePlano(planos: Plano[], k: string, id: Idioma): string {
  const def = planos.find((x) => x.k === k);
  return def ? def.nome[id] || def.nome.pt : k;
}
