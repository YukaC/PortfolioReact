/**
 * The dev-server half of the meter: where `POST /api/perf-report` lands.
 *
 * `/test` is a rewrite onto the real site (next.config.js), so in `next dev` the
 * meter measures a page that has no proxy behind it. `scripts/perf/remote-proxy.mjs`
 * is not running — it is the phone's own server, on port 4300 — and the meter's
 * default endpoint (`/__perf/report`) answers nothing here. The overlay therefore
 * points the meter at this route, and this route does what the proxy does with the
 * same payload: prints the summary a person reads in the terminal and keeps the
 * JSON next to the other artifacts.
 *
 * Two constraints shape the code below.
 *
 * The route only ever exists in development. In a build it answers `404` for every
 * method, so a deploy cannot accept a report even if something posts to it (S8),
 * and the terminal summary is only ever the dev terminal.
 *
 * It imports nothing but `node:` builtins and answers with the Web `Response` — no
 * `NextResponse`, no alias imports. `src/lib/test-route-contract.test.js` imports
 * this module directly and calls `POST` with a plain `Request` to pin the 404, so
 * the file has to be loadable (and honest) outside a Next runtime.
 *
 * The summary is the badge's own numbers, and every block is optional: a report
 * that lost a section prints `—` instead of throwing, because a throwing handler
 * would lose the artifact the run was made for.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/** The meter posts its full report; anything past this is not a report. */
const MAX_BODY_CHARS = 256 * 1024;
/** Artifacts live beside `pnpm perf`, inside the repo and gitignored (`.perf/`). */
const ARTIFACT_DIR = ".perf/browser";
const DASH = "\u2014";
const LABEL_WIDTH = 11;

/** Every method answers the same nothing in production; only `POST` works in dev. */
const absent = () =>
  process.env.NODE_ENV === "development"
    ? new Response(null, { status: 405, headers: { allow: "POST" } })
    : new Response(null, { status: 404 });

const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

/* --------------------------------------------------------------- the summary */

/** A block that may be missing, without turning a bad report into a throw. */
const block = (value) => (value && typeof value === "object" ? value : {});

/** A number or `—`; the report is assembled on a phone and may be partial. */
const num = (value, unit = "") => (Number.isFinite(value) ? `${value}${unit}` : DASH);

const row = (label, value) => `  ${label.padEnd(LABEL_WIDTH)}${value}`;

/** The anomaly kinds, `covered×2, shifted×1`, or `—` when the scan found none. */
const kinds = (byKind) => {
  const entries = Object.entries(block(byKind));
  if (!entries.length) return DASH;
  return entries.map(([kind, count]) => `${kind}\u00d7${count}`).join(", ");
};

/**
 * The terminal summary: the same numbers the badge shows, one line each.
 *
 * It is deliberately not the whole report — the artifact has that. This is what a
 * person watching `next dev` needs to answer "was the recording good": how many
 * frames and against which budget, how long the blocking work was, whether the
 * vitals regressed, what the scan caught, whether the field held still, and what
 * the meter itself cost.
 */
function summary(report, file) {
  const frames = block(report.frames);
  const longtasks = block(report.longtasks);
  const vitals = block(report.vitals);
  const anomalies = block(report.anomalies);
  const field = block(report.field);
  const meter = block(report.meter);

  return [
    `[perf] ${typeof report.url === "string" ? report.url : DASH}`,
    row(
      "frames",
      [
        num(frames.n),
        `p95 ${num(frames.p95, " ms")}`,
        `${num(frames.overBudget)} over ${num(frames.budget, " ms")}`,
      ].join(" \u00b7 "),
    ),
    row(
      "long tasks",
      `${num(longtasks.count)} \u00b7 max ${num(longtasks.maxMs, " ms")} \u00b7 total ${num(longtasks.totalMs, " ms")}`,
    ),
    row("vitals", `LCP ${num(vitals.lcp, " ms")} \u00b7 CLS ${num(vitals.cls)} \u00b7 FCP ${num(vitals.fcp, " ms")}`),
    row("anomalies", `${num(anomalies.total)} \u00b7 ${kinds(anomalies.byKind)}`),
    row("field", typeof field.verdict === "string" ? field.verdict : DASH),
    row(
      "meter",
      `${num(meter.costMsPerSecond, " ms/s")} \u00b7 longest pass ${num(meter.longestPassMs, " ms")}`,
    ),
    row("artifact", file),
  ].join("\n");
}

/* ---------------------------------------------------------------- the writing */

/**
 * Write the artifact under the repository and return its repository-relative path.
 *
 * `.perf/browser/` is created on demand and already gitignored (`.perf/` covers
 * `pnpm perf`), so a run leaves a file behind that is never a diff. The `:` in the
 * ISO timestamp becomes `-` because a colon is illegal in a Windows filename.
 */
async function saveArtifact(report) {
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const file = path.join(process.cwd(), ARTIFACT_DIR, `${stamp}.json`);

  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return path.relative(process.cwd(), file);
}

/* ----------------------------------------------------------------- the handler */

export async function POST(request) {
  if (process.env.NODE_ENV !== "development") return absent();

  /* Read as text first: the limit has to be enforced before `JSON.parse` sees a
     body nobody asked for, and a report is a few KB. */
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) {
    return json({ ok: false, error: "body-too-large", limit: MAX_BODY_CHARS }, 400);
  }

  let report;
  try {
    report = JSON.parse(text);
  } catch {
    return json({ ok: false, error: "invalid-json" }, 400);
  }
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    return json({ ok: false, error: "report-must-be-an-object" }, 400);
  }

  let file;
  try {
    file = await saveArtifact(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ ok: false, error: "write-failed", message }, 500);
  }

  console.log(summary(report, file));

  return json({ ok: true, file }, 200);
}

/* The measuring endpoint is one verb. Everything else is absent in a build and
   wrong in development, and neither case may reach the writer. */

export async function GET() {
  return absent();
}

export async function HEAD() {
  return absent();
}

export async function PUT() {
  return absent();
}

export async function PATCH() {
  return absent();
}

export async function DELETE() {
  return absent();
}

export async function OPTIONS() {
  return absent();
}

/** It writes a file on every call: nothing about it may be cached or prerendered. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
