/**
 * Normalizes for comparison: lowercase, accent-stripped, trimmed.
 *
 * The app's search needs to find "acaraje" when the product is "Acarajé".
 * Without this, half of a Brazilian catalog becomes unreachable from the
 * keyboard.
 */
export function normalize(input: string): string {
  return String(input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** `true` when `needle` is empty (neutral search) or occurs in `haystack`. */
export function contains(haystack: string, needle: string): boolean {
  const n = normalize(needle);
  if (!n) return true;
  return normalize(haystack).includes(n);
}

/**
 * Initials for the avatar. One letter for a simple name, two for a compound
 * one. The prototype only shows "M"/"R", but compound names show up in the
 * team list — the same function serves both places.
 */
export function initials(name: string, max = 1): string {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, max)
    .map((p) => (p[0] ?? '').toUpperCase())
    .join('');
}

