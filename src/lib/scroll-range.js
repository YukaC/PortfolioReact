/**
 * Scroll-range math: an `[element edge, viewport reference]` pair resolved
 * against a cached box, plus the progress of a scroll offset through it.
 *
 * Pure functions, no DOM and no imports, so `node --test` loads this module
 * directly and the numbers the page is tuned against are pinned without a
 * browser.
 *
 * The two specs this reproduces are the ones the page shipped on:
 * `start "top 82%"` is "the element's top reaches 82 % of the viewport"
 * (`startY = box.top - 0.82 * viewportHeight`) and `end "bottom 48%"` is "the
 * element's bottom reaches 48 % of it" (`endY = box.top + box.height - 0.48 *
 * viewportHeight`). `["bottom", "bottom"]` is the same rule with the reference
 * at the bottom of the viewport.
 */

export const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);

/** The `start`/`end` edge of a box, in document coordinates. */
export function edgeOffset(box, edge) {
  return box.top + (edge === "bottom" ? box.height : 0);
}

/**
 * A viewport reference in px: a number is already px, `"82%"` is a fraction of
 * the viewport height, and `"top"`/`"bottom"` are its two edges.
 */
export function viewportOffset(ref, viewportHeight) {
  if (typeof ref === "number") return ref;
  if (ref === "top") return 0;
  if (ref === "bottom") return viewportHeight;
  const percent = Number.parseFloat(ref);
  if (!Number.isFinite(percent)) return 0;
  // Percent first, divide last: `82%` of 900 is 738 exactly, and the boundary
  // the CSS was tuned against is not allowed to move by a float's last digit.
  return (percent * viewportHeight) / 100;
}

/**
 * The two document offsets a range runs between.
 *
 * `box` is `{ top, height }` in document coordinates.
 */
export function resolveRange({ box, start, end, viewportHeight }) {
  const startY = edgeOffset(box, start[0]) - viewportOffset(start[1], viewportHeight);
  const endY = edgeOffset(box, end[0]) - viewportOffset(end[1], viewportHeight);
  return { startY, endY };
}

/**
 * How far the scroll offset has travelled through the range, in [0, 1].
 *
 * A range of no length (an element shorter than the gap it is measured
 * against) answers "finished" as soon as the reader is past its start: a
 * division by zero would otherwise hand `Infinity` to the CSS.
 */
export function progressAt(range, scrollY) {
  const span = range.endY - range.startY;
  if (span === 0) return scrollY >= range.startY ? 1 : 0;
  return clamp01((scrollY - range.startY) / span);
}

/**
 * The ranges the page asks for, frozen: the About statement's word light, the
 * About rail (`--tlp`, `.is-on`) and the footer rise (`--fp`).
 *
 * A viewport reference is the fraction of the viewport height the CSS-facing
 * spec was written in — `"top 82%"` — so the fraction is carried as the
 * percentage string it is: a numeric reference is px, and nothing here is one.
 */
export const SPECS = Object.freeze({
  statement: Object.freeze({
    start: Object.freeze(["top", "82%"]),
    end: Object.freeze(["bottom", "48%"]),
  }),
  rail: Object.freeze({
    start: Object.freeze(["top", "72%"]),
    end: Object.freeze(["bottom", "60%"]),
  }),
  rise: Object.freeze({
    start: Object.freeze(["top", "85%"]),
    end: Object.freeze(["bottom", "bottom"]),
  }),
});
