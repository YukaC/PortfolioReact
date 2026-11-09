import test from "node:test";
import assert from "node:assert/strict";

import { SKEW_PER_PX_PER_S, playbackRateFor, skewFor } from "./marquee-speed.js";

/**
 * The technology band's two scroll-driven numbers.
 *
 * The band used to draw itself by hand: one `requestAnimationFrame` loop added
 * `dir * (48 + velocity * 0.5) * dt / 1000` px to each row and wrote a
 * `skewX(…)` string on the wrapper, for as long as the band was on screen. The
 * drift is now a compositor animation at its base speed and the scroll only
 * changes how fast it plays, so the two mappings that used to be inlined in that
 * loop live in `src/lib/marquee-speed.js` and are pinned here, without a browser:
 *
 *   1. a band at rest plays at exactly 1 (any other rest value is a drift at the
 *      wrong speed, forever — the loop that used to correct it is gone);
 *   2. a positive scroll velocity speeds the row up;
 *   3. a negative one reverses it — the multiplied speed did, and the rate has
 *      to keep doing it or the band stops answering the gesture;
 *   4. at the shipped constants (48 px/s, 0.5) a velocity of -96 px/s is exactly
 *      0, the rate that holds the row still;
 *   5. the skew never leaves ±ceiling — it is written into `style.transform`, so
 *      an unclamped value is a visibly broken band, not a big one;
 *   6. at rest the skew is the zero string the loop leaves on screen;
 *   7. and it is always the `0.00deg` shape today's code writes, never `0deg`.
 */
const SHIPPED = { baseSpeed: 48, speedFromScroll: 0.5 };

test("a band at rest plays at exactly its base speed", () => {
  assert.equal(playbackRateFor(0, SHIPPED), 1);
});

test("a positive scroll velocity speeds the row up", () => {
  assert.ok(playbackRateFor(480, SHIPPED) > 1);
});

test("a negative scroll velocity reverses the row", () => {
  assert.ok(playbackRateFor(-480, SHIPPED) < 0);
});

test("the shipped constants hold the row still at -96 px/s", () => {
  assert.equal(playbackRateFor(-96, SHIPPED), 0);
});

test("the skew stops at the ceiling on a fast downward scroll", () => {
  assert.equal(skewFor(100000, 8), "skewX(-8.00deg)");
});

test("the skew stops at the ceiling on a fast upward scroll", () => {
  assert.equal(skewFor(-100000, 8), "skewX(8.00deg)");
});

test("the skew is the zero string at rest", () => {
  assert.equal(skewFor(0, 8), "skewX(0.00deg)");
});

test("the skew always carries two decimalled degrees", () => {
  assert.match(skewFor(3.33, 8), /^skewX\(-?\d+\.\d{2}deg\)$/);
});

test("the tilt is the operator's -0.008 deg per px/s", () => {
  assert.equal(SKEW_PER_PX_PER_S, -0.008);
});
