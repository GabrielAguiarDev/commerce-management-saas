import type { CSSProperties } from "react";

/**
 * The portals dress themselves with CSS declaration strings — the same shape
 * the design uses, and the one its style helpers produce naturally by
 * concatenation. `css()` turns one of those into the object React wants.
 *
 * The result is cached: the same handful of strings is rebuilt on every render,
 * and parsing them once makes that free.
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

/**
 * The font stacks.
 *
 * They point at `--sans-stack` / `--mono-stack`, assembled in `tokens.css` from
 * the variables each app loads in its `layout.tsx` under the standard names
 * (`--font-sans` and `--font-mono`). That is why the library never needs to
 * know which portal is using it.
 */
export const SANS = "var(--sans-stack)";
export const MONO = "var(--mono-stack)";

/** The design's `font:` shorthand, already pointing at the right stack. */
export function font(weight: number, size: string, mono = false): string {
  return `${weight} ${size} ${mono ? MONO : SANS}`;
}
