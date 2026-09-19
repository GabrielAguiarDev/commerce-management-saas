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
   * The steel blue of the "AO" mark, read off the logo file
   * (`docs/design/logo-aguiar-one/`). Hue 201°.
   *
   * This is THE primary. Everything accent-colored anywhere in the products is
   * this hue and nothing else — the four values below are it at other
   * luminosities, never at another hue.
   *
   * What must never happen again: a tone drifting toward teal (`#2fb3ba`, hue
   * 183°) — or back to the cyan of the retired "A" mark (`#1b9abd`, 193°) —,
   * which leaves the brand and lands next door to `pos`, so that
   * "primary" and "profit" read as one color at a glance. Blue is the brand;
   * green is money. They are never the same family.
   */
  primary: "#387a9f",

  /**
   * The near-black petrol the mark sits on in the dark: the PWA tile, the
   * splash. Hue 207°, the same family as the mark's 201°.
   *
   * It is also the console's side rail, the mobile splash, the site's footer
   * and the color the OS paints around an installed portal window. Those four
   * meet without a seam precisely because they are this one value.
   */
  ink: "#020e18",

  /**
   * The brand OPENED, for dark grounds. 7.3:1 on the portals' dark surface,
   * against 3.6:1 for the flat primary. Same 201°.
   */
  lifted: "#71b1d6",

  /**
   * The brand CLOSED, for being READ on light. 5.6:1 on white and 5.0:1 on the
   * portals' light background, where the flat primary gives 4.2:1 — enough for
   * a filled button or a border, not for a word.
   *
   * The rule every product follows: filled or drawn → `primary`; written →
   * this.
   */
  text: "#326e8f",

  /**
   * The light end of the ramp: the accent over dark grounds, the blue that
   * survives on petrol. 8.5:1 on the portals' dark surface.
   */
  hi: "#86bfdf",

  /**
   * One step above the flat primary: the light theme's hover, the top of the
   * mobile "Entrar" gradient (which ends at `primary`) and the top of the
   * mobile mark's own gentle gradient.
   */
  bright: "#3d8cb8",

  /** The brand washed over white at 12% — badge, chip, avatar, icon tile. */
  soft: "#e7eff3",

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
  /** Pushed a touch greener (153°) so it never neighbors the accent's 201°. */
  posDark: "#3fc98c",

  warn: "#a9700f",
  warnSoft: "#fbf0dc",
  warnDark: "#e0a950",

  danger: "#c4453c",
  dangerSoft: "#fbe9e7",
  dangerDark: "#e3736a",
} as const;

export type BrandColor = keyof typeof BRAND;

/* ── The mark ─────────────────────────────────────────────────────────── */

/**
 * THE MARK, AS GEOMETRY.
 *
 * The "AO" of `docs/design/logo-aguiar-one/`, traced from the 1254px master
 * (`ChatGPT Image 19 de set. de 2026, 00_00_17.png`) and kept here as path
 * data so every product draws the SAME outline: the mobile `Logo` renders it
 * with react-native-svg, and the portals' SVG icons and every PNG in
 * `public/` were generated from it (`ao-mark.svg` in the design folder is the
 * same three paths, ready for a vector editor).
 *
 * Three pieces, and they never touch: the "A" (apex and both legs), the bar
 * under it, and the open "O" that wraps around the A's right leg. The gaps
 * between them ARE the design — scale the mark down so far that they close and
 * it stops being the mark. Below ~16px tall, use the app icon instead.
 *
 * If the mark changes, trace the new file again; do not nudge vertices by eye.
 */

export const MARK = {
  /** The tight box of the drawing, in trace units. About 1.70 : 1. */
  width: 927,
  height: 545,
  paths: {
    a: "M28 529C17.2 527.7 7.9 521.1 3.2 511.5C0.6 506.3 0.2 504.4 0.2 497.7C0.2 489.6 0.8 487.7 6.7 478.3C8.3 475.9 12 469.9 15 465C18 460.1 22 453.8 23.8 450.8C28.3 443.6 37.4 428.9 43.3 419.2C46 414.8 50.3 407.8 52.9 403.7C59.6 392.8 70.5 375.3 75.8 366.7C78.4 362.5 83.5 354.4 87.1 348.5C90.8 342.6 95.8 334.6 98.2 330.7C104 321.1 114 305 116.7 300.7C117.9 298.7 121.4 293.2 124.4 288.3C127.4 283.5 133.1 274.3 137.1 268C141 261.7 146.8 252.4 149.9 247.3C158.2 233.8 168.9 216.7 171.6 212.5C172.8 210.5 175.4 206.3 177.3 203.2C181.5 196.3 190.5 182.2 199.7 168.1C203.4 162.4 209.5 152.9 213.2 146.9C219.4 137.1 222.9 131.5 235.3 111.5C237.6 107.7 243.3 98.6 247.7 91.3C252.2 84.1 257.4 75.6 259.3 72.5C261.2 69.4 263.8 65.3 265 63.3C267.2 60 270.7 54.3 279.5 39.8C281.7 36.2 285.2 30.5 287.2 27.3C289.2 24.1 292.1 19.6 293.5 17.2C304.4 -0.6 325.6 -5.3 341.6 6.7C346.6 10.4 349.2 14.1 363.1 38.3C365 41.5 367.8 46.3 369.4 48.9C376.8 61.6 381.4 69.4 387.2 79.3C390.6 85.3 396 94.5 399.1 99.8C406.7 112.9 409.7 118.1 415.2 127.6C417.7 132.1 421.2 138.1 423 140.9C424.7 143.8 427.7 148.9 429.6 152.3C431.5 155.7 435.3 162.2 438 166.8C440.7 171.4 444.9 178.7 447.3 183C449.8 187.3 452.9 192.8 454.3 195.2C455.8 197.6 458 201.4 459.2 203.7C460.5 206 462.8 210 464.4 212.7C465.9 215.3 469 220.7 471.2 224.6C473.4 228.5 476.6 234 478.3 236.9C480 239.8 482.5 244.1 483.7 246.5C485 248.9 487.8 253.7 489.8 257.2C491.9 260.7 495.2 266.3 497.2 269.8C500.3 275.3 505.6 284.6 522.4 313.8C524.5 317.5 528.1 323.8 530.4 327.8C532.7 331.9 535.8 337.3 537.3 339.8C540.8 345.8 541.1 347.4 538.9 348.8C538 349.4 416.8 349.7 414.5 349.1C410.3 348.1 411.8 350.5 387.2 307.8C384.1 302.5 379.2 294 376.2 289C373.3 284 368.4 275.6 365.4 270.3C362.4 265.1 358.1 257.8 355.9 254C353.7 250.2 349.9 243.6 347.4 239.3C344.9 235 342.6 231.1 342.3 230.7C342 230.2 340.2 227.1 338.3 223.8C336.4 220.5 333.4 215.4 331.7 212.3C329.9 209.3 327.8 205.7 327 204.2C324.5 199.7 322.5 198.4 319.9 199.7C318 200.5 316.3 203.1 308.3 216.5C306.9 218.9 303.5 224.6 300.7 229.2C297.9 233.8 294.6 239.1 293.5 241C291.1 245 275.9 270.4 268.3 283C265.4 287.7 259.6 297.3 255.3 304.3C251.1 311.4 244.1 322.9 239.8 330C235.6 337.1 230 346.2 227.5 350.3C225 354.5 221.8 359.6 220.5 361.8C219.2 364 216.1 369.2 213.5 373.3C204.3 388.3 193.3 406.3 188.7 414C184.3 421.2 180.1 428.1 174.8 436.5C173.7 438.3 172.3 440.6 171.8 441.5C171.3 442.4 169.2 445.8 167.2 449C165.2 452.2 161.7 458 159.3 461.8C157 465.7 153.5 471.5 151.5 474.7C149.4 477.9 147.2 481.5 146.5 482.7C143.4 487.9 129.5 510.1 126.5 514.7C121.4 522.3 111.5 528.1 101.9 529C97.5 529.4 31.3 529.4 28 529Z",
    bar: "M191.2 474.2C189.2 473.4 187.6 471.7 187.4 469.9C187.2 467.9 187.9 466.3 192.6 459C194.6 455.8 198.1 450.1 200.4 446.3C202.7 442.6 206 437.2 207.7 434.3C214.5 423.4 231.6 395.5 235.8 388.7C241.9 378.8 244.4 376.3 250.8 374.4L253.1 373.7 L317.5 373.7C388.4 373.7 384 373.5 388.1 375.8C391.1 377.3 393.9 380.2 396.4 384.5C397.6 386.5 402.7 395.1 407.8 403.5C412.9 411.9 417.8 420 418.7 421.5C420.8 425.1 431.2 442.5 433.1 445.7C446.4 467.9 446 467.2 446 469.5C446 471.4 444 473.7 441.8 474.3C439.6 474.9 192.9 474.8 191.2 474.2Z",
    o: "M649.8 544.6C598.7 542.2 550.2 523.8 510.7 491.9C483.2 469.7 460.9 441.3 437.3 398.3C436.2 396.2 432.8 390.1 429.8 384.8C423.4 373.5 423.2 372.5 426.5 371.1C428 370.5 547 370.4 549.2 371C551 371.5 552.4 373.1 555.4 378.2C573.3 407.9 599.4 428.3 629.2 435.6C640.7 438.5 646.4 439.1 660.2 439.2C696.6 439.2 732 424.7 761.2 397.8C787.8 373.2 803.4 343 807.7 307.7C813.6 259.2 793.3 205.6 757.1 174.1C723 144.4 678.9 131.5 633.8 138.2C581.2 146 534.7 179.2 504.1 231C500 237.8 499.2 237.4 492.5 225.1C490.1 220.7 486.8 214.8 485.2 212C483.5 209.2 480.7 204.1 478.9 200.8C477.1 197.5 475 193.5 474.1 192C473.2 190.4 469 183 464.8 175.5C460.7 168 456.9 161.2 456.4 160.5C452.5 154.4 445.6 141 445.4 139.5C445.2 137.4 445.5 137.1 451.8 129.7C514 57.5 602.5 21.9 694.3 32.2C765.5 40.1 824 72.1 867.8 127C882.2 145 895.6 167.2 904.7 188.2C917.4 217.6 925.3 249.3 927 277.8C933 380.3 880.9 469.4 787.7 516C745.6 537.1 698 546.9 649.8 544.6Z",
  },
} as const;
