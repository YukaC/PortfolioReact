import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CELL_PX, DOT_INSET_PX, FIELD_FLARES } from "./field-flares.js";

/**
 * The identity layer's acceptance criteria, as numbers (audit.md §18.4, §18.8,
 * §19.2, §19.4; feature spec S5, T12's cadence rework, and the tempo lock of
 * `odd/tasks/flare-tempo.md` S1–S4).
 *
 * No DOM, no browser, no clock: the table is a literal, the curve is read out of
 * `@keyframes` as text, and the simulation below is a pure function of the two.
 *
 * Two criteria carry the whole design:
 *
 *   1. a flare lands on the centre of a dot — a fixed 48 px lattice puts its dots
 *      at `n * 48 + 24`, so a position in percentages cannot land on one (§19.3,
 *      commit `8164756`);
 *   2. the field is a shimmer, not a blink — at every density band the number of
 *      flares past the "lit" threshold stays inside 1–4, and the field never goes
 *      completely dark. The owner's report was that the strikes felt abrupt and
 *      sporadic; both halves of that are pinned below, so neither can come back;
 *   3. the shimmer is in tempo — 128 BPM, the beat of the song the field is named
 *      after, with every phase and every peak on that grid (S1–S3).
 *
 * The opacity curve is interpolated **linearly** between the keyframe stops even
 * though the stylesheet eases each segment (`--ease-in-out-field`). That makes
 * this model a superset of what the browser paints: a threshold crossing happens
 * later on an eased ramp than on a linear one, so the simulated count is never
 * lower than the real one. Passing here is therefore conservative — the eased
 * curve can only be calmer — and `field-flares.test.js` never has to reimplement
 * a cubic-bezier.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const css = readFileSync(path.join(ROOT, "src/styles/globals.css"), "utf8");

/**
 * The tempo, read out of the stylesheet instead of restated here (S1). The sheet
 * is the only place it lives — the table carries phases in grid slots, never
 * seconds — so the test derives its numbers from the same four declarations the
 * browser resolves.
 */
const declared = (name) => {
  const match = new RegExp(`${name}:\\s*([^;]+);`).exec(css);
  return match ? match[1].trim() : "";
};
const BPM_DECL = declared("--bpm");
const BEAT_DECL = declared("--beat");
const BREATH_DECL = declared("--breath");
const GRID_DECL = declared("--grid");

const BPM = Number(BPM_DECL);
/** The multiplier in `--breath: calc(8 * var(--beat))` — two 4/4 bars (S2). */
const BREATH_BEATS = Number(/calc\(\s*([\d.]+)\s*\*\s*var\(--beat\)/.exec(BREATH_DECL)?.[1]);
/** The divisor in `--grid: calc(var(--beat) / 8)` — a 32nd note (S3). */
const GRID_DIVISOR = Number(/calc\(\s*var\(--beat\)\s*\/\s*([\d.]+)\s*\)/.exec(GRID_DECL)?.[1]);
const BEAT_S = 60 / BPM;
const BREATH_S = BREATH_BEATS * BEAT_S;
const GRID_S = BEAT_S / GRID_DIVISOR;

/**
 * The table as the page plays it: the browser gets `--delay: calc(slot * var(--grid))`
 * and the cycle from `--breath`, so the phase in seconds is `slot * --grid`.
 */
const FLARES = FIELD_FLARES.map((flare) => ({
  ...flare,
  dur: BREATH_S,
  delay: flare.slot * GRID_S,
}));

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
 * The one keyframe that applies at each density: `.flare` is the default (the 36
 * dots a screen wider than 1600 px shows) and each narrower band overrides
 * `animation-name` in the same media query that hides its extra dots.
 */
const KEYFRAME_OF_BAND = { 36: "flare", 22: "flare-22", 12: "flare-12", 6: "flare-6" };

/** What "lit" means: the threshold the cadence budget and the probe count. */
const LIT_THRESHOLD = 0.05;

/** §19.2: between 1 and 4 flares are lit at once, never more. */
const PEAK_CEILING = 4;

/** One certified minute of steady state, sampled at 20 ms. */
const HORIZON_MS = 60_000;
const STEP_MS = 20;

/**
 * Past `max(delay) + max(dur)` every flare is in its steady cycle; before that it
 * is still starting, which is the page load and not the field.
 */
const WARM_MS =
  Math.max(...FLARES.map((flare) => flare.delay)) * 1000 +
  Math.max(...FLARES.map((flare) => flare.dur)) * 1000;

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

/**
 * The stops of a keyframe as `[percent, opacity]`, sorted. One stop can name
 * several percentages (`0%, 47.1%, 52.9%, 100% { … }`), which is how the flat
 * part of the cycle is written.
 */
const keyframeStops = (name) => {
  const body = blockOf(`@keyframes ${name}`);
  assert.notEqual(body, "", `@keyframes ${name} is missing from globals.css`);
  const stops = [];
  for (const block of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const opacity = /opacity:\s*([\d.]+)/.exec(block[2]);
    if (!opacity) continue;
    for (const selector of block[1].split(",")) stops.push([parseFloat(selector), parseFloat(opacity[1])]);
  }
  return stops.sort((a, b) => a[0] - b[0]);
};

/** The opacity of a flare at `percent` of its cycle, linearly between stops. */
const opacityAt = (stops) => (percent) => {
  for (let i = 1; i < stops.length; i += 1) {
    if (percent <= stops[i][0]) {
      const [p0, o0] = stops[i - 1];
      const [p1, o1] = stops[i];
      return p1 === p0 ? o1 : o0 + ((o1 - o0) * (percent - p0)) / (p1 - p0);
    }
  }
  return stops[stops.length - 1][1];
};

const saturation = (ms, flare) => {
  const elapsed = ms - flare.delay * 1000;
  if (elapsed < 0) return 0;
  return ((elapsed / (flare.dur * 1000)) % 1) * 100;
};

/**
 * A density band over the certified horizon: the count of lit flares, and the
 * time the whole field spends with none of them lit.
 */
const simulate = (count, name) => {
  const opacity = opacityAt(keyframeStops(name));
  const band = FLARES.slice(0, count);
  let min = Infinity;
  let max = 0;
  let sum = 0;
  let samples = 0;
  let darkMs = 0;
  let faintest = Infinity;
  for (let ms = WARM_MS; ms <= WARM_MS + HORIZON_MS; ms += STEP_MS) {
    let lit = 0;
    let total = 0;
    for (const flare of band) {
      const value = opacity(saturation(ms, flare));
      if (value > LIT_THRESHOLD) lit += 1;
      total += value;
    }
    if (lit < min) min = lit;
    if (lit > max) max = lit;
    if (lit === 0) darkMs += STEP_MS;
    if (total < faintest) faintest = total;
    sum += lit;
    samples += 1;
  }
  return { count, min, max, mean: sum / samples, darkMs, faintest };
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

test("the tempo is the song's: 128 BPM, one breath every 8 beats", () => {
  // S1: 128 is the number the owner named, and it is the same number the sworn
  // script resolves — the sheet states it once and everything else is a `calc`
  // off it, so there is no second copy of the tempo to drift.
  assert.equal(BPM, 128, "the field's tempo must be the 128 BPM of the song");
  assert.match(BEAT_DECL, /^calc\(\s*60s\s*\/\s*var\(--bpm\)\s*\)$/, "--beat must be 60s / --bpm, not a hand-written decimal");
  assert.ok(Math.abs(BEAT_S - 0.46875) < 1e-9, `one beat must be 0.46875 s, saw ${BEAT_S}`);
  // S2: 8 beats are exactly two 4/4 bars — 16 breaths a minute, the rate of a
  // calm human breath. One breath per beat would be 2.13 Hz, and 36 dots cannot
  // pulse that fast and stay inside 1–4 lit at once.
  assert.equal(BREATH_BEATS, 8, "one breath must be two 4/4 bars");
  assert.ok(Math.abs(BREATH_S - 3.75) < 1e-9, `a breath must be 3.75 s, saw ${BREATH_S}`);
  assert.equal(BREATH_BEATS % 4, 0, "a breath has to be whole bars, or its peak leaves the beat");
  // S3: the phases are dealt on a musical subdivision, not on seconds — a 32nd
  // note, 58.59 ms at 128 BPM.
  assert.equal(GRID_DIVISOR, 8, "the phase grid must be a 32nd note");
  assert.ok(Math.abs(GRID_S - 0.05859375) < 1e-9, `one grid step must be 58.59 ms, saw ${GRID_S}`);

  // And the flare reads both: the cycle comes from `--breath`, never from a
  // per-instance `--dur`, which is what keeps the JSX carrying only the phase.
  assert.match(
    blockOf(".flare {"),
    /animation:[^;]*var\(--breath[^;]*infinite/,
    ".flare must take its cycle from --breath, not from a per-instance --dur",
  );
  assert.equal(
    /--dur\s*:/.test(css),
    false,
    "a per-flare --dur would be a second copy of the tempo",
  );
});

test("every flare breathes once per breath, on the tempo grid", () => {
  // S3: the onset is a whole slot of the grid, and the peak sits half a breath
  // later — 4 whole beats — so the peak is on the grid too. The field is in
  // tempo, not near it.
  const offGrid = [];
  for (const [index, flare] of FLARES.entries()) {
    if (!Number.isInteger(flare.slot)) {
      offGrid.push(`${index}: slot ${flare.slot} is not whole`);
      continue;
    }
    if (!(flare.slot >= 0 && flare.delay < BREATH_S)) {
      offGrid.push(`${index}: slot ${flare.slot} is outside the breath`);
    }
    const peak = (flare.delay + flare.dur / 2) / GRID_S;
    if (Math.abs(peak - Math.round(peak)) > 1e-6) {
      offGrid.push(`${index}: peak at ${peak.toFixed(3)} grid steps is not on the grid`);
    }
  }
  assert.deepEqual(offGrid, [], `flares off the tempo grid:\n${offGrid.join("\n")}`);

  // Half a breath is a whole number of beats, which is what lets a grid-aligned
  // onset put its peak on the grid as well.
  const halfBreathBeats = BREATH_S / 2 / BEAT_S;
  assert.ok(
    Math.abs(halfBreathBeats - Math.round(halfBreathBeats)) < 1e-9,
    `half a breath is ${halfBreathBeats} beats; it has to be whole`,
  );

  // Distinct phases are what keep 36 dots from turning into one synchronised
  // strobe; a breath holds 64 grid slots for 36 flares.
  const slots = FLARES.map((flare) => flare.slot);
  assert.equal(new Set(slots).size, SPEC_COUNT, "--delay must not repeat");
  assert.ok(
    Math.max(...slots) < BREATH_BEATS * GRID_DIVISOR,
    "a phase must sit inside the slots of one breath",
  );
});

test("every prefix is spread over the cycle, not bunched at its start", () => {
  // The delays are one slot each of the breath's grid, dealt in golden-ratio
  // order, so the six a phone shows are as spread as the 36 a wide screen shows.
  // Without this a prefix sits in a burst and then leaves the field dark.
  for (const band of BANDS) {
    const prefix = FLARES.slice(0, band.count).map((flare) => flare.delay);
    const span = Math.max(...prefix) - Math.min(...prefix);
    const floor = (BREATH_S * band.count * 0.8) / SPEC_COUNT;
    assert.ok(
      span >= floor,
      `the first ${band.count} delays span ${span.toFixed(3)} s of ${BREATH_S} s (floor ${floor.toFixed(3)} s)`,
    );
  }
});

test("the pulse is a soft swell: eased, low peak, never zero", () => {
  const rule = blockOf(".flare {");
  assert.notEqual(rule, "", "no .flare rule in globals.css");
  // No step and no linear ramp: the attack and the decay are eased.
  assert.match(
    rule,
    /animation:[^;]*var\(--ease-in-out-field\)[^;]*infinite/,
    ".flare must run its bell on the symmetric easing curve, not linear or steps()",
  );
  assert.equal(/steps\(/.test(rule), false, "a stepped animation is the blink this rework removed");
  assert.match(css, /--ease-in-out-field:\s*cubic-bezier\(/, "the easing token is not declared");

  for (const name of Object.values(KEYFRAME_OF_BAND)) {
    const stops = keyframeStops(name);
    const levels = [...new Set(stops.map(([, opacity]) => opacity))].sort((a, b) => a - b);
    // Two levels only: rest and peak. The old curve stopped at 1, dipped to 0.6
    // and dropped to 0 — three levels in a 8 % window, which read as a blink.
    assert.deepEqual(
      levels,
      [0.04, 0.5],
      `${name}: the pulse must have a rest level and one peak, saw ${levels.join(" / ")}`,
    );
    const rest = levels[0];
    const peak = levels[levels.length - 1];
    // Never zero: the field keeps a faint light on every dot between strikes, so
    // "completely dark" is not a state the stylesheet can reach.
    assert.ok(rest > 0, `${name}: the rest opacity must stay above zero`);
    assert.ok(peak < 1, `${name}: the peak must be under 1 (it was a hard flash at 1)`);
    // The bell climbs once and comes down once: no second hump to read as a
    // double blink.
    const values = stops.map(([, opacity]) => opacity);
    const peakAt = values.indexOf(Math.max(...values));
    assert.ok(
      values.slice(0, peakAt).every((value, i, all) => i === 0 || value >= all[i - 1]),
      `${name}: the attack must be monotone`,
    );
    assert.ok(
      values.slice(peakAt).every((value, i, all) => i === 0 || value <= all[i - 1]),
      `${name}: the decay must be monotone`,
    );
  }
});

test("the field stays calm: 1–4 lit at once, and never fully dark", () => {
  const bands = BANDS.map((band) => simulate(band.count, KEYFRAME_OF_BAND[band.count]));

  for (const band of bands) {
    // The audit's ceiling, at every density: 1–4 strikes at a time (§19.2). The
    // old table certified a peak of 6 here.
    assert.ok(
      band.max <= PEAK_CEILING,
      `${band.count} flares: at most ${PEAK_CEILING} may be lit at once, saw ${band.max}`,
    );
    // The audit's arithmetic band: 36 dots at ~6 % duty is a mean of ~2, which is
    // the calm field it asks for against the ~18 glows the shader held.
    assert.ok(
      band.mean >= 1 && band.mean <= 4,
      `${band.count} flares: mean lit ${band.mean.toFixed(2)} is outside 1–4`,
    );
    // The floor that holds at every density and at every instant: every flare
    // rests at 0.04, so the field's total light never reaches zero.
    assert.ok(band.faintest > 0, `${band.count} flares: the field went to zero light`);
  }

  // Never completely dark. Two floors, because only the first one is a theorem:
  //
  //   • the *light* floor — every flare rests at 0.04, so the field's total
  //     opacity can never reach zero. That is a property of the stylesheet and
  //     holds at every instant, for ever; it is asserted per band above.
  //   • the *strike* floor — at least one flare is above the lit threshold. How
  //     often that fails is a property of the 36 phases, so it is budgeted here
  //     over the certified minute rather than promised: 5 % of the minute. The
  //     same minute measured in the browser (a Playwright probe over the real
  //     eased curve, 100 ms sampling) came out at 1.2 % of instants at 390,
  //     3.3 % at 1440 and 3.8 % at 1920; the shipped curve was dark for 62.8 %
  //     of the same minute at 390 and 9.8 % at 1440. The model below samples on
  //     its own phase grid, so it is a budget, not a stopwatch.
  for (const band of bands) {
    assert.ok(
      band.darkMs <= 0.05 * HORIZON_MS,
      `${band.count} flares: no strike for ${band.darkMs} ms of the minute (budget ${0.05 * HORIZON_MS} ms)`,
    );
  }

  // And the band gets a longer swell the sparser it is: the strike on a phone is
  // a 1.8 s breath, the one on the 36-dot field 0.34 s. Same count, different
  // window — that is how "1–4 at once" survives at 6 and at 36 dots, because the
  // count is `visible dots × duty cycle` and no window can beat that arithmetic.
  const window = (name) => {
    const stops = keyframeStops(name);
    const opacity = opacityAt(stops);
    let lit = 0;
    for (let percent = 0; percent < 100; percent += 0.05) {
      if (opacity(percent) > LIT_THRESHOLD) lit += 0.05;
    }
    return lit;
  };
  const seconds = (count) => (window(KEYFRAME_OF_BAND[count]) / 100) * BREATH_S;
  assert.ok(seconds(6) > seconds(22), "the phone's strike must be the longest");
  assert.ok(seconds(36) < seconds(12), "the dense field must carry the shortest one");
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

  // Each step carries the cadence for the dots it leaves visible: the same
  // breakpoint that hides the surplus switches the bell (see the cadence test).
  for (const [width, name] of [
    ["100rem", "flare-22"],
    ["64rem", "flare-12"],
    ["40rem", "flare-6"],
  ]) {
    const block = blockOf(`@media (max-width: ${width})`);
    assert.match(block, new RegExp(`animation-name:\\s*${name}`), `the ${width} band must run ${name}`);
  }
});
