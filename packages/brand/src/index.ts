/**
 * THE BRAND, WRITTEN DOWN ONCE.
 *
 * Every product of the Aguiar One — the two portals, the site, the mobile app —
 * reads its identity colors from this file and from nowhere else. Changing the
 * brand is changing a value HERE and running `pnpm brand:sync`.
 *
 * ┌─ WHY THIS IS TYPESCRIPT AND NOT CSS ────────────────────────────────────┐
 * │ It is the only format every consumer can read. The portals need CSS      │
 * │ custom properties, Next's `metadata` and `manifest.ts` need a string     │
 * │ literal, the mobile app needs a restyle palette, and Expo's `app.json`   │
 * │ needs JSON. CSS is read by one of those four; TypeScript is read by      │
 * │ three, and the fourth is generated from it.                             │
 * │                                                                          │
 * │ `packages/ui/src/brand.css` and the three `backgroundColor` fields of    │
 * │ `apps/mobile/app.json` are GENERATED from this file — do not hand-edit   │
 * │ them. See `scripts/sync-brand.mjs`.                                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ WHAT BELONGS HERE, AND WHAT DOES NOT ──────────────────────────────────┐
 * │ IN: the IDENTITY. The brand's hue in each luminosity a surface needs it  │
 * │ in, the petrol it sits on, and the three state hues — because "green is  │
 * │ money, red demands action" is a rule of the brand and not a detail of    │
 * │ one screen. All of it is already identical, value for value, in more     │
 * │ than one product.                                                        │
 * │                                                                          │
 * │ OUT: surfaces, borders, and greys. They HAPPEN to agree between the      │
 * │ portals and the app today, but they are each product's own decision      │
 * │ about its own ground — the site deliberately has lighter ones, because   │
 * │ it is a showcase and not a tool. Pulling them in here would turn this    │
 * │ into a theme, and the site could no longer consume it. Whoever owns a    │
 * │ surface owns its color.                                                  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * This package has ZERO dependencies and imports nothing — that is what lets
 * the Expo app consume it through Metro without dragging React DOM in.
 */

export const BRAND = {
  /* ── The mark ──────────────────────────────────────────────────────────── */

  /**
   * The blue of the "A", read off the logo file. Hue 193°.
   *
   * This is THE primary. Everything accent-colored anywhere in the products is
   * this hue and nothing else — the four values below are it at other
   * luminosities, never at another hue.
   *
   * What must never happen again: a tone drifting toward teal (`#2fb3ba`, hue
   * 183°), which leaves the brand and lands next door to `pos`, so that
   * "primary" and "profit" read as one color at a glance. Blue is the brand;
   * green is money. They are never the same family.
   */
  primary: "#1b9abd",

  /**
   * The near-black petrol the mark sits on: the icon file's own ground.
   *
   * It is also the console's side rail, the mobile splash, the site's footer
   * and the color the OS paints around an installed portal window. Those four
   * meet without a seam precisely because they are this one value.
   */
  ink: "#020e18",

  /**
   * The brand OPENED, for dark grounds. 7.1:1 on the portals' dark surface,
   * against 5.2:1 for the flat primary. Same 193°.
   */
  lifted: "#35b5da",

  /**
   * The brand CLOSED, for being READ on light. 5.3:1 on white and 4.7:1 on the
   * portals' light background, where the flat primary gives 3.3:1 — enough for
   * a filled button or a border, not for a word.
   *
   * The rule every product follows: filled or drawn → `primary`; written →
   * this.
   */
  text: "#0e7590",

  /**
   * The vivid end of the ramp: the top of the "A"'s own gradient, the accent
   * over dark grounds, the blue that survives on petrol.
   */
  hi: "#4cc4e6",

  /**
   * One step above the flat primary: the light theme's hover and the top of
   * the mobile "Entrar" gradient, which ends at `primary`.
   */
  bright: "#38b7de",

  /** The brand washed over white at 12% — badge, chip, avatar, icon tile. */
  soft: "#e4f3f7",

  /**
   * The mid petrol: the section title on the site, the dark icon tile, the
   * highlighted plan card. Lighter than `ink`, which is a ground and not a
   * tone.
   */
  petrol: "#123c4a",

  /* ── States ────────────────────────────────────────────────────────────── */
  /* Identity, not decoration: money going the right way has to be the same
     green in the ad and in the dashboard that ad opens. Each hue comes in the
     luminosity for a light ground and, where a product has a dark theme, in
     the one for a dark ground. The `*Soft` values are the washed backgrounds
     the badges sit on, light theme only — a dark theme mixes its own against
     its own surface. */

  pos: "#17795e",
  posSoft: "#e2f2ec",
  /** Pushed a touch greener (153°) so it never neighbors the accent's 193°. */
  posDark: "#3fc98c",

  warn: "#a9700f",
  warnSoft: "#fbf0dc",
  warnDark: "#e0a950",

  danger: "#c4453c",
  dangerSoft: "#fbe9e7",
  dangerDark: "#e3736a",
} as const;

export type BrandColor = keyof typeof BRAND;
