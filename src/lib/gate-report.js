/**
 * Gate report — the exit code of a quality run, computed in one place.
 *
 * `pnpm test:all` was `pnpm lint && node --test src/lib && … `: fail-fast, so one
 * failing gate hid the rest, and every piped use (`pnpm test:all | tail -40`)
 * reported the status of `tail` instead of the status of the gates. That produced
 * a real false green here. `scripts/gate.mjs` therefore runs every gate, collects
 * its result, and asks this module for the verdict: a pure function of plain
 * objects, no filesystem and no child process, so the decision can be tested
 * without running a single gate.
 *
 * `renderGateReport` returns `{ code, text }`: `code` is 0 only when at least one
 * gate ran and everything passed, and `text` names every gate that ran plus the
 * last output lines of the ones that failed.
 */

/** Failing output is a tail, not a log: the last lines carry the message. */
const DETAIL_LINES = 5;

/** Four spaces keep a detail block visually under the gate it belongs to. */
const DETAIL_INDENT = "    ";

/** `PASS  name (exit 0, 1.2s)` — both labels are padded to the same width. */
function formatGateLine(result) {
  const status = result.ok === true ? "PASS" : "FAIL";
  const seconds = Number.isFinite(result.seconds) ? result.seconds : 0;
  return `${status}  ${result.name} (exit ${result.exitCode}, ${seconds.toFixed(1)}s)`;
}

/** The last non-empty lines of a gate's output, without trailing whitespace. */
function detailTail(detail) {
  if (typeof detail !== "string" || detail.length === 0) return [];
  return detail
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .slice(-DETAIL_LINES);
}

/**
 * @param {Array<{ name: string, ok: boolean, exitCode: number, seconds?: number, detail?: string }>} results
 * @returns {{ code: 0 | 1, text: string }}
 */
export function renderGateReport(results) {
  const gates = Array.isArray(results) ? results : [];
  const passed = gates.filter((gate) => gate.ok === true);
  const code = gates.length > 0 && passed.length === gates.length ? 0 : 1;

  const lines = gates.map(formatGateLine);
  for (const gate of gates) {
    if (gate.ok === true) continue;
    for (const line of detailTail(gate.detail)) lines.push(`${DETAIL_INDENT}${line}`);
  }

  lines.push(
    gates.length === 0
      ? "GATE SUMMARY: no gates ran — EXIT 1"
      : `GATE SUMMARY: ${passed.length} pass, ${gates.length - passed.length} fail — EXIT ${code}`,
  );

  return { code, text: lines.join("\n") };
}
