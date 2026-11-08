import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BUILD_YEAR, currentYear } from "./copyright-year.js";

/**
 * The footer prints `© <year>` and the page is prerendered and revalidated every
 * 6 h, so the year has two answers: the client's (the year in the browser) and
 * the server's (the year the served snapshot belongs to). Answering both with
 * `new Date().getFullYear()` made them disagree for up to six hours on 1
 * January, which is a hydration mismatch and a visible "© 2025" under a page
 * built in 2026. Both answers live in `src/lib/copyright-year.js` so they can be
 * pinned here.
 *
 *   1. the client answer is the year of the date it is asked about;
 *   2. the server answer is the year of `generatedAt` in the snapshot — the
 *      invariant the constant documents: bump it in the commit that moves the
 *      snapshot.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const snapshot = JSON.parse(
  readFileSync(path.join(ROOT, "src/data/pinned-projects.json"), "utf8"),
);

test("the footer's year is the year of the date it is asked about", () => {
  assert.equal(currentYear(new Date("2031-05-04T00:00:00Z")), 2031);
});

test("the build year is the year the served snapshot belongs to", () => {
  assert.equal(BUILD_YEAR, new Date(snapshot.generatedAt).getUTCFullYear());
});
