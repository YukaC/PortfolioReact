#!/usr/bin/env node
/**
 * Run a pnpm script inside the NVMe worktree (creates it via setup-ssd-cache if missing).
 * Usage: node scripts/run-nvme.mjs dev | build | lint | …
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const markerPath = path.join(root, ".ssd-cache");
const scriptName = process.argv[2] || "dev";
const extra = process.argv.slice(3);

function ensureSetup() {
  execFileSync("node", [path.join(root, "scripts/setup-ssd-cache.mjs")], {
    cwd: root,
    stdio: "inherit",
  });
}

let worktree = null;
if (existsSync(markerPath)) {
  const match = readFileSync(markerPath, "utf8").match(/^worktree=(.+)$/m);
  worktree = match?.[1]?.trim() || null;
}

if (!worktree || !existsSync(path.join(worktree, "package.json"))) {
  ensureSetup();
  const match = readFileSync(markerPath, "utf8").match(/^worktree=(.+)$/m);
  worktree = match?.[1]?.trim();
}

if (!worktree || !existsSync(path.join(worktree, "package.json"))) {
  console.error("[run-nvme] worktree missing after setup");
  process.exit(1);
}

// Sync uncommitted tracked+untracked sources is intentional NOT done here —
// prefer opening the worktree. We only forward the command for convenience
// when the worktree already has the same commits.
const result = spawnSync("pnpm", [scriptName, ...extra], {
  cwd: worktree,
  stdio: "inherit",
  shell: false,
});
process.exit(result.status ?? 1);
