import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * `/test` — the measuring route, and the one thing that must never ship.
 *
 * The meter measures the page it runs on, so `/test` cannot be a page of its
 * own (that page would only ever measure itself). It is a rewrite: `/test` and
 * everything under it render the real site, and the overlay that drives the
 * meter mounts on the client. The rewrite exists only while `next dev` runs, so
 * a production build has no such route and the URL lands on the site's own 404.
 *
 * Both halves of that promise are properties of the sources, so they run here
 * with no build, no browser and no network:
 *
 *   1. production resolves no `/test` rewrite;
 *   2. development maps `/test` to the site's own routes;
 *   3. no App Router page answers `/test` in any environment — a page would be
 *      compiled into every build, which is exactly the leak (S2);
 *   4. the rewrites never touch a real route (S3);
 *   5. no page imports the meter, the overlay behind it is dev-gated and loads it
 *      lazily, and its report endpoint is dead in production (S8, S9).
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CONFIG = path.join(ROOT, "next.config.js");
const require = createRequire(import.meta.url);

/** Read the config with one environment, and put `NODE_ENV` back afterwards. */
const rewritesFor = async (nodeEnv) => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  try {
    delete require.cache[require.resolve(CONFIG)];
    const { rewrites } = require(CONFIG);
    assert.equal(typeof rewrites, "function", "next.config.js must declare rewrites()");
    return await rewrites();
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
};

/** Every file the App Router would compile as a route for a `test` segment. */
const routeFilesUnder = (dir) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .filter((entry) => /^(page|route|layout|template)\.(js|jsx|ts|tsx|mjs)$/.test(entry.name))
    .map((entry) => path.join(entry.parentPath ?? dir, entry.name));
};

test("S2: a production build resolves no /test rewrite", async () => {
  const rewrites = await rewritesFor("production");

  assert.deepEqual(
    rewrites.filter((rule) => rule.source === "/test" || rule.source.startsWith("/test/")),
    [],
  );
});

test("S2: no App Router page answers /test, so production cannot serve it", () => {
  const files = routeFilesUnder(path.join(ROOT, "src/app"));

  assert.deepEqual(
    files.filter((file) => /[\\/]test[\\/]/.test(file.slice(path.join(ROOT, "src/app").length))),
    [],
    "a src/app/**/test page would be compiled into every build; /test is a dev-only rewrite",
  );
});

test("S3: development renders the site itself through /test", async () => {
  const rewrites = await rewritesFor("development");
  const map = new Map(rewrites.map((rule) => [rule.source, rule.destination]));

  assert.equal(map.get("/test"), "/");
  assert.equal(map.get("/test/:path*"), "/:path*");
});

test("S3: the rewrites only add /test and never move a real route", async () => {
  const rewrites = await rewritesFor("development");

  for (const rule of rewrites) {
    assert.ok(
      rule.source === "/test" || rule.source.startsWith("/test/"),
      `rewrite source ${rule.source} is not part of the measuring route`,
    );
  }
});

/** The overlay that mounts the meter, and the endpoint that receives its report. */
const OVERLAY = path.join(ROOT, "src/components/PerfTestMeter.jsx");
const REPORT_ROUTE = path.join(ROOT, "src/app/api/perf-report/route.js");

test("S9: no page module ships the meter", () => {
  /* The meter is not a page and never becomes one: `/test` is a rewrite onto the
     real site, so any page importing it would be compiled into every build. */
  const appDir = path.join(ROOT, "src/app");
  const pages = routeFilesUnder(appDir).filter((file) =>
    /(?:^|[\\/])page\.(?:js|jsx|ts|tsx)$/.test(file),
  );

  assert.ok(pages.length > 0, "the walk must actually find the pages it checks");

  const offenders = pages.filter((file) => /perf[Mm]eter/.test(readFileSync(file, "utf8")));
  assert.deepEqual(offenders, [], "a page that imports the meter ships it to production");
});

test("S9: the overlay is dev-gated and imports the meter lazily", () => {
  /* Two independent promises, both read from the source: outside development the
     component renders nothing, and the meter only reaches a browser through a
     dynamic import — a static one would put it in the shared client bundle of
     every route the overlay is mounted on. */
  const source = readFileSync(OVERLAY, "utf8");

  assert.match(
    source,
    /process\.env\.NODE_ENV\s*!==\s*["']development["']/,
    "the dev gate is what a production build dead-code eliminates",
  );
  assert.match(source, /await import\(|import\(\s*["']@\/perf\/meter["']\s*\)/, "the import must be dynamic");
  assert.doesNotMatch(
    source,
    /(?:^|\n)\s*import\s[^;]*from\s*["']@\/perf\/meter["']/,
    "a static import of the meter puts it in the production bundle",
  );
});

test("S8: the report endpoint is dead in production", async () => {
  /* The real handler, imported and called: in production it answers 404 and
     writes nothing, whatever the working directory is. The route only imports
     `node:` builtins and the Web `Response`, which is what makes this possible
     without a Next runtime or a server. */
  const previousEnv = process.env.NODE_ENV;
  const previousCwd = process.cwd();
  const scratch = mkdtempSync(path.join(tmpdir(), "pf-perf-report-"));

  try {
    process.env.NODE_ENV = "production";
    process.chdir(scratch);
    const { POST } = await import(pathToFileURL(REPORT_ROUTE).href);
    const response = await POST(
      new Request("http://localhost/api/perf-report", { method: "POST", body: "{}" }),
    );

    assert.equal(response.status, 404, "a deploy must not answer the measuring endpoint");
    assert.equal(await response.text(), "", "404 is an empty body, not a report");
    assert.deepEqual(readdirSync(scratch), [], "production writes no artifact");
  } finally {
    process.chdir(previousCwd);
    rmSync(scratch, { recursive: true, force: true });
    if (previousEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnv;
  }
});
