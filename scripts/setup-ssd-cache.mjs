#!/usr/bin/env node
/**
 * Fast local Next.js when the main checkout lives on HDD (SPEC V3/T4).
 *
 * Turbopack rejects node_modules symlinks outside the project, and a .next
 * symlink on another filesystem breaks PostCSS resolution. The reliable fix is
 * a git worktree on NVMe (same commits, separate working tree).
 *
 * Usage:
 *   pnpm setup:ssd          # create/update ~/ssd-cache/PortfolioReact/wt
 *   pnpm setup:ssd:store    # also set store-dir on NVMe in the worktree .npmrc
 *
 * Then open the worktree folder in the editor (or: pnpm dev:nvme).
 */
import { existsSync, mkdirSync, writeFileSync, appendFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheRoot = path.join(homedir(), "ssd-cache", "PortfolioReact");
const worktreePath = path.join(cacheRoot, "wt");
const pnpmStore = path.join(homedir(), "ssd-cache", "pnpm-store");
const markerPath = path.join(root, ".ssd-cache");
const withStore = process.argv.includes("--store");

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    cwd: opts.cwd || root,
    encoding: "utf8",
    stdio: opts.stdio || "pipe",
  }).trim();
}

function currentBranch() {
  try {
    return run("git", ["branch", "--show-current"]);
  } catch {
    return "";
  }
}

function ensureWorktree() {
  mkdirSync(cacheRoot, { recursive: true });
  const branch = currentBranch() || "main";
  const nvmeBranch = `nvme/${branch.replace(/\//g, "-")}`;

  if (existsSync(path.join(worktreePath, ".git")) || existsSync(worktreePath)) {
    // Already a worktree or directory — try to update branch tip.
    try {
      const gitDir = run("git", ["rev-parse", "--git-dir"], { cwd: worktreePath });
      if (gitDir) {
        console.log(`[setup-ssd-cache] worktree exists → ${worktreePath}`);
        try {
          run("git", ["fetch", "origin", branch], { cwd: worktreePath });
        } catch {
          /* offline / no origin tip */
        }
        // Fast-forward nvme branch to HDD HEAD when clean enough.
        const hddHead = run("git", ["rev-parse", "HEAD"]);
        run("git", ["checkout", "-B", nvmeBranch, hddHead], { cwd: worktreePath });
        console.log(`[setup-ssd-cache] reset ${nvmeBranch} → ${hddHead.slice(0, 8)}`);
        return { worktreePath, nvmeBranch };
      }
    } catch {
      /* fall through to add */
    }
  }

  // New worktree from current HEAD (cannot reuse branch already checked out).
  console.log(`[setup-ssd-cache] adding worktree ${worktreePath} (${nvmeBranch})`);
  run("git", ["worktree", "add", "-B", nvmeBranch, worktreePath, "HEAD"]);
  return { worktreePath, nvmeBranch };
}

function ensureStoreDir(targetRoot) {
  mkdirSync(pnpmStore, { recursive: true });
  const npmrcPath = path.join(targetRoot, ".npmrc");
  const line = `store-dir=${pnpmStore}`;
  let existing = existsSync(npmrcPath) ? readFileSync(npmrcPath, "utf8") : "";
  if (existing.includes("store-dir=")) {
    console.log("[setup-ssd-cache] worktree .npmrc already has store-dir");
    return;
  }
  appendFileSync(
    npmrcPath,
    `${existing.endsWith("\n") || !existing ? "" : "\n"}${line}\n`,
  );
  console.log(`[setup-ssd-cache] worktree store-dir → ${pnpmStore}`);
}

const { worktreePath: wt, nvmeBranch } = ensureWorktree();

writeFileSync(
  markerPath,
  `# Local SSD worktree marker (gitignored)\nworktree=${wt}\nbranch=${nvmeBranch}\nstore=${pnpmStore}\n`,
  "utf8",
);
console.log(`[setup-ssd-cache] wrote ${path.relative(root, markerPath)}`);

if (withStore) {
  ensureStoreDir(wt);
}

if (!existsSync(path.join(wt, "node_modules", "next"))) {
  console.log("[setup-ssd-cache] installing deps in worktree…");
  run("pnpm", ["install"], { cwd: wt, stdio: "inherit" });
} else {
  console.log("[setup-ssd-cache] worktree node_modules OK");
}

console.log(`
[setup-ssd-cache] ready on NVMe:
  ${wt}

Open that folder in Cursor (HDD checkout stays as mirror).
  cd ${wt} && pnpm dev
`);
