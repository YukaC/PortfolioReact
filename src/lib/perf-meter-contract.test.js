import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

/**
 * The meter is a single browser file that nothing compiles before it reaches a
 * phone, and its whole interface lives inside one template literal. A stray
 * backtick in a comment there is invisible to `eslint` (the file is not a module
 * with imports, and the comment is inside a string) and fatal in the browser:
 * `next dev` answered `Expected ';', '}' or <eof>` and `window.__perfMeterStart`
 * never existed, so the overlay looked dead instead of broken.
 *
 * These tests are the parse gate that was missing. They run in milliseconds and
 * pin the two properties a serving path depends on:
 *
 *   1. the file is a syntactically valid script (S6/S7 — it must run at all);
 *   2. it reads the report endpoint from `window.__perfReportEndpoint`, which is
 *      how `next dev` sends the report to `/api/perf-report` while the phone
 *      proxy keeps owning `/__perf/report` (S8);
 *   3. the proxy serves this exact file, so the phone and the dev route can never
 *      drift into two different meters (S7).
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const METER = path.join(ROOT, "src/perf/meter.js");
const require = createRequire(import.meta.url);

test("S6: the meter is a valid script, template literal and all", () => {
  const source = readFileSync(METER, "utf8");

  assert.doesNotThrow(
    () => new vm.Script(source, { filename: METER }),
    "meter.js must parse on its own: it reaches the browser unbuilt",
  );
});

test("S8: the meter takes its report endpoint from the page", () => {
  const source = readFileSync(METER, "utf8");

  assert.match(
    source,
    /window\.__perfReportEndpoint \|\| "\/__perf\/report"/,
    "the phone proxy path stays the default, and the dev overlay overrides it",
  );
});

test("S7: the phone proxy serves this file and not a copy of it", () => {
  const proxy = readFileSync(path.join(ROOT, "scripts/perf/remote-proxy.mjs"), "utf8");
  const meterPath = /const METER_PATH = new URL\("([^"]+)"/.exec(proxy);

  assert.ok(meterPath, "remote-proxy.mjs must declare METER_PATH");
  assert.equal(
    path.resolve(ROOT, "scripts/perf", meterPath[1]),
    METER,
    "the proxy reads the meter this repository tests, so there is one meter",
  );
});

test("S9: every sampled row carries the scroll its own box was read at", () => {
  const source = readFileSync(METER, "utf8");

  // One `scrollY` per pass is what made the phone report 21 jitter entries that
  // were the sampler's own lag: a row read late in the pass paired a box with a
  // scroll position from earlier in the pass, and the jitter detector read that
  // lag as content moving while the reader was still. The loop walks up to 160
  // nodes, so on a flick the page moves between the first and the last.
  assert.match(
    source,
    /let syNode = sy;[\s\S]{0,500}?syNode = Math\.round\(window\.scrollY\);/,
    "the scan must read scrollY again for the node it is about to measure",
  );

  const push = /rows\.push\(\[([\s\S]*?)\]\);/.exec(source);
  assert.ok(push, "no rows.push([...]) in the meter");
  assert.match(push[1], /\bsyNode\b/, "the row must store the node's own scroll");
  assert.doesNotMatch(push[1], /\bsy,/, "the row must not store the pass-level scroll");
});

test("S7: the proxy still posts to its own report path", () => {
  const proxy = readFileSync(path.join(ROOT, "scripts/perf/remote-proxy.mjs"), "utf8");

  assert.match(proxy, /\/__perf\/report/, "the proxy owns /__perf/report");
  assert.doesNotMatch(
    proxy,
    /__perfReportEndpoint/,
    "the proxy must not set the dev override; that belongs to the overlay",
  );
});

test("S10: a phases artifact only carries the rows of its own run", () => {
  const source = readFileSync(METER, "utf8");

  // A native review of 6 nov 2026 raised this as CRITICAL: a later ordinary window
  // re-embedding an earlier run's phase rows, so an artifact would present frames
  // measured under one ablation as another's data. The claim cited `S.phases`,
  // which has never existed here — but "it cannot happen" was only a comment, and
  // a comment cannot answer a reviewer. These three assertions are the answer.
  assert.doesNotMatch(
    source,
    /S\.phases/,
    "phase rows must not live on the meter's state: the next window would inherit them",
  );

  const carrier = source.match(/phases:/g) || [];
  assert.equal(
    carrier.length,
    1,
    `exactly one place may attach phase rows to a report, saw ${carrier.length}`,
  );

  const post = /const postPhases = async \(collected\) => \{[\s\S]*?phases: collected/.exec(source);
  assert.ok(
    post,
    "postPhases must build its payload from the rows it was given, never from the meter's state",
  );
});

test("S11: a coarse pointer pays only for the observers until the panel asks", () => {
  const source = readFileSync(METER, "utf8");

  // The PerformanceObservers and the frame push in `tick` name a long frame for
  // one callback each, so they stay on everywhere. The sampler, the field pass and
  // the badge repaint are forced style/layout reads, and on the phone they were
  // 814-948 ms of a 13-15 s window measured. They hang off the flag the panel
  // toggle already owns, so a diagnostic run gets them back
  // (`__perfMeterPanel(true)` before `start()`).
  assert.match(
    source,
    /let panelOn = !COARSE_POINTER;/,
    "the heavy passes must be off by default on the pointer that pays for them",
  );

  for (const pass of ["sample", "sampleField", "paintLive"]) {
    assert.match(
      source,
      new RegExp(`const ${pass} = \\(\\) => \\{\\n\\s*if \\(!panelOn\\) return;`),
      `${pass} must not run while the panel is off`,
    );
  }
});
