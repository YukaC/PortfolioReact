import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * What this protects: the scroll layer never moves the page on its own.
 *
 * Two owner reports from a phone fling are behind these rules
 * (odd/tasks/mobile-motion-perf.md L17):
 *
 *   1. "Saltos de posición del scroll. En un mismo fling el scroll pasa del hero
 *      al footer, luego vuelve al hero." A `resize` fired by the URL bar showing
 *      or hiding is a HEIGHT-ONLY change, and the handler below used to answer it
 *      with `ScrollTrigger.refresh()` — a forced refresh, whose first act is to
 *      jump the scroll to 0 and restore a position recorded on the main thread.
 *      That stops the native fling and re-anchors the page behind the reader.
 *   2. "Secciones enteras en blanco durante el scroll." While the layer is
 *      travelling faster than an entrance can finish, the stylesheet reveals at
 *      once instead of playing `--duration-reveal` under the reader; the latch
 *      that decides it has to survive this repo's own phone frame times.
 *
 * Everything here is a property of one file, so it is read rather than run: the
 * behaviour is timing in a real browser and the harness for that is `npm run
 * perf`, not a unit test.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = readFileSync(path.join(ROOT, "src/motion/smoothScroll.js"), "utf8");

/** Comments dropped (line breaks kept) so a comment can never satisfy a pin. */
const code = source.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
  comment.replace(/[^\n]/g, " "),
);

test("a height-only resize never refreshes the scroll triggers", () => {
  // The URL bar is height-only. Refreshing there is what re-anchored the scroll
  // inside a gesture; the guard is the fix, not the debounce.
  assert.match(
    code,
    /if \(window\.innerWidth === lastWidth\) return;/,
    "the resize handler must ignore a resize that did not change the width",
  );
  assert.match(
    code,
    /refresh\(true\)/,
    "a refresh has to take ScrollTrigger's debounced path, never the forced one",
  );
  assert.doesNotMatch(
    code,
    /refresh\(\s*\)/,
    "ScrollTrigger.refresh() with no argument is a forced refresh: it zeroes the scroll and restores it mid-gesture",
  );
  const handler = code.slice(code.indexOf("const onResize"));
  assert.ok(
    handler.indexOf("innerWidth === lastWidth") < handler.indexOf("refreshTimer"),
    "the width guard must run before any timer is armed",
  );
});

test("the fling latch outlives a phone frame, and is a speed", () => {
  const gap = code.match(/const FLING_GAP_MS = (\d+);/);
  assert.ok(gap, "the fling latch has no idle gap");
  assert.ok(
    Number(gap[1]) >= 250,
    `FLING_GAP_MS is ${gap[1]} ms, under the 84-109 ms p95 frame plus a 240 ms long task this repo measured on a phone: the latch would read a fling as settled exactly when the reader needs it`,
  );
  assert.match(
    code,
    /FLING_ENTER_PX_PER_S = \d+/,
    "the threshold must be a speed in px/s; a delta per frame means a different thing at 60 Hz and 144 Hz",
  );
  assert.match(
    code,
    /performance\.now\(\)/,
    "the speed needs a clock",
  );
  assert.match(
    code,
    /classList\.toggle\(FLING_CLASS/,
    "the class the stylesheet reads has to be written and cleared in one place",
  );
  assert.match(
    code,
    /classList\.remove\(FLING_CLASS\)/,
    "a stopped layer must not leave the class on the document",
  );
});

test("one owner of the smoothed scroll", () => {
  // Lenis ignores `duration` when `lerp` is present, so passing both read as a
  // balanced configuration and was one value plus a lie (audit.md §10 P0-2).
  const options = code.match(/new Lenis\(\{([\s\S]*?)\}\)/);
  assert.ok(options, "Lenis is not constructed here any more");
  const body = options[1];
  assert.match(body, /lerp:\s*SCROLL_LERP/, "the smoothing parameter moved");
  assert.doesNotMatch(
    body,
    /duration:/,
    "lerp together with duration is one value plus a lie: Lenis ignores duration",
  );
  assert.match(
    code,
    /lenis\.on\("scroll", ScrollTrigger\.update\)/,
    "ScrollTrigger must consume the layer's own smoothed value",
  );
  assert.match(
    code,
    /gsap\.ticker\.lagSmoothing\(0\)/,
    "lag smoothing on the ticker would re-time the scroll under a stalled frame",
  );
});
