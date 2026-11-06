import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * T6's fix, pinned: the field's grain stops blending on a coarse pointer
 * (feature spec S3 — the fix is chosen by the largest measured delta, not by
 * suspicion — and S4 — nothing here appears, disappears or blinks).
 *
 * What the phone measurement said (moto g82 5G, Brave, 352×781 @DPR 3.075, ~40 fps
 * ceiling; eleven-second interleaved legs, same gesture path, same session, and
 * the *strikes kept painting and animating in every row below*):
 *
 *   change                                    p95            long tasks / leg
 *   none (baseline)                           108.9 / 108.9  3 / 2
 *   `.flare { will-change: opacity, transform }`   100.3     3
 *   `.bocanada-flares { will-change: … }`     100.7          6
 *   `.flare { transform: translateZ(0) }`     100.6          3
 *   `.flare { animation: none }` (painted, still)  100.3      1
 *   6 → 4 strikes                              100.5          2
 *   6 → 3 strikes                              108.8          5
 *   peak 0.5 → 0.3                             108.8 / 125.6  5
 *   `.field-grain { mix-blend-mode: normal }`   **83.7**       **0**
 *   `.field-grain { display: none }`           83.6 / 75.3    0
 *   every strike hidden                        75.4           0
 *
 * So the re-raster was never the flares' own paint: it is the `overlay` blend on
 * the viewport-sized turbulence tile. A blend reads its backdrop, which makes the
 * whole field group one raster unit, and that unit has to be re-rastered whenever
 * anything inside it paints — every frame the strikes move. Plain `source-over`
 * keeps the same tile at the same 0.06 and takes the group apart.
 *
 * Why no pixel-level RED is possible here: the change is a compositing property
 * whose effect is a frame time on one physical phone. There is nothing in a unit
 * test that can observe a raster worker. What this file can pin — and what would
 * silently regress — is the structure the measurement produced: the grain keeps
 * its tile and its weight, the blend override exists and is scoped to a coarse
 * pointer, and the identity layer keeps its own budget (no compositor hints, no
 * blend, and the phone's bell peak untouched).
 *
 * The visual cost was measured too, not assumed: with the strikes hidden in both
 * captures and the page parked at scrollY 0, `overlay` against `normal` is
 * RMSE 1.23 % of full scale and PSNR 38.2 dB over the whole screen, with 0.04 %
 * of pixels differing by more than 2 % — the grain is still there, reading as a
 * flatter veil over the field.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const css = readFileSync(path.join(ROOT, "src/styles/globals.css"), "utf8");

/** Comments dropped (line breaks kept) so a comment can never quote a rule in. */
const bare = css.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
  comment.replace(/[^\n]/g, " "),
);

/** The body of the block that opens at `openIndex`, balanced to its close. */
const blockAt = (openIndex) => {
  let depth = 0;
  for (let i = openIndex; i < bare.length; i += 1) {
    if (bare[i] === "{") depth += 1;
    else if (bare[i] === "}") {
      depth -= 1;
      if (depth === 0) return bare.slice(openIndex + 1, i);
    }
  }
  throw new Error(`unbalanced block at ${openIndex}`);
};

/** The body of the first rule whose selector list contains `selector` exactly. */
const ruleFor = (selector) => {
  const re = /([^{}]+)\{/g;
  let match = re.exec(bare);
  while (match !== null) {
    const selectors = match[1].split(",").map((one) => one.trim());
    if (selectors.includes(selector)) return blockAt(match.index + match[0].length - 1);
    match = re.exec(bare);
  }
  return "";
};

/** The body of a block inside `text`, opened at `open` (a local index). */
const localBlock = (text, open) => {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  return "";
};

/** The body of `@variant pointer-coarse { … }` nested inside `body`, or "". */
const coarseBlock = (body) => {
  const at = body.indexOf("@variant pointer-coarse");
  if (at === -1) return "";
  return localBlock(body, body.indexOf("{", at));
};

const grain = ruleFor(".field-grain");

test("the grain keeps its tile and its weight", () => {
  // The grain is not what got removed: the same turbulence tile, at the same 6 %,
  // over the same field. Only its blend mode changes hands.
  assert.notEqual(grain, "", "no .field-grain rule: the field's grain is missing");
  assert.match(grain, /mix-blend-mode:\s*overlay/, "the grain's default blend must stay `overlay`");
  assert.match(grain, /opacity:\s*0?\.06\b/, "the grain's weight must stay 0.06");
  assert.match(grain, /background-image:\s*url\("data:image\/svg\+xml/, "the grain tile must stay");
  assert.match(grain, /position:\s*absolute/, "the grain must still cover the field");
});

test("a coarse pointer drops the grain's blend", () => {
  // `pointer-coarse` is the variant, not a hand-written query: the repo's one
  // vocabulary of pointer states (§13.3 S5), and it is the condition the owner
  // asked for ("en puntero grueso").
  const coarse = coarseBlock(grain);
  assert.notEqual(coarse, "", ".field-grain has no pointer-coarse block: the blend is still paid");
  assert.match(
    coarse,
    /mix-blend-mode:\s*normal/,
    "the coarse-pointer grain must fall back to source-over",
  );
  // Nothing else may change in that block: this is a compositing fix, and a
  // second declaration there would be an invitation to hide the grain instead.
  const declarations = [...coarse.matchAll(/([a-z-]+)\s*:/g)].map((match) => match[1]);
  assert.deepEqual(
    declarations,
    ["mix-blend-mode"],
    `the coarse-pointer block must declare mix-blend-mode only, saw ${declarations.join(", ")}`,
  );
});

test("the blend is the only blend the field pays for on a coarse pointer", () => {
  // A blend anywhere in the field group rebuilds the same raster unit, so the
  // fix is worthless if another one is (re)introduced next to it.
  const fieldSelectors = [
    ".bocanada-field",
    ".bocanada-lattice",
    ".bocanada-flares",
    ".field-glow",
    ".field-grain",
  ];
  const blended = fieldSelectors.filter((selector) => {
    const body = ruleFor(selector);
    if (!/mix-blend-mode\s*:/.test(body)) return false;
    // Only the grain is allowed one, and only outside the coarse-pointer block.
    return !(selector === ".field-grain" && coarseBlock(body) !== "");
  });
  assert.deepEqual(blended, [], `field layers outside the grain carry a blend: ${blended.join(", ")}`);
});

test("the strike is one slow bell, and reduced motion still drops it", () => {
  // C3 (peak 0.5 → 0.3) was measured and rejected on cost, and it came back the
  // long way round: four owner briefs later the peak is 0.6, because 0.18, 0.3,
  // 0.45 and 0.5 read as tenue (L8–L12), and the bell is one keyframe for every
  // band with a quarter-cycle up, a quarter down and half the cycle at rest. What
  // this test keeps is the shape and the amplitude, so neither can drift back.
  const peak = /@keyframes flare\s*\{[\s\S]*?50%\s*\{\s*opacity:\s*([\d.]+)/.exec(bare);
  assert.ok(peak, "no 50% stop in @keyframes flare");
  assert.equal(Number(peak[1]), 0.6, `the crest is ${peak[1]}; 0.6 is the bloom`);
  const rest = /@keyframes flare\s*\{\s*0%,\s*100%\s*\{\s*opacity:\s*([\d.]+)/.exec(bare);
  assert.ok(rest, "no rest stops in @keyframes flare");
  assert.ok(Number(rest[1]) > 0, "the field must never go fully dark");
  // The crest is a bloom inside a slow tide, never a flat window: the tide stop
  // (0.16 at 38 %/62 %) is what lets the motion stay slow while only a few dots
  // are bright at once (L10).
  const tide = /@keyframes flare\s*\{[\s\S]*?38%,\s*62%\s*\{\s*opacity:\s*([\d.]+)/.exec(bare);
  assert.ok(tide, "no tide stops in @keyframes flare (38 %/62 %)");
  assert.ok(
    Number(tide[1]) > Number(rest[1]) && Number(tide[1]) < 0.25,
    `the tide stop must sit between the rest and the crest, saw ${tide[1]}`,
  );

  // Reduced motion still drops the strikes entirely — the one state the sheet is
  // allowed to remove them in, and it must not be the phone's own band.
  const at = bare.indexOf("@media (prefers-reduced-motion: reduce) {");
  assert.notEqual(at, -1, "no reduced-motion block");
  const reduced = blockAt(bare.indexOf("{", at));
  assert.match(reduced, /\.flare\s*\{\s*display:\s*none/, "reduced motion must still drop the strikes");
});

test("the flares stop painting while the reader is flinging", () => {
  // 36 elements on a FIXED viewport-sized layer, each breathing opacity and
  // scale for its whole life: the largest per-frame raster the page asks for,
  // charged exactly when the compositor is behind. Frames that slow are what
  // leaves a flick showing only the background (odd/tasks/mobile-motion-perf.md
  // L13: flares off won every paired phone test). Paused, not removed.
  const css = readFileSync(path.join(ROOT, "src/styles/globals.css"), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  assert.match(
    css,
    /html\.fling \.flare \{\s*animation-play-state:\s*paused;/,
    "a fling must stop the flare breath: it is the field's whole frame bill",
  );
});
