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
 *   3. `--delay` is the phase of the whole field and `--dur` its cycle. The
 *      delays are one slot each of a 36-slot cycle (8 s / 36), dealt in
 *      golden-ratio order so that **every prefix** — the six a phone shows as
 *      much as the 36 a wide screen does — comes out spread over the cycle
 *      instead of bunched at its start. The cycles are then a narrow, all
 *      distinct band around 9 s rather than the 7–11 s scatter used before: a
 *      bounded number of lit flares only holds while the phases stay roughly in
 *      step, and a 2 s scatter decorrelates them so fast that the count became
 *      a distribution up to 6. The band still drifts (the pattern is not a loop)
 *      — it just drifts at ~0.4 of a cycle per minute instead of seconds.
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
 * @type {ReadonlyArray<{ cx: number, cy: number, dur: number, delay: number }>}
 *   `cx`/`cy` are integer cell coordinates (the position is `cx * 48 + 24`),
 *   `dur` is the cycle in seconds and `delay` its phase offset.
 *
 * The four columns are read together: the entry at index `i` is served in the
 * HTML as `--cx: 5; --cy: 7; --dur: 8.7s; --delay: 0s`, and the delays are the
 * 8 s slot grid (0.2222 s apart) walked in golden-ratio order.
 */
export const FIELD_FLARES = Object.freeze(
  [
    [5, 7, 8.7, 0],
    [1, 0, 9.077, 4.889],
    [4, 14, 8.854, 2],
    [3, 6, 9.231, 6.889],
    [2, 14, 8.991, 3.778],
    [5, 1, 8.769, 0.889],
    // 12 — inside 1024×768
    [0, 15, 8.906, 2.667],
    [5, 3, 9.283, 7.556],
    [17, 8, 8.82, 1.556],
    [16, 5, 9.043, 4.444],
    [7, 9, 9.146, 5.778],
    [12, 6, 9.197, 6.444],
    // 22 — inside 1600×900
    [21, 8, 8.957, 3.333],
    [27, 17, 8.734, 0.444],
    [25, 2, 9.111, 5.333],
    [6, 12, 8.871, 2.222],
    [4, 3, 9.249, 7.111],
    [10, 7, 9.009, 4],
    [17, 16, 8.786, 1.111],
    [23, 1, 9.163, 6],
    [29, 11, 8.923, 2.889],
    [2, 8, 9.3, 7.778],
    // 36 — inside 1920×1080
    [8, 7, 9.06, 4.667],
    [14, 19, 8.837, 1.778],
    [28, 1, 9.214, 6.667],
    [26, 12, 8.974, 3.556],
    [1, 2, 8.751, 0.667],
    [31, 21, 9.129, 5.556],
    [5, 10, 8.889, 2.444],
    [3, 14, 9.266, 7.333],
    [17, 4, 9.026, 4.222],
    [23, 8, 8.803, 1.333],
    [21, 20, 9.18, 6.222],
    [35, 2, 8.94, 3.111],
    [33, 13, 8.717, 0.222],
    [15, 3, 9.094, 5.111],
  ].map(([cx, cy, dur, delay]) => Object.freeze({ cx, cy, dur, delay })),
);
