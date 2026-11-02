import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * T6's density decision, pinned so it cannot be undone by a well-meaning
 * "fewer flares must be cheaper" change (feature spec S3, S4).
 *
 * The phone measurement (moto g82 5G, Brave, 352×781 @DPR 3.075, the paired
 * runner in `.perf/phone/`) put three density variants against the same baseline
 * in the same session, eleven seconds per leg, same gesture path:
 *
 *   phone band    p95 (median of the legs)   long tasks / leg
 *   6 strikes     108.9 ms                   4-10
 *   4 strikes     100.5 ms                   2-3
 *   3 strikes     108.8 ms                   2-9
 *   0 strikes      75.4 ms                   0
 *
 * Trimming the band buys nothing measurable (the 6 → 4 row is inside the run to
 * run scatter the 6 → 3 row exposes), and dropping the strikes entirely recovers
 * the whole win. The cost is not proportional to the strike count: it is paid for
 * as soon as one disc is painted, and the real culprit is the grain's `overlay`
 * blend (`flare-identity.test.js`). So the band keeps its six strikes — the
 * identity layer is not the lever — and this file pins the ladder as it is.
 *
 * Why no pixel-level RED: the property under test is the *count* of visible
 * strikes, and the count is a property of the stylesheet text, not of a running
 * browser. The test therefore reads the media queries the way the cascade does —
 * as cumulative `max-width` steps with an `nth-child` cut and a bell per band.
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

/** The body of the first block opened by `opener`, or "" when absent. */
const blockOf = (opener) => {
  const at = bare.indexOf(opener);
  if (at === -1) return "";
  return blockAt(bare.indexOf("{", at));
};

/**
 * The density ladder as the cascade reads it: every `@media (max-width: …)`
 * block that hides flares, with the child it starts hiding at and the bell it
 * switches the band to.
 */
const ladder = (() => {
  const bands = [];
  const re = /@media \(max-width: ([\d.]+)rem\) \{/g;
  let match = re.exec(bare);
  while (match !== null) {
    const body = blockAt(bare.indexOf("{", match.index));
    const cut = /\.flare:nth-child\(n \+ (\d+)\)\s*\{[^}]*display:\s*none/.exec(body);
    if (cut) {
      const bell = /\.flare\s*\{[^}]*animation-name:\s*([a-z0-9-]+)/.exec(body);
      bands.push({
        maxRem: Number(match[1]),
        cut: Number(cut[1]),
        bell: bell ? bell[1] : null,
      });
    }
    match = re.exec(bare);
  }
  return bands;
})();

test("the phone band still carries all six strikes", () => {
  // Six is the count the identity layer serves inside 352×781 and the count the
  // measurement above says is not the problem.
  const phone = ladder.find((band) => band.maxRem === 40);
  assert.ok(phone, "no `max-width: 40rem` density band: the phone keeps all 36 flares");
  assert.equal(phone.cut, 7, `the phone band hides from child ${phone.cut}; the sixth must stay visible`);
  assert.equal(phone.bell, "flare-6", "the phone band must keep its own bell");
});

test("the density ladder is the documented six / twelve / twenty-two / thirty-six", () => {
  assert.deepEqual(
    ladder.map((band) => band.maxRem),
    [100, 64, 40],
    "the density steps must be the three cumulative max-width bands",
  );
  const visible = [36, ...ladder.map((band) => band.cut - 1)];
  assert.deepEqual(visible, [36, 22, 12, 6], `visible flares per band: ${visible.join(" / ")}`);
  // Cumulative, never two-sided: a fractional viewport has to land inside exactly
  // one band instead of falling between two ranges and getting all 36.
  const steps = ladder.map((band) => band.maxRem);
  steps.forEach((step, i) => {
    if (i > 0) assert.ok(step < steps[i - 1], "the density bands must tighten, not repeat");
  });
  assert.deepEqual(
    ladder.map((band) => band.bell),
    ["flare-22", "flare-12", "flare-6"],
    "one bell per density band, switched in the same query that hides the extra dots",
  );
});

test("nothing but a density band (or reduced motion) hides a strike", () => {
  // The no-script default has to be the full field: `display: none` on `.flare`
  // is allowed in a density band and in the reduced-motion reset, nowhere else.
  const offenders = [];
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let match = ruleRe.exec(bare);
  while (match !== null) {
    const selectors = match[1].split(",").map((one) => one.trim());
    const body = match[2];
    if (selectors.includes(".flare") && /display:\s*none/.test(body)) {
      const before = bare.slice(0, match.index);
      const inBand = /@media \(max-width: [\d.]+rem\) \{/.test(before.slice(before.lastIndexOf("@media")));
      const inReduced = /@media \(prefers-reduced-motion: reduce\) \{/.test(
        before.slice(before.lastIndexOf("@media")),
      );
      if (!inBand && !inReduced) offenders.push(body.trim().replace(/\s+/g, " "));
    }
    match = ruleRe.exec(bare);
  }
  assert.deepEqual(offenders, [], `a .flare rule hides the strikes outside a density band:\n${offenders.join("\n")}`);

  // And the layer itself is never hidden: it is the identity, and the ablation
  // that hides it lives in the meter, not in the shipped sheet.
  assert.equal(
    /\.bocanada-flares\s*\{[^}]*display:\s*none/.test(bare),
    false,
    ".bocanada-flares must never be display:none in the stylesheet",
  );
});

test("the flare layer stays a paint job: no promotion, no blend, no filter", () => {
  // The candidates that were measured and rejected. `will-change` on the disc or
  // on its layer changed nothing (p95 100.3 / 100.5 against a 108.9 baseline), and
  // a permanent compositor hint on a fixed, viewport-sized layer is exactly the
  // kind of offscreen surface this page's budget does not have room for.
  for (const selector of [".bocanada-flares", ".flare"]) {
    const body = blockOf(`${selector} {`);
    assert.notEqual(body, "", `no ${selector} rule`);
    assert.equal(
      /will-change\s*:/.test(body),
      false,
      `${selector} must not carry a compositor hint: it measured no gain`,
    );
    assert.equal(/mix-blend-mode\s*:/.test(body), false, `${selector} must not take a blend`);
    assert.equal(/(^|[^-])filter\s*:/.test(body), false, `${selector} must not carry a filter`);
  }
});
