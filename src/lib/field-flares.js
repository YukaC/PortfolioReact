/**
 * The identity layer's flare table (audit.md §18.4, §19.2; feature spec S5).
 *
 * The coral lattice is CSS: one tiled raster with a 48 px cell, anchored at the
 * tile origin `0 0`, so every dot centre sits at `n * 48 + 24` from the top-left
 * corner of the viewport. A flare is the strike on one of those dots, and it is
 * therefore placed in **whole cell coordinates** — `left: calc(var(--cx) * 48px +
 * 24px)` in `globals.css` — never in percentages of the viewport. Percentages
 * cannot land on a fixed grid: that is exactly what got the previous attempt at
 * this design reverted (§19.3, commit `8164756`), and the "distance 0 to the
 * nearest dot centre" criterion in §18.8 is the one that failed there.
 *
 * `FIELD_FLARES` is a literal, generated once. Nothing here is computed at
 * runtime: the 36 entries are served in the HTML, and the ones a narrow viewport
 * does not need are hidden by media query, not by JavaScript (§18.4 rule 4).
 *
 * How the table was generated, so it can be regenerated rather than guessed:
 *
 *   1. The viewport bands are visited in order, each one taking the next slice
 *      of the list: 6 entries inside 390×844, 12 inside 1024×768, 22 inside
 *      1600×900, 36 inside 1920×1080. The cell-index limits those viewports
 *      imply (x < 8 / 21 / 33 / 40, y < 17 / 16 / 18 / 22) are narrowed to the
 *      intersection of the four so every **prefix** fits, not just its own band:
 *      x < 8 / 21 / 33 / 40, y < 16 / 16 / 18 / 22.
 *   2. Inside a band, the cells are cut into strata of roughly square size
 *      (`cols ≈ √(count · width / height)`), the strata are walked in a
 *      low-discrepancy order (golden-ratio rank of their index), and each one
 *      contributes the free cell nearest a low-discrepancy jitter point (the R2
 *      sequence of the plastic constant) inside it. Any prefix is therefore
 *      spread over its band instead of filling it row by row, and no cell is
 *      used twice.
 *   3. `--dur` and `--delay` were dealt from a golden-ratio sequence, which is
 *      also why every prefix gets a well-spread set of cycles: six flares on a
 *      phone never flash together, and the phase of the whole field never
 *      recurs. Distinct cycles are what keep the field from turning into one
 *      synchronised strobe.
 *
 * The bright phase of `@keyframes flare` is the last 8 % of a cycle
 * (90 % → 98 %, ≈ 0.6 s at these durations), so the expected number of flares
 * lit at any instant is `36 × 0.08 = 2.88` — the calm field §18.4 asks for,
 * against the ~18 glows the shader held continuously. `field-flares.test.js`
 * pins that budget in numbers.
 */

/** Side of one lattice cell, in CSS pixels. Must equal the `48px` in `globals.css`. */
export const CELL_PX = 48;

/** Distance from a cell's top-left corner to its dot centre, in CSS pixels. */
export const DOT_INSET_PX = 24;

/**
 * The 36 flares, in the order the density media queries reveal them: the first
 * six are the phone field, the first twelve the tablet one, and so on.
 *
 * @type {ReadonlyArray<{ cx: number, cy: number, dur: number, delay: number }>}
 *   `cx`/`cy` are integer cell coordinates (the position is `cx * 48 + 24`),
 *   `dur` is the cycle in seconds and `delay` its offset.
 */
export const FIELD_FLARES = Object.freeze(
  [
    [5, 7, 8.48, 1.52],
    [1, 0, 10.95, 6.46],
    [4, 14, 9.42, 3.41],
    [3, 6, 7.9, 0.35],
    [2, 14, 10.37, 5.3],
    [5, 1, 8.84, 2.24],
    // 12 — inside 1024×768
    [0, 15, 7.31, 7.19],
    [5, 3, 9.78, 4.13],
    [17, 8, 8.26, 1.07],
    [16, 5, 10.73, 6.02],
    [7, 9, 9.2, 2.96],
    [12, 6, 7.67, 7.91],
    // 22 — inside 1600×900
    [21, 8, 10.15, 4.85],
    [27, 17, 8.62, 1.8],
    [25, 2, 7.09, 6.74],
    [6, 12, 9.56, 3.68],
    [4, 3, 8.03, 0.63],
    [10, 7, 10.51, 5.57],
    [17, 16, 8.98, 2.52],
    [23, 1, 7.45, 7.46],
    [29, 11, 9.92, 4.41],
    [2, 8, 8.39, 1.35],
    // 36 — inside 1920×1080
    [8, 7, 10.87, 6.29],
    [14, 19, 9.34, 3.24],
    [28, 1, 7.81, 0.18],
    [26, 12, 10.28, 5.13],
    [1, 2, 8.76, 2.07],
    [31, 21, 7.23, 7.02],
    [5, 10, 9.7, 3.96],
    [3, 14, 8.17, 0.9],
    [17, 4, 10.64, 5.85],
    [23, 8, 9.12, 2.79],
    [21, 20, 7.59, 7.74],
    [35, 2, 10.06, 4.68],
    [33, 13, 8.53, 1.63],
    [15, 3, 7, 6.57],
  ].map(([cx, cy, dur, delay]) => Object.freeze({ cx, cy, dur, delay })),
);
