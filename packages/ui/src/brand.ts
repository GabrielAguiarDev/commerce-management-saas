/**
 * The brand's colors as VALUES, for the few places that cannot read a CSS
 * variable.
 *
 * The brand itself lives in `@aguiar/brand` — one file, for every product —
 * and this module only puts it on the portals' doorstep, so that a screen can
 * write `import { BRAND } from "@aguiar/ui"` alongside everything else it takes
 * from the library.
 *
 * WHEN TO REACH FOR THIS INSTEAD OF A TOKEN: almost never. `brand.css` gives
 * the same values as `--brand`, `--brand-ink` and the rest, and CSS is where
 * color belongs. The exceptions are the places the browser and the OS read
 * BEFORE any stylesheet exists — Next's `metadata` and `manifest.ts`: the theme
 * color painted around an installed window, and the ink of the login banner
 * rendered into the document head. Those need a literal.
 */

export { BRAND, type BrandColor } from "@aguiar/brand";
