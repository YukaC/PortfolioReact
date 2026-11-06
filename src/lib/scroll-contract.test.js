import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The scroll layer never moves the page on its own.
 *
 * `ScrollTrigger.refresh()` with no argument is a forced refresh: it skips the
 * "still scrolling" guard, sends the scroll to 0 and restores a position
 * recorded on the main thread. A phone reports the URL bar showing or hiding as
 * a HEIGHT-ONLY resize, so answering every resize with it re-anchored the page
 * behind the reader's thumb (odd/tasks/mobile-motion-perf.md L17).
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const code = readFileSync(path.join(ROOT, "src/motion/smoothScroll.js"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  (comment) => comment.replace(/[^\n]/g, " "),
);

test("a height-only resize never refreshes the scroll triggers", () => {
  assert.match(code, /if \(window\.innerWidth === lastWidth\) return;/);
  assert.match(code, /refresh\(true\)/, "the debounced path, never the forced one");
  assert.doesNotMatch(code, /refresh\(\s*\)/, "a forced refresh zeroes the scroll mid-gesture");
});

test("the fling latch outlives a phone frame", () => {
  const gap = code.match(/const FLING_GAP_MS = (\d+);/);
  assert.ok(gap, "no idle gap");
  assert.ok(Number(gap[1]) >= 250, `${gap[1]} ms is under the 84-109 ms p95 frame measured on the phone`);
  assert.match(code, /FLING_ENTER_PX_PER_S = \d+/, "the threshold must be a speed, not a delta per frame");
});
