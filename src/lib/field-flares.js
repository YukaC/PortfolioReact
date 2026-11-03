/**
 * The identity layer's flare table (audit.md §18.4, §19.2; feature spec S5, and
 * the tempo lock of `odd/tasks/flare-tempo.md` S1–S3).
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
 * runtime and nothing here knows the tempo: the 36 entries are served in the
 * HTML, the ones a narrow viewport does not need are hidden by media query, not
 * by JavaScript (§18.4 rule 4), and the cycle, the beat and the grid are three
 * custom properties in `globals.css` (`--breath`, `--beat`, `--grid`). This file
 * carries only what is genuinely per-element: where the dot is, and which slot
 * of the breath it fires on.
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
 *   3. `slot` is the phase of the whole field: one slot per flare out of the 64
 *      that a breath holds, walked in golden-ratio order, so that **every
 *      prefix** — the six a phone shows as much as the 36 a wide screen does —
 *      comes out spread over the breath instead of bunched at its start. The
 *      delay is `slot * --grid`, and `--grid` is a 32nd note at `--bpm: 128`
 *      (58.59 ms), so every flare leaves its rest and reaches its peak *on the
 *      song's grid*: one breath is 8 beats, its peak sits at 4 of them, and both
 *      are whole beats away from the slot.
 *
 * One strike is a soft swell, not a blink: `@keyframes flare` rests at 0.04
 * (never 0), peaks at 0.5 and is eased on both flanks by `--ease-in-out-field`.
 * The slice of the cycle above the 0.05 "lit" threshold is what the cadence
 * budget counts, and it is set per density band so that 1–4 flares are lit at
 * once however many dots the viewport carries (`flare`, `flare-22`, `flare-12`,
 * `flare-6` in `globals.css`). `field-flares.test.js` pins all of it in numbers.
 */

/** Side of one lattice cell, in CSS pixels. Must equal the `48px` in `globals.css`. */
export const CELL_PX = 48;

/** Distance from a cell's top-left corner to its dot centre, in CSS pixels. */
export const DOT_INSET_PX = 24;

/**
 * The 36 flares, in the order the density media queries reveal them: the first
 * six are the phone field, the first twelve the tablet one, and so on.
 *
 * @type {ReadonlyArray<{ cx: number, cy: number, slot: number }>}
 *   `cx`/`cy` are integer cell coordinates (the position is `cx * 48 + 24`),
 *   `slot` is the phase as a whole number of `--grid` steps inside one breath.
 *
 * The three columns are read together: the entry at index `i` is served in the
 * HTML as `--cx: 5; --cy: 7; --delay: calc(0 * var(--grid))`, and the slots are
 * the 64 of a breath dealt in golden-ratio order.
 */
export const FIELD_FLARES = Object.freeze(
  [
    [5, 7, 0],
    [1, 0, 34],
    [4, 14, 13],
    [3, 6, 47],
    [2, 14, 26],
    [5, 1, 60],
    // 12 — inside 1024×768
    [0, 15, 5],
    [5, 3, 39],
    [17, 8, 18],
    [16, 5, 52],
    [7, 9, 31],
    [12, 6, 10],
    // 22 — inside 1600×900
    [21, 8, 44],
    [27, 17, 23],
    [25, 2, 57],
    [6, 12, 2],
    [4, 3, 36],
    [10, 7, 15],
    [17, 16, 49],
    [23, 1, 28],
    [29, 11, 62],
    [2, 8, 7],
    // 36 — inside 1920×1080
    [8, 7, 41],
    [14, 19, 20],
    [28, 1, 54],
    [26, 12, 33],
    [1, 2, 12],
    [31, 21, 46],
    [5, 10, 25],
    [3, 14, 59],
    [17, 4, 4],
    [23, 8, 38],
    [21, 20, 17],
    [35, 2, 51],
    [33, 13, 30],
    [15, 3, 9],
  ].map(([cx, cy, slot]) => Object.freeze({ cx, cy, slot })),
);
