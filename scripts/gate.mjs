#!/usr/bin/env node
/**
 * Quality gate runner — every gate, one verdict.
 *
 * `pnpm test:all` was `pnpm lint && node --test src/lib && …`: fail-fast, so a
 * failing gate skipped the rest, and any piped use (`pnpm test:all | tail -40`)
 * reported the status of `tail`, not of the gates. A real false green came out of
 * exactly that. This runner walks the gates in order, each in its own child
 * process, keeps every exit code, and lets `renderGateReport` decide the exit
 * status: 0 only when every gate ran and every gate passed.
 *
 * `spawnSync` cannot tee: it either inherits the child's stdio or captures it. The
 * gate header is printed before the child starts and the captured output right
 * after it exits, so the log reads in order through a pipe and the last lines are
 * still available as the report's detail.
 *
 * Exit codes: 0 all gates passed · 1 a gate failed · 2 usage error.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderGateReport } from "../src/lib/gate-report.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ESLINT = path.join(ROOT, "node_modules", "eslint", "bin", "eslint.js");

/** A hanging gate must fail the run, not hold it: 15 min is past any suite here. */
const GATE_TIMEOUT_MS = 15 * 60 * 1000;

/** The child may print a `next build` worth of log; keep room for it. */
const MAX_BUFFER = 32 * 1024 * 1024;

/** Order matters for reading, not for the verdict: every gate runs regardless. */
const GATES = [
  { name: "lint", command: process.execPath, args: [ESLINT, "."] },
  { name: "unit", command: process.execPath, args: ["--test", "src/lib"] },
  { name: "css", command: process.execPath, args: [path.join(ROOT, "scripts", "check-css.mjs")] },
  {
    name: "motion",
    command: process.execPath,
    args: [path.join(ROOT, "scripts", "check-motion-aliases.mjs")],
  },
  {
    name: "bebop",
    command: process.execPath,
    args: [path.join(ROOT, "scripts", "validate-bebop-timing.mjs")],
  },
];

const USAGE = [
  "usage: node scripts/gate.mjs [--only <name>] [--list]",
  "",
  `gates: ${GATES.map((gate) => gate.name).join(", ")}`,
].join("\n");

function usageError(message) {
  process.stderr.write(`gate: ${message}\n${USAGE}\n`);
  process.exit(2);
}

/** The last non-empty output lines, which the report prints for a failure. */
function detailFrom(output) {
  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .slice(-5)
    .join("\n");
}

function runGate(gate) {
  process.stdout.write(`── ${gate.name}\n`);

  const startedAt = process.hrtime.bigint();
  const result = spawnSync(gate.command, gate.args, {
    cwd: ROOT,
    shell: false,
    encoding: "utf8",
    env: process.env,
    timeout: GATE_TIMEOUT_MS,
    maxBuffer: MAX_BUFFER,
  });
  const seconds = Number(process.hrtime.bigint() - startedAt) / 1e9;

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (output.length > 0) {
    process.stdout.write(output.endsWith("\n") ? output : `${output}\n`);
  }
  process.stdout.write("\n");

  // A null status (kill signal, ETIMEDOUT, spawn error) is a failure: the only
  // success this runner recognises is a child that exited with 0 by itself.
  const exitCode = typeof result.status === "number" ? result.status : 1;
  const ok = result.error === undefined && result.status === 0;

  const detail = result.error
    ? detailFrom(`${output}\n${result.error.message}`)
    : detailFrom(output);

  return { name: gate.name, ok, exitCode, seconds, detail };
}

function parseArgs(argv) {
  const options = { only: null, list: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--list") {
      options.list = true;
    } else if (arg === "--only") {
      const value = argv[index + 1];
      if (value === undefined) usageError("--only needs a gate name");
      options.only = value;
      index += 1;
    } else if (arg.startsWith("--only=")) {
      options.only = arg.slice("--only=".length);
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`${USAGE}\n`);
      process.exit(0);
    } else {
      usageError(`unknown argument: ${arg}`);
    }
  }

  return options;
}

const options = parseArgs(process.argv.slice(2));

if (options.list) {
  process.stdout.write(`${GATES.map((gate) => gate.name).join("\n")}\n`);
  process.exit(0);
}

let gates = GATES;
if (options.only !== null) {
  const selected = GATES.find((gate) => gate.name === options.only);
  if (selected === undefined) usageError(`unknown gate: ${options.only}`);
  gates = [selected];
}

const { code, text } = renderGateReport(gates.map(runGate));
process.stdout.write(`${text}\n`);
process.exit(code);
