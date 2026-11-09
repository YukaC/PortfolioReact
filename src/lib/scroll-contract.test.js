import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  clamp01,
  edgeOffset,
  progressAt,
  resolveRange,
  SPECS,
  viewportOffset,
} from "./scroll-range.js";

/**
 * The scroll layer never moves the page on its own.
 *
 * A phone reports the URL bar showing or hiding as a HEIGHT-ONLY resize, so a
 * re-measure answered per resize re-anchors the page behind the reader's thumb:
 * the hero → footer → hero jump of the 8 nov recording. The policy that fixed
 * it — width-only, debounced — lives in `src/motion/scrollProgress.js` now that
 * the scroll ranges are ours, and the module carries no way to move the page at
 * all.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(ROOT, relative), "utf8");
const strip = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));

const code = strip(read("src/motion/smoothScroll.js"));
const progress = strip(read("src/motion/scrollProgress.js"));

test("a height-only resize never re-measures the ranges", () => {
  assert.match(progress, /if \(window\.innerWidth === lastWidth\) return;/);
  assert.match(
    progress,
    /refreshTimer = window\.setTimeout\(settle, REFRESH_DEBOUNCE_MS\);/,
    "the re-measure waits for the resize to stop",
  );
});

test("the re-measure path never moves the page", () => {
  // A refresh that writes the scroll position is the defect this contract
  // exists for: the progress module answers resize, load and fonts by measuring
  // and nothing else.
  assert.doesNotMatch(progress, /scrollTo/, "a re-measure must not write the scroll offset");
});

test("the fling latch outlives a phone frame", () => {
  const gap = code.match(/const FLING_GAP_MS = (\d+);/);
  assert.ok(gap, "no idle gap");
  assert.ok(Number(gap[1]) >= 250, `${gap[1]} ms is under the 84-109 ms p95 frame measured on the phone`);
  assert.match(code, /FLING_ENTER_PX_PER_S = \d+/, "the threshold must be a speed, not a delta per frame");
});

test("the fling class cannot outlive the movement", () => {
  // The latch reads scroll events, so silence is the one case it cannot see: a
  // locked layer or a backgrounded tab leaves it on and every block past the
  // next viewport loses its entrance until the reader scrolls again.
  const lock = code.slice(code.indexOf("export function lockSmoothScroll"), code.indexOf("export function unlockSmoothScroll"));
  assert.match(lock, /clearFling\(\)/, "a stopped layer must drop the class with it");
  assert.match(
    code,
    /performance\.now\(\) - lastFlingTime <= FLING_GAP_MS/,
    "the watchdog must re-check the real gap, not fire once after a fixed delay",
  );
});

test("the open drawer locks the page on every pointer, Lenis or not", () => {
  // A coarse pointer never mounts Lenis, so `lockSmoothScroll()` stops nothing there:
  // the lock is the `overflow: hidden` the drawer puts on <html> and <body> while it
  // is open (verified with real touch drags: the page moves closed, stays open).
  const navbar = read("src/components/Navbar.jsx");
  const open = navbar.slice(navbar.indexOf("if (!isMenuOpen) return undefined;"));
  assert.match(open, /html\.style\.overflow = "hidden";/, "the drawer must lock <html>");
  assert.match(open, /document\.body\.style\.overflow = "hidden";/, "the drawer must lock <body>");
});

/* The ranges, as the page asks for them. ScrollTrigger resolved
   `start "top 82%"` as "the element's top reaches 82 % of the viewport", and
   the progress values `--tlp`, `--fp` and the statement's word light are tuned
   against those exact numbers; every boundary below is one of them. */
const BOX = { top: 2400, height: 800 };
const VIEWPORT = 900;

const rangeOf = (spec) =>
  resolveRange({ box: BOX, start: spec.start, end: spec.end, viewportHeight: VIEWPORT });

test("the statement starts where its top reaches 82 % of the viewport", () => {
  assert.equal(rangeOf(SPECS.statement).startY, 1662);
});

test("the statement ends where its bottom reaches 48 % of the viewport", () => {
  assert.equal(rangeOf(SPECS.statement).endY, 2768);
});

test("the rail starts where its top reaches 72 % of the viewport", () => {
  assert.equal(rangeOf(SPECS.rail).startY, 1752);
});

test("the rail ends where its bottom reaches 60 % of the viewport", () => {
  assert.equal(rangeOf(SPECS.rail).endY, 2660);
});

test("the footer rise starts where its top reaches 85 % of the viewport", () => {
  assert.equal(rangeOf(SPECS.rise).startY, 1635);
});

test("the footer rise ends where its bottom reaches the bottom of the viewport", () => {
  assert.equal(rangeOf(SPECS.rise).endY, 2300);
});

test("progress is clamped below the start and above the end", () => {
  const range = rangeOf(SPECS.statement);
  assert.equal(progressAt(range, 0), 0, "above the page is not negative progress");
  assert.equal(progressAt(range, 9000), 1, "past the end is not more than finished");
});

test("progress is exact at both boundaries", () => {
  const range = rangeOf(SPECS.statement);
  assert.equal(progressAt(range, range.startY), 0);
  assert.equal(progressAt(range, range.endY), 1);
});

test("progress between the boundaries is the travelled fraction", () => {
  const range = rangeOf(SPECS.statement);
  assert.ok(Math.abs(progressAt(range, 2000) - 338 / 1106) < 1e-9);
});

test("a range of no length is either untouched or finished", () => {
  const range = { startY: 500, endY: 500 };
  assert.equal(progressAt(range, 499), 0);
  assert.equal(progressAt(range, 500), 1);
});

test("a viewport reference reads as px, percent, top or bottom", () => {
  assert.equal(viewportOffset(24, 900), 24);
  assert.equal(viewportOffset("82%", 900), 738);
  assert.equal(viewportOffset("top", 900), 0);
  assert.equal(viewportOffset("bottom", 900), 900);
});

test("an element edge reads as its layout box in document coordinates", () => {
  assert.equal(edgeOffset({ top: 2400, height: 800 }, "top"), 2400);
  assert.equal(edgeOffset({ top: 2400, height: 800 }, "bottom"), 3200);
});

test("clamp01 keeps a fraction inside the range it names", () => {
  assert.deepEqual([clamp01(-0.4), clamp01(0), clamp01(0.5), clamp01(1), clamp01(2.2)], [0, 0, 0.5, 1, 1]);
});

test("the specs the page resolves against are frozen", () => {
  assert.throws(() => {
    SPECS.statement.start[1] = "50%";
  }, TypeError);
  assert.equal(SPECS.statement.start[1], "82%");
});
