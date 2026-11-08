#!/usr/bin/env node
/**
 * Browser check for this project.
 *
 * The rules live in `browser-verify.json` at the repo root (`browser-verify.ci.json`
 * for the production server CI runs); this file only resolves the runner so
 * `pnpm e2e:a11y` stays portable across machines and works on a bare runner.
 * Runner resolution: $BROWSER_VERIFY, then the committed copy at
 * `scripts/vendor/browser-verify.mjs`, then a local `.browser-verify/` copy, then
 * the house tool in `~/.agents/scripts`.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const candidates = [
  process.env.BROWSER_VERIFY,
  path.join(ROOT, "scripts", "vendor", "browser-verify.mjs"),
  path.join(ROOT, ".browser-verify", "browser-verify"),
  path.join(process.env.HOME || "", ".agents", "scripts", "browser-verify"),
].filter(Boolean);

const runner = candidates.find((candidate) => existsSync(candidate));

if (!runner) {
  console.error(
    [
      "browser-verify runner not found.",
      "  · set BROWSER_VERIFY=/path/to/browser-verify, or",
      "  · vendor it: cp ~/.agents/scripts/browser-verify scripts/vendor/browser-verify.mjs",
      "    (that path is committed and is the one CI uses)",
    ].join("\n"),
  );
  process.exit(3);
}

const result = spawnSync("node", [runner, "--root", ROOT, ...process.argv.slice(2)], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
