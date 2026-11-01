import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CELL_PX, DOT_INSET_PX, FIELD_FLARES } from "./field-flares.js";

/**
 * The identity layer's acceptance criteria, as numbers (audit.md §18.4, §18.8,
 * §19.2, §19.4; feature spec S5). No DOM, no browser, no clock: the table is a
 * literal and the simulation below is a pure function of it.
 *
 * The one criterion that is not decoration is the first: a flare has to land on
 * the centre of a dot. A fixed 48 px lattice puts its dots at `n * 48 + 24` from
 * the tile origin, so a position in percentages of the viewport cannot land on
 * one — that is what the reverted attempt got wrong (§19.3, commit `8164756`).
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const css = readFileSync(path.join(ROOT, "src/styles/globals.css"), "utf8");

/** The spec's lattice, spelled out here so the table cannot grade itself. */
const SPEC_CELL = 48;
const SPEC_DOT = 24;
const SPEC_COUNT = 36;

/** §18.4: 6 / 12 / 22 / 36 flares inside 390×844 / 1024×768 / 1600×900 / 1920×1080. */
const BANDS = [
  { count: 6, width: 390, height: 844, cellsX: 8, cellsY: 17 },
  { count: 12, width: 1024, height: 768, cellsX: 21, cellsY: 16 },
  { count: 22, width: 1600, height: 900, cellsX: 33, cellsY: 18 },
  { count: 36, width: 1920, height: 1080, cellsX: 40, cellsY: 22 },
];

/**
 * The bright phase of `@keyframes flare`: the only span where `opacity > 0`, so
 * it is what "lit" means for the cadence budget below (≈ 0.6 s at 7–11 s).
 */
const BRIGHT_FROM = 0.9;
const BRIGHT_TO = 0.98;

/** One minute of steady state, sampled at 20 ms — a reading pause, not a proof. */
const HORIZON_MS = 60_000;
const STEP_MS = 20;

/**
 * The body of the first block opened by `opener`, balanced to its closing brace.
 * `css.match(/rule\s*\{([^}]*)\}/)` stops at the first inner block, which is
 * every rule that has one.
 */
const blockOf = (opener) => {
  const at = css.indexOf(opener);
  if (at === -1) return "";
  const open = css.indexOf("{", at);
  if (open === -1) return "";
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return "";
};

test("the table is 36 flares on the lattice the stylesheet draws", () => {
  assert.equal(FIELD_FLARES.length, SPEC_COUNT, "the identity layer serves 36 flares");
  assert.equal(CELL_PX, SPEC_CELL, "the cell must be the 48px the stylesheet tiles");
  assert.equal(DOT_INSET_PX, SPEC_DOT, "the dot sits 24px inside its cell");
});

test("every flare sits exactly on a dot centre", () => {
  const offGrid = [];
  for (const [index, flare] of FIELD_FLARES.entries()) {
    // A cell index that is not a whole number is a percentage in disguise.
    if (!Number.isInteger(flare.cx) || !Number.isInteger(flare.cy)) {
      offGrid.push(`${index}: cell ${flare.cx},${flare.cy} is not an integer`);
      continue;
    }
    const centreX = flare.cx * SPEC_CELL + SPEC_DOT;
    const centreY = flare.cy * SPEC_CELL + SPEC_DOT;
    // The centre of a dot is `n * 48 + 24` from the tile origin: the offset from
    // that origin (24 ) has to come back exactly, with no rounding left over.
    if ((centreX - SPEC_DOT) % SPEC_CELL !== 0 || centreX % SPEC_CELL !== SPEC_DOT) {
      offGrid.push(`${index}: x = ${centreX}px is off the grid`);
    }
    if ((centreY - SPEC_DOT) % SPEC_CELL !== 0 || centreY % SPEC_CELL !== SPEC_DOT) {
      offGrid.push(`${index}: y = ${centreY}px is off the grid`);
    }
  }
  assert.deepEqual(offGrid, [], `flares that miss the lattice:\n${offGrid.join("\n")}`);
});

test("every prefix fits its viewport band", () => {
  for (const band of BANDS) {
    const prefix = FIELD_FLARES.slice(0, band.count);
    const outside = prefix.filter((flare) => {
      const centreX = flare.cx * SPEC_CELL + SPEC_DOT;
      const centreY = flare.cy * SPEC_CELL + SPEC_DOT;
      return (
        centreX >= band.width ||
        centreY >= band.height ||
        flare.cx >= band.cellsX ||
        flare.cy >= band.cellsY
      );
    });
    assert.deepEqual(
      outside.map((flare) => `${flare.cx},${flare.cy}`),
      [],
      `the first ${band.count} flares do not all fit inside ${band.width}×${band.height}`,
    );
  }
});

test("no two flares share a cell", () => {
  const seen = new Set();
  const duplicates = [];
  for (const flare of FIELD_FLARES) {
    const key = `${flare.cx},${flare.cy}`;
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
  }
  assert.deepEqual(duplicates, [], `cells used twice: ${duplicates.join(" ")}`);
});

test("cycles are distinct and inside the documented range", () => {
  const durations = FIELD_FLARES.map((flare) => flare.dur);
  const delays = FIELD_FLARES.map((flare) => flare.delay);
  const outOfRange = FIELD_FLARES.filter(
    (flare) =>
      !(flare.dur >= 7 && flare.dur <= 11) || !(flare.delay >= 0 && flare.delay <= 8),
  );
  assert.deepEqual(
    outOfRange.map((flare) => `${flare.cx},${flare.cy}: ${flare.dur}s/${flare.delay}s`),
    [],
    "--dur must be 7–11 s and --delay 0–8 s",
  );
  // Distinct cycles are the whole point: a repeated period is a synchronised
  // strobe, which is the field this change is getting away from.
  assert.equal(new Set(durations).size, SPEC_COUNT, "--dur must not repeat");
  assert.equal(new Set(delays).size, SPEC_COUNT, "--delay must not repeat");
});

test("the field stays calm: 1–4 flares lit, never a crowd", () => {
  // The keyframe window this budget is measured against, so the constant above
  // cannot drift from the stylesheet without failing here first.
  const keyframes = blockOf("@keyframes flare");
  assert.match(keyframes, /90%/, "@keyframes flare lost its 90% stop");
  assert.match(keyframes, /98%/, "@keyframes flare lost its 98% stop");

  const litAt = (ms) => {
    let lit = 0;
    for (const flare of FIELD_FLARES) {
      if (ms < flare.delay * 1000) continue;
      const phase = ((ms - flare.delay * 1000) / (flare.dur * 1000)) % 1;
      if (phase >= BRIGHT_FROM && phase <= BRIGHT_TO) lit += 1;
    }
    return lit;
  };

  // Steady state: before `max(delay) + max(dur)` a flare is still in its first
  // cycle (or parked at 0 %), which is the page load, not the field.
  const warmUp =
    Math.max(...FIELD_FLARES.map((flare) => flare.delay)) * 1000 +
    Math.max(...FIELD_FLARES.map((flare) => flare.dur)) * 1000;

  let max = 0;
  let sum = 0;
  let samples = 0;
  let insideTarget = 0;
  for (let ms = warmUp; ms <= warmUp + HORIZON_MS; ms += STEP_MS) {
    const lit = litAt(ms);
    if (lit > max) max = lit;
    sum += lit;
    samples += 1;
    if (lit >= 1 && lit <= 4) insideTarget += 1;
  }

  // Duty cycle arithmetic: 36 cycles of 8 % lit = 2.88 at any instant, which is
  // the "1–4 at once" the design asks for (the shader held ~18 continuously).
  const mean = sum / samples;
  assert.ok(mean >= 1 && mean <= 4, `mean lit ${mean.toFixed(2)} is outside 1–4`);
  assert.ok(
    Math.abs(mean - SPEC_COUNT * (BRIGHT_TO - BRIGHT_FROM)) <= 0.15,
    `mean lit ${mean.toFixed(2)} does not match 36 × 8 % of a cycle`,
  );
  // The pinned ceiling: distinct cycles decorrelate the flares, so the count is
  // a distribution around 2.88 and not a constant. Over the measured minute it
  // stays under a third of what the shader held, and in the 1–4 band most of the
  // time. A synchronous field would blow both numbers up at once.
  assert.ok(max <= 6, `at most 6 flares may be lit at once, saw ${max}`);
  const share = insideTarget / samples;
  assert.ok(share >= 0.9, `only ${(share * 100).toFixed(1)} % of instants had 1–4 lit`);
});

test("the stylesheet places flares by cell coordinate, not by percentage", () => {
  const rule = blockOf(".flare {");
  assert.notEqual(rule, "", "no .flare rule in globals.css");
  assert.match(
    rule,
    new RegExp(`left:\\s*calc\\(\\s*var\\(--cx\\)\\s*\\*\\s*${SPEC_CELL}px\\s*\\+\\s*${SPEC_DOT}px\\s*\\)`),
    ".flare must derive its x from --cx and the 48px cell",
  );
  assert.match(
    rule,
    new RegExp(`top:\\s*calc\\(\\s*var\\(--cy\\)\\s*\\*\\s*${SPEC_CELL}px\\s*\\+\\s*${SPEC_DOT}px\\s*\\)`),
    ".flare must derive its y from --cy and the 48px cell",
  );
  assert.equal(
    /left:\s*[\d.]+%|top:\s*[\d.]+%/.test(rule),
    false,
    "a percentage position cannot land on a fixed grid (§19.3)",
  );
  // Only the compositor may do work per frame.
  assert.match(rule, /animation:\s*flare/, ".flare must run the flare keyframes");
  // A permanent filter (or a permanent `will-change`) is a permanent offscreen
  // surface; the audit's budget for both is already spent elsewhere in the page.
  assert.equal(
    /(^|[^-])filter\s*:|will-change\s*:/.test(rule),
    false,
    ".flare must not carry a filter or a permanent compositor hint",
  );
  const animated = [...blockOf("@keyframes flare").matchAll(/([a-z-]+)\s*:/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(
    [...new Set(animated)].filter((property) => property !== "opacity" && property !== "transform"),
    [],
    "the flare may animate opacity and transform only — anything else repaints",
  );
});

test("the lattice is one viewport-sized raster in every state", () => {
  const rule = blockOf(".bocanada-lattice {");
  assert.notEqual(rule, "", "no .bocanada-lattice rule: the identity layer is missing");
  assert.match(rule, /position:\s*fixed/, "the lattice must not scroll with the document");
  assert.match(rule, /inset:\s*0/, "the lattice must be exactly the viewport");
  assert.match(rule, /contain:\s*strict/, "the lattice must be contained from the document");
  assert.match(rule, /background-size:\s*192px 192px,\s*48px 48px/, "one shared 48px cell");
  assert.match(rule, /background-position:\s*0 0/, "the tile origin must be pinned at 0 0");
  // The shader's grid left the shader in the same change; two lattices never
  // share an origin (§18.2). Named in comments, never defined or called.
  const ether = readFileSync(path.join(ROOT, "src/components/LiquidEther.jsx"), "utf8");
  assert.equal(/void\s+coverGrid\s*\(/.test(ether), false, "the shader still defines a lattice");
  assert.equal(/coverGrid\s*\(\s*uv/.test(ether), false, "the shader still draws its lattice");
});

test("density is a max-width cascade, never JavaScript", () => {
  // Cumulative max-width queries, not two-sided ranges: a fractional viewport
  // (zoom, a non-integer pixel ratio) must not fall between two of them.
  assert.match(css, /@media \(max-width: 100rem\) \{\s*\.flare:nth-child\(n \+ 23\)/, "22-flare step missing");
  assert.match(css, /@media \(max-width: 64rem\) \{\s*\.flare:nth-child\(n \+ 13\)/, "12-flare step missing");
  assert.match(css, /@media \(max-width: 40rem\) \{\s*\.flare:nth-child\(n \+ 7\)/, "6-flare step missing");
  assert.equal(
    /@media \(min-width: [\d.]+rem\)[^{]*\{[^}]*\.flare/.test(css),
    false,
    "a min-width flare rule reopens the gap a max-width cascade closes",
  );
});
