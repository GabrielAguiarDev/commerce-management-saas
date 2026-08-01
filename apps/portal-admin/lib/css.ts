import type { CSSProperties } from "react";

/**
 * The console's look is carried by CSS declaration strings — the same form the
 * design uses, and the form its style helpers naturally produce by
 * concatenation. `css()` turns one into the object React wants.
 *
 * Results are cached: the same handful of strings are rebuilt on every render,
 * and parsing them once keeps that free.
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
    // Custom properties keep their literal name; everything else is camelCased.
    out[prop.startsWith("--") ? prop : kebabToCamel(prop)] = decl.slice(i + 1).trim();
  }

  const style = out as CSSProperties;
  cache.set(text, style);
  return style;
}

function kebabToCamel(prop: string): string {
  return prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** The monospace stack, wired to the font `layout.tsx` loads. */
export const MONO = "var(--font-plex-mono),monospace";
