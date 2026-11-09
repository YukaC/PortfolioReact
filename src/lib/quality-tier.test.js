import test from "node:test";
import assert from "node:assert/strict";

import {
  FRAME_P95_BUDGET_MS,
  WATCHDOG_FRAMES,
  downgradeTier,
  frameP95,
  isSoftwareRenderer,
  resolveTier,
  watchdogTier,
} from "./quality-tier.js";

/**
 * What this protects: the tier is the only thing standing between a machine
 * without a GPU and a 87 ms frame (docs/audit.md §10 P0-3). A device that reports a
 * software rasterizer, a coarse pointer, saveData or a phone-width viewport must
 * never start in `full`, and the watchdog must be able to take the field down a
 * step — exactly one step, exactly once per overrun, and never back up: two
 * qualities trading places while the reader scrolls would read as a flicker,
 * not as an optimisation.
 *
 * Everything here is a pure function of a plain object, so the decisions are
 * pinned without a browser.
 */

/** A workstation: real GPU, wide window, no data saver, enough memory. */
const DESKTOP = {
  renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)",
  webgl: true,
  saveData: false,
  effectiveType: "4g",
  pointerCoarse: false,
  width: 1440,
  deviceMemory: 8,
  hardwareConcurrency: 12,
};

const framesAt = (ms, count = WATCHDOG_FRAMES) => Array.from({ length: count }, () => ms);

test("a software renderer is static: no canvas, no `three` download", () => {
  const tier = resolveTier({
    ...DESKTOP,
    renderer: "Google SwiftShader",
  });
  assert.notEqual(tier, "full", "SwiftShader asked for the full simulation");
  // §18.6/§21.3: a CPU rasterizer cannot hold a 24 ms frame whatever the
  // resolution, and `static` is the only tier that mounts no canvas at all —
  // the measured SwiftShader scroll was 283 ms p95 with the canvas up against
  // 21 ms for the CSS field. The lattice and its strikes are CSS, so nothing
  // the identity layer draws is lost.
  assert.equal(tier, "static", "a software rasterizer must not spend a canvas");
});

test("every software rasterizer resolves to static, not to lite", () => {
  for (const renderer of [
    "Google SwiftShader",
    "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))",
    "llvmpipe (LLVM 15.0.7, 256 bits)",
    "Mesa softpipe",
    "Mesa swrast",
    "Microsoft Basic Render Driver",
  ]) {
    assert.equal(resolveTier({ ...DESKTOP, renderer }), "static", `${renderer} was not static`);
  }
});

test("every known software rasterizer is recognised", () => {
  for (const renderer of [
    "Google SwiftShader",
    "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))",
    "llvmpipe (LLVM 15.0.7, 256 bits)",
    "Mesa softpipe",
    "Mesa swrast",
    "Microsoft Basic Render Driver",
  ]) {
    assert.equal(isSoftwareRenderer(renderer), true, `${renderer} was not recognised`);
  }
  assert.equal(isSoftwareRenderer(DESKTOP.renderer), false);
  // A hidden renderer string is not evidence of a slow one.
  assert.equal(isSoftwareRenderer(""), false);
});

test("a coarse pointer or a phone-width viewport is static", () => {
  assert.equal(resolveTier({ ...DESKTOP, pointerCoarse: true }), "static");
  assert.equal(resolveTier({ ...DESKTOP, width: 390 }), "static");
});

test("saveData is respected", () => {
  assert.equal(resolveTier({ ...DESKTOP, saveData: true }), "static");
});

test("a full desktop is full", () => {
  assert.equal(resolveTier(DESKTOP), "full");
  // No environment at all still resolves, and it resolves to the richest tier:
  // a browser that hides every signal is not punished for it.
  assert.equal(resolveTier(), "full");
});

test("the watchdog downgrades exactly one tier when p95 is over budget", () => {
  const slow = framesAt(FRAME_P95_BUDGET_MS + 10);
  assert.equal(frameP95(slow), FRAME_P95_BUDGET_MS + 10);

  assert.equal(watchdogTier("full", slow), "lite", "one overrun must cost one tier, not two");
  assert.equal(watchdogTier("lite", slow), "static");
  assert.equal(watchdogTier("static", slow), "static", "static is the floor");
});

test("the watchdog never promotes and never moves on frames inside the budget", () => {
  const fast = framesAt(FRAME_P95_BUDGET_MS - 1);
  assert.equal(watchdogTier("lite", fast), "lite");
  assert.equal(watchdogTier("static", fast), "static");

  // A downgraded device that recovers keeps the cheaper tier for the session.
  assert.equal(watchdogTier("lite", framesAt(8)), "lite");
});

test("the watchdog is a one-step move per sample, not a loop", () => {
  let tier = "full";
  tier = watchdogTier(tier, framesAt(60));
  assert.equal(tier, "lite");
  tier = watchdogTier(tier, framesAt(60));
  assert.equal(tier, "static");
  tier = watchdogTier(tier, framesAt(60));
  assert.equal(tier, "static");
});

test("the watchdog ignores an empty sample", () => {
  assert.equal(watchdogTier("full", []), "full");
  assert.equal(watchdogTier("full", undefined), "full");
  assert.equal(downgradeTier("full"), "lite");
});
