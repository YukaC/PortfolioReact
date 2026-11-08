/**
 * §17 — the versioned project snapshot: read side and write side.
 *
 * `src/data/pinned-projects.json` is committed, validated and served as-is, so
 * the build and the render never talk to GitHub (that is the §16.3 A5
 * acceptance criterion: a build that works without network).
 *
 * Reading is plain I/O plus `validate()`. Writing is all-or-nothing: validate
 * first, then a temp file in the target's own directory, then `rename`, then
 * log the `sha256` of the bytes that landed. A rejected candidate does not even
 * create a temp file, so the previous snapshot keeps being served.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  formatErrors,
  serializeSnapshot,
  sha256Hex,
  validate,
} from "./validate-projects.js";

/**
 * Where the snapshot lives. Two candidates, because the same module runs under
 * `node --test` (module-relative) and inside the Next server bundle, where a
 * bundler may rewrite `import.meta.url` — then the repository root is the only
 * place the file can be.
 */
function resolveSnapshotFile() {
  const candidates = [];
  try {
    candidates.push(fileURLToPath(new URL("../data/pinned-projects.json", import.meta.url)));
  } catch {
    // Non-file `import.meta.url` (a bundled module): fall through to the repo root.
  }
  candidates.push(path.join(process.cwd(), "src", "data", "pinned-projects.json"));
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[candidates.length - 1];
}

/** The snapshot file the render path reads when no explicit path is given. */
export const SNAPSHOT_FILE = resolveSnapshotFile();

/**
 * Read and validate the snapshot. Throws when the committed file is invalid:
 * there is no fallback data and no network call to fall back to, so a broken
 * snapshot must fail the build instead of blanking the work list.
 *
 * Next 16.4's tracer reads this function. The render path always passes no
 * `file`, so the static arm (the module's own `SNAPSHOT_FILE`) is the one it can
 * follow; the test-only override is marked `turbopackIgnore` because otherwise
 * the tracer concludes any path is reachable and traces the whole project —
 * `public/` included — into the server output, which is a size and a deploy-limit
 * risk. The static arm is what ships.
 *
 * @param {{ file?: string }} [options]
 * @returns {{ generatedAt: string|null, projects: object[], sha256: string }}
 */
export function readProjectsSnapshot({ file = SNAPSHOT_FILE } = {}) {
  const text =
    file === SNAPSHOT_FILE
      ? readFileSync(SNAPSHOT_FILE, "utf8")
      : // Tests only, and out of the tracer's reach on purpose (see above).
        readFileSync(/* turbopackIgnore: true */ file, "utf8");
  const parsed = JSON.parse(text);
  const result = validate(parsed);

  if (!result.ok) {
    throw new Error(`[projects-snapshot] ${file} failed validation: ${formatErrors(result.errors)}`);
  }

  return {
    generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : null,
    projects: result.items,
    sha256: sha256Hex(text),
  };
}

/**
 * Validate a candidate and, only if every item passes, replace the snapshot.
 *
 * The write is atomic: temp file in the same directory (same filesystem), then
 * `rename`, which is what makes readers see either the old bytes or the new
 * ones — never a half-written file.
 *
 * This is the swap-side sibling of `readProjectsSnapshot`: it runs from
 * `scripts/sync-projects.mjs` and from the tests, never from a request, so the
 * path argument carries the same `turbopackIgnore` mark and the tracer does not
 * chase it into the whole project.
 *
 * @param {unknown} candidate array of projects, or `{ generatedAt, projects }`
 * @param {{ file?: string, generatedAt?: string, log?: (line: string) => void }} [options]
 * @returns {{ ok: true, sha256: string, bytes: number, generatedAt: string, projects: object[] }
 *   | { ok: false, errors: object[] }}
 */
export function commitProjectsSnapshot(
  candidate,
  { file = SNAPSHOT_FILE, generatedAt, log = console.log } = {},
) {
  const result = validate(candidate);
  if (!result.ok) {
    return { ok: false, errors: result.errors };
  }

  const stamp = generatedAt ?? new Date().toISOString();
  const text = serializeSnapshot({ generatedAt: stamp, projects: result.items });
  const digest = sha256Hex(text);
  const target = path.resolve(/* turbopackIgnore: true */ file);
  const temp = `${target}.${process.pid}.${randomUUID()}.tmp`;

  mkdirSync(path.dirname(target), { recursive: true });
  try {
    writeFileSync(temp, text, { encoding: "utf8", mode: 0o644 });
    renameSync(temp, target);
  } catch (error) {
    try {
      unlinkSync(temp);
    } catch {
      // The temp file never existed, or already got renamed away.
    }
    throw error;
  }

  log(
    `[projects-snapshot] wrote ${target} items=${result.items.length} generatedAt=${stamp} sha256=${digest}`,
  );

  return {
    ok: true,
    sha256: digest,
    bytes: Buffer.byteLength(text, "utf8"),
    generatedAt: stamp,
    projects: result.items,
  };
}
