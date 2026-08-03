import type { CSSProperties } from "react";

/**
 * O portal veste-se com strings de declaração CSS — a mesma forma que o design
 * usa, e a que os seus auxiliares de estilo produzem naturalmente por
 * concatenação. `css()` transforma uma delas no objeto que o React quer.
 *
 * O resultado fica em cache: o mesmo punhado de strings é reconstruído a cada
 * render, e analisá-las uma única vez torna isso de graça.
 */
const cache = new Map<string, CSSProperties>();

export function css(text: string): CSSProperties {
  const hit = cache.get(text);
  if (hit) return hit;

  const out: Record<string, string> = {};
  for (const decl of text.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    if (!prop) continue;
    // Propriedades customizadas mantêm o nome literal; o resto vira camelCase.
    out[prop.startsWith("--") ? prop : kebabToCamel(prop)] = decl.slice(i + 1).trim();
  }

  const style = out as CSSProperties;
  cache.set(text, style);
  return style;
}

function kebabToCamel(prop: string): string {
  return prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** As pilhas de fonte, ligadas ao que `layout.tsx` carrega. */
export const SANS = "var(--font-public-sans),'Public Sans',sans-serif";
export const MONO = "var(--font-plex-mono),'IBM Plex Mono',monospace";

/** `font:` do design, já apontando para a fonte certa. */
export function fonte(peso: number, tamanho: string, mono = false): string {
  return `${peso} ${tamanho} ${mono ? MONO : SANS}`;
}
