import test from "node:test";
import assert from "node:assert/strict";

import { renderGateReport } from "./gate-report.js";

/**
 * What this protects: the quality gates are only worth running if a failure
 * cannot be reported as success. `pnpm test:all` was `pnpm lint && … && …`, so a
 * failing gate skipped the rest, and piping it through `tail -40` reported
 * `tail`'s status instead of the gate's — a real false green in this repo. The
 * report is therefore a pure function of the collected results: it owns the exit
 * code, it names every gate that ran, and it keeps the failing output where the
 * reader can see it. No filesystem, no child process, so the decision is pinned
 * without running a single gate.
 */

const pass = (name, seconds = 1.2) => ({ name, ok: true, exitCode: 0, seconds });
const fail = (name, seconds = 0.4, detail) => ({ name, ok: false, exitCode: 1, seconds, detail });

test("every gate passing gives code 0 and the counts", () => {
  const { code, text } = renderGateReport([pass("lint", 1.2), pass("unit", 8)]);

  assert.equal(code, 0);
  assert.equal(
    text,
    [
      "PASS  lint (exit 0, 1.2s)",
      "PASS  unit (exit 0, 8.0s)",
      "GATE SUMMARY: 2 pass, 0 fail — EXIT 0",
    ].join("\n"),
  );
});

test("one failing gate gives code 1 and names that gate", () => {
  const { code, text } = renderGateReport([pass("lint", 0.9), fail("css")]);

  assert.equal(code, 1);
  assert.match(text, /^FAIL {2}css \(exit 1, 0\.4s\)$/m);
  assert.match(text, /^PASS {2}lint \(exit 0, 0\.9s\)$/m);
  assert.match(text, /^GATE SUMMARY: 1 pass, 1 fail — EXIT 1$/m);
});

test("a failing gate's detail appears in the report", () => {
  const { code, text } = renderGateReport([fail("css", 0.4, "readable copy drifted\n\nboom\n")]);

  assert.equal(code, 1);
  assert.match(text, /^ {4}readable copy drifted$/m, "the failing output was dropped");
  assert.match(text, /^ {4}boom$/m, "the last failing line was dropped");
});

test("a passing gate's detail stays out of the report", () => {
  const { text } = renderGateReport([{ ...pass("lint", 1), detail: "noise from a clean gate" }]);

  assert.ok(!text.includes("noise from a clean gate"), "a clean gate printed its output");
});

test("no gates gives code 1 and says so", () => {
  const { code, text } = renderGateReport([]);

  assert.equal(code, 1, "an empty run reported success");
  assert.equal(text, "GATE SUMMARY: no gates ran — EXIT 1");
});
