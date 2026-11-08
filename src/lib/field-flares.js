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
 *   2. Inside a band the new cells go to the **starved thirds** of that band's
 *      width first (every third of the band must hold its share of the dots), and
 *      inside a third each cell lands on a low-discrepancy jitter point (the R2
 *      sequence of the plastic constant). Two hard constraints hold over the whole
 *      table: no two flares share a cell or touch (Chebyshev distance ≥ 2), and
 *      cells three or fewer apart never fire within eight slots of each other. The
 *      first version of this table was stratified only, and because the ladder is
 *      cumulative the six a phone shows stayed pinned to x < 8 and the rest piled
 *      up behind them: on a 1920 field the dots “caían por grupos mayormente en el
 *      lado izquierdo” (owner report, L9). Balancing the thirds is what fixes that
 *      — the 36 now sit 12/12/12 across the width.
 *   3. `slot` is the phase of the whole field: one slot per flare out of the 64
 *      that a breath holds, dealt in golden-ratio order through a deterministic
 *      permutation of the table (so the order is reproducible and testable), which
 *      keeps **every prefix** — the six a phone shows as much as the 36 a wide
 *      screen does — spread over the breath and keeps neighbours apart in time. The
 *      delay is `slot * --grid`, and `--grid` is `--breath / 64` (87.89 ms at
 *      the shipped tempo): the cycle divided by the slots the table uses, so the
 *      phases cover the whole breath whatever its length is. Derive the grid from
 *      the beat instead and it silently stops covering the cycle as soon as the
 *      breath changes — that is the trap this file is written around.
 *
 * One strike is a tide with a bloom on top: `@keyframes flare` rests at 0.02 (never
 * 0), drifts to 0.16 by 38 % of the cycle, blooms to 0.6 at the middle and is back
 * down by 62 %, all eased by `--ease-in-out-field`. The shape is what keeps a slow
 * swell and a low lit count at once: a flat window makes the lit population
 * `count × duty`, and with a 24 % crest only ~4 of 36 dots are bright at any
 * instant while the dot still moves for most of its 5.6 s breath (L10). The
 * amplitude is the knob the brightness briefs turn (L8–L12) and the rest state is
 * not one of them: a stronger parked footprint is the semi-transparent disc the
 * owner rejected (L11). There is
 * one bell for every density: the
 * band decides how many dots are painted, never how they breathe (`flare` in
 * `globals.css`). The per-band windows and the “1–4 lit at once” budget they
 * served were retired by the owner's briefs (L6, L8, L9) — a narrow window is a
 * sparkle whatever the period around it is, a window covering the whole cycle
 * reads as one slow body instead of a field, and the amplitude is what makes the
 * dot read as light.
 * `field-flares.test.js` pins all of it in numbers.
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
    [1, 15, 42],
    [0, 8, 43],
    [4, 15, 55],
    [4, 8, 1],
    [6, 14, 8],
    [7, 7, 37],
    [12, 14, 18],
    [10, 7, 6],
    [9, 1, 58],
    [15, 13, 4],
    [19, 7, 24],
    [18, 1, 38],
    [19, 15, 54],
    [17, 8, 39],
    [14, 1, 25],
    [23, 15, 41],
    [31, 8, 2],
    [28, 1, 3],
    [26, 10, 23],
    [23, 3, 49],
    [31, 13, 34],
    [29, 5, 16],
    [6, 19, 36],
    [3, 10, 9],
    [0, 1, 51],
    [23, 19, 19],
    [20, 10, 53],
    [16, 1, 59],
    [28, 19, 11],
    [38, 10, 56],
    [35, 1, 20],
    [33, 13, 50],
    [28, 3, 26],
    [38, 16, 33],
    [35, 7, 21],
    [32, 19, 7]
  ].map(([cx, cy, slot]) => Object.freeze({ cx, cy, slot })),
);
