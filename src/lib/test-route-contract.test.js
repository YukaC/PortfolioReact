import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
 *   4. the rewrites never touch a real route (S3).
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
