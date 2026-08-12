/**
 * The brand's colors as VALUES, for the few places that cannot read a CSS
 * variable.
 *
 * `tokens.css` is where the brand lives — `--brand` and `--brand-ink` — and
 * every screen reaches for it from there. But Next's `metadata` and
 * `manifest.ts` are read by the browser and the OS before any stylesheet
 * exists: the theme color painted around an installed window, and the ink of
 * the login banner rendered into the document head. Those need a literal.
 *
 * This file exists so that literal is written ONCE instead of once per portal.
 * The two values are the same hexes as `--brand` / `--brand-ink`, and the same
 * ones the mobile app carries as `palette.brandPrimary` / `brandSecondary` and
 * paints into its splash and adaptive icon. Changing the brand means changing
 * `tokens.css`, this file, and the app's palette — three lines, and no fourth.
 */

export const BRAND = {
  /** The blue of the "A". The primary, in both themes. */
  primary: "#1b9abd",
  /** The near-black petrol the mark sits on: the icon's own ground. */
  ink: "#020e18",
} as const;
