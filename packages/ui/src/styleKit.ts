import { MONO, SANS } from "./css";

/**
 * The visual vocabulary shared by the portals. Every helper returns a CSS
 * declaration string to hand to `css()` — see `css.ts` for why the portals work
 * with strings.
 *
 * What lives here is what both portals draw the same way. What belongs to a
 * single product (a module card, a sales KPI strip, a nav item) stays in that
 * app's own `styleKit`.
 */

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

/** The bordered, shadowed card that carries almost the whole interface. */
export const PANEL =
  "border:1px solid var(--border);border-radius:14px;background:var(--surface);box-shadow:var(--shadow)";

/** The same, with a larger radius and clipping — for panels with their own header. */
export const PANEL_LARGE =
  "border:1px solid var(--border);border-radius:15px;background:var(--surface);" +
  "box-shadow:var(--shadow);overflow:hidden";

/** A panel's inner header: title on top, explanation underneath. */
export const PANEL_HEADER = "padding:15px 18px;border-bottom:1px solid var(--border)";

/**
 * Lists and tables: the "border" between rows is the container's background
 * showing through a 1px `gap`. A trick from the design that avoids doubled
 * borders.
 */
export const LIST =
  "display:flex;flex-direction:column;gap:1px;background:var(--border);" +
  "border:1px solid var(--border);border-radius:12px";

export const TABLE_HEADER =
  "align-items:center;padding:11px 14px;background:var(--surface2);border-radius:11px 11px 0 0";

export function columnLabel(align?: "right" | "center"): string {
  return (
    `font:600 10.5px ${MONO};letter-spacing:.1em;color:var(--muted)` +
    (align ? `;text-align:${align}` : "")
  );
}

/* -------------------------------------------------------------------------- */
/* Badges                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The five tones any state in the system takes. A new status picks a tone —
 * never a loose color — and that is what keeps the reading identical across the
 * portals: green always means "settled", red always means "needs action".
 */
export type Tone = "neutral" | "acc" | "pos" | "warn" | "danger";

const TONES: Record<Tone, { background: string; color: string; border: string }> = {
  neutral: { background: "var(--surface3)", color: "var(--muted)", border: "var(--border)" },
  acc: { background: "var(--accent-soft)", color: "var(--accent)", border: "var(--accent-line)" },
  pos: { background: "var(--pos-soft)", color: "var(--pos)", border: "var(--pos-line)" },
  warn: { background: "var(--warn-soft)", color: "var(--warn)", border: "var(--warn-line)" },
  danger: {
    background: "var(--danger-soft)",
    color: "var(--danger)",
    border: "var(--danger-line)",
  },
};

/**
 * The rounded badge — status, category, payment method.
 *
 * `bordered` exists because the two portals were born with different badges:
 * the admin panel drew them outlined, the customer portal did not. It is still
 * each screen's call, but the colors now always come from the same table.
 */
export function badge(
  tone: Tone,
  { size = "md", bordered = false }: { size?: "sm" | "md"; bordered?: boolean } = {},
): string {
  const t = TONES[tone];
  const weight = size === "sm" ? "600 10.5px" : "600 11px";
  const spacing = size === "sm" ? "2px 8px" : "3px 9px";
  return (
    `display:inline-flex;align-items:center;gap:5px;padding:${spacing};border-radius:999px;` +
    `background:${t.background};color:${t.color};font:${weight} ${SANS};white-space:nowrap;` +
    (bordered ? `border:1px solid ${t.border};` : "")
  );
}

/** A tone's color, for when only the text or only the dot needs it. */
export function toneColor(tone: Tone): string {
  return TONES[tone].color;
}

/** A tone's washed background and text — the base of a badge, icon or notice. */
export function toneBackground(tone: Tone, bordered = false): string {
  const t = TONES[tone];
  return (
    `background:${t.background};color:${t.color};` + (bordered ? `border:1px solid ${t.border};` : "")
  );
}

/**
 * The width at which the portals start drawing themselves as a phone: the
 * sidebar becomes a drawer and the modal becomes a sheet. A single number, so
 * the same screen is not "narrow" in one portal and "wide" in the other.
 */
export const MOBILE_BREAKPOINT = 900;

/** The status dot that precedes a note. */
export function dot(color: string): string {
  return `width:6px;height:6px;flex:none;border-radius:99px;background:${color}`;
}

/* -------------------------------------------------------------------------- */
/* Buttons                                                                     */
/* -------------------------------------------------------------------------- */

/** The primary action button — every screen's main verb. */
export function primaryButton(size: "sm" | "md" | "lg" = "md"): string {
  const p =
    size === "sm"
      ? "padding:11px 18px;border-radius:10px;font:700 13px"
      : size === "lg"
        ? "padding:15px;border-radius:12px;font:700 14.5px"
        : "padding:12px 20px;border-radius:11px;font:700 14px";
  return `${p} ${SANS};background:var(--accent);color:var(--accent-ink);box-shadow:var(--shadow)`;
}

export function secondaryButton(size: "sm" | "md" = "md"): string {
  const p =
    size === "sm"
      ? "padding:9px 14px;border-radius:9px;font:600 12px"
      : "padding:12px 18px;border-radius:11px;font:600 13px";
  return `${p} ${SANS};border:1px solid var(--border2);background:var(--surface);color:var(--text2)`;
}

/** The "⋯" button that opens a row's action menu. */
export const MENU_BUTTON = `width:30px;height:30px;border-radius:8px;color:var(--muted);font:700 14px/1 ${MONO}`;

/* -------------------------------------------------------------------------- */
/* Action menu                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The menu panel. No `position`/`top`/`left`: Floating UI does the positioning
 * inside `ActionsMenu`, and its style is applied on top of this one.
 */
export const MENU_PANEL =
  "z-index:70;background:var(--surface);border:1px solid var(--border);border-radius:12px;" +
  "box-shadow:var(--shadow-lg);padding:6px;display:flex;flex-direction:column;overflow-y:auto";

export const MENU_ITEM =
  `display:block;width:100%;padding:10px 11px;border-radius:8px;text-align:left;` +
  `font:500 13px ${SANS};color:var(--text2);white-space:nowrap`;

/** The colored variant — the destructive action, or the one that needs care. */
export function highlightedMenuItem(color: string): string {
  return (
    `display:block;width:100%;padding:10px 11px;border-radius:8px;text-align:left;` +
    `font:600 13px ${SANS};color:${color};white-space:nowrap`
  );
}

/* -------------------------------------------------------------------------- */
/* Fields                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The border, radius and height of the fields live in the `.field` class in
 * `tokens.css`, not here: that is what keeps input, select and textarea
 * identical, focus and disabled states included. These helpers cover only what
 * varies by size or by error.
 */

/** The taller form field used in the body of the modals. */
export function field(error = false, strong = false): string {
  return (
    `width:100%;padding:13px 14px;border:1.5px solid ${error ? "var(--danger)" : "var(--border2)"};` +
    `border-radius:11px;background:var(--surface2);font:${strong ? "600" : "500"} 13.5px ${SANS};` +
    "color:var(--text);outline:none"
  );
}

export const FIELD_LABEL = `display:block;margin-bottom:6px;font:600 11px ${SANS};color:var(--text2)`;

/* -------------------------------------------------------------------------- */
/* Filters                                                                     */
/* -------------------------------------------------------------------------- */

/** A filter pill, inside a group with a background of its own. */
export function pill(active: boolean, size: "sm" | "md" = "md"): string {
  const p =
    size === "sm" ? "padding:7px 13px;border-radius:7px" : "padding:9px 14px;border-radius:9px";
  return (
    `${p};font:${active ? "700" : "500"} 12.5px ${SANS};` +
    (active
      ? "background:var(--surface);color:var(--accent);box-shadow:var(--shadow)"
      : "background:transparent;color:var(--muted)")
  );
}

export const PILL_GROUP =
  "display:flex;gap:3px;padding:3px;border:1px solid var(--border);border-radius:11px;" +
  "background:var(--surface2);flex-wrap:wrap";

/** A loose pill, with no group — the filter bar of the long lists. */
export function chip(active: boolean, size: "sm" | "md" = "sm"): string {
  const base =
    size === "sm"
      ? "font-size:11.5px;font-weight:500;padding:6px 11px;"
      : "font-size:12px;font-weight:500;padding:7px 12px;";
  return (
    base +
    "border-radius:99px;" +
    (active
      ? "border:1px solid var(--accent-line);background:var(--accent-soft);color:var(--accent);"
      : "border:1px solid var(--border);background:var(--surface);color:var(--muted);")
  );
}

/* -------------------------------------------------------------------------- */
/* Switch                                                                      */
/* -------------------------------------------------------------------------- */

/** The track. `on` decides the color and which way the knob sits. */
export function track(on: boolean, width = 38, height = 22): string {
  return (
    `flex:none;width:${width}px;height:${height}px;border-radius:999px;` +
    `background:${on ? "var(--accent)" : "var(--border2)"};display:flex;align-items:center;` +
    `padding:2px;justify-content:${on ? "flex-end" : "flex-start"};transition:background .2s ease`
  );
}

/* -------------------------------------------------------------------------- */
/* Typography and states                                                       */
/* -------------------------------------------------------------------------- */

export const SCREEN_TITLE = `margin:0;font:700 22px/1.2 ${SANS};letter-spacing:-.015em`;
export const SCREEN_SUBTITLE = `margin:5px 0 0;font:400 13.5px/1.45 ${SANS};color:var(--muted)`;
export const PANEL_TITLE = `margin:0;font:600 15px/1.2 ${SANS}`;

/** Numbers that get compared stay aligned: tabular-nums on everything monetary. */
export const NUM = "font-variant-numeric:tabular-nums";

export const KPI_LABEL =
  `font:600 10.5px ${MONO};letter-spacing:.1em;text-transform:uppercase;color:var(--muted)`;

/** Empty state: a title, an explanation and — when there is one — the next step. */
export const EMPTY_BOX =
  "display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;" +
  "padding:38px 20px;border:1px dashed var(--border2);border-radius:13px;background:var(--surface2)";

/** A grid of indicators glued by 1px of border, as in the design. */
export function kpiStrip(columns: string): string {
  return (
    `display:grid;grid-template-columns:${columns};gap:1px;background:var(--border);` +
    "border:1px solid var(--border);border-radius:14px;overflow:hidden"
  );
}

/** Up to two initials, ignoring punctuation and digits. */
export function initials(name: string): string {
  return name
    .replace(/[^A-Za-zÀ-ú ]/g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}
