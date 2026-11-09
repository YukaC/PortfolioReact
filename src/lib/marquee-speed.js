/**
 * The two numbers the technology band derives from the page's scroll speed.
 *
 * Both used to be computed inline, inside the band's frame loop, which meant the
 * only way to check them was a browser watching the band move. They live here —
 * no DOM, no imports — so `node --test` can pin the two rules that are easy to
 * break while "tidying" the arithmetic: a band at rest plays at exactly 1, and
 * the skew string is always a clamped, two-decimalled `deg`.
 *
 * The drift itself is a compositor animation at `BASE_SPEED` px/s; the scroll
 * only changes how fast it plays, which is what `playbackRateFor` answers.
 */

/**
 * Degrees of tilt per px/s of scroll. The sign is the point: the band leans
 * against the direction of travel, so a downward fling tilts it the other way.
 */
export const SKEW_PER_PX_PER_S = -0.008;

/**
 * How much faster than its base speed the animation must play to move the row at
 * the speed the gesture asks for.
 *
 * A row advanced by `dir * (baseSpeed + velocity * speedFromScroll)` px per
 * second. An animation of `baseSpeed` px/s covers that same distance at rate
 * `1 + (velocity * speedFromScroll) / baseSpeed`. Negative is legal and wanted:
 * the band runs backwards when the page moves against it, exactly as the
 * multiplied speed did.
 *
 * @param {number} velocity px/s of smoothed scroll
 * @param {{ baseSpeed: number, speedFromScroll: number }} shape the two constants
 * @returns {number} the animation's playback rate
 */
export const playbackRateFor = (velocity, { baseSpeed, speedFromScroll }) =>
  1 + (velocity * speedFromScroll) / baseSpeed;

/**
 * The `skewX(…)` string for a velocity: clamped to ±`ceiling`, formatted the way
 * the wrapper's `style.transform` has always carried it.
 *
 * @param {number} velocity px/s of smoothed scroll
 * @param {number} ceiling degrees, coarser on a phone than on a desktop
 * @returns {string} the transform value
 */
export const skewFor = (velocity, ceiling) =>
  `skewX(${Math.min(ceiling, Math.max(-ceiling, velocity * SKEW_PER_PX_PER_S)).toFixed(2)}deg)`;
