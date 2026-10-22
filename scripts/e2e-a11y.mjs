#!/usr/bin/env node
/**
 * Browser check for this project.
 *
 * The rules live in `browser-verify.json` at the repo root; this file only
 * resolves the runner so `pnpm e2e:a11y` stays portable across machines.
 * Runner resolution: $BROWSER_VERIFY, then a vendored copy, then the house tool.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const candidates = [
  process.env.BROWSER_VERIFY,
  path.join(ROOT, ".browser-verify", "browser-verify"),
  path.join(process.env.HOME || "", ".agents", "scripts", "browser-verify"),
].filter(Boolean);

const runner = candidates.find((candidate) => existsSync(candidate));

if (!runner) {
  console.error(
    [
      "browser-verify runner not found.",
      "  · set BROWSER_VERIFY=/path/to/browser-verify, or",
      "  · vendor it: cp ~/.agents/scripts/browser-verify .browser-verify/browser-verify",
    ].join("\n"),
  );
  process.exit(3);
}

const result = spawnSync("node", [runner, "--root", ROOT, ...process.argv.slice(2)], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
