import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MAX_PINNED_PROJECTS, PROJECT_OVERRIDES } from "../data/projects.js";
import { MAX_TAG_LENGTH, validate } from "./validate-projects.js";
import { commitProjectsSnapshot, readProjectsSnapshot } from "./projects-snapshot.js";

/**
 * §17 / §21.3 "Seguridad y datos" — the snapshot is the only project data the
 * site serves, so `validate()` is the whole security boundary:
 *
 *   1. https only, allowlisted host, no credentials, no protocol-relative;
 *   2. `name` shape, description without markup / control characters, collapsed;
 *   3. at most MAX_PINNED_PROJECTS, no duplicate repoLink;
 *   4. atomic write (tmp + rename) with the sha256 in the log;
 *   5. fail-closed: any failing item leaves the previous snapshot served.
 *
 * Every rejection below therefore asserts three things: the candidate is
 * rejected, the error names the rule, and the bytes already on disk are
 * untouched. The write path runs against a temp directory outside the repo —
 * a test must never be able to rewrite the versioned snapshot by accident.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SNAPSHOT_FILE = path.join(ROOT, "src/data/pinned-projects.json");
const snapshotText = readFileSync(SNAPSHOT_FILE, "utf8");
const snapshot = JSON.parse(snapshotText);

const scratch = mkdtempSync(path.join(os.tmpdir(), "projects-snapshot-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

let caseId = 0;

/** A private copy of the served snapshot, so "unchanged" is a byte comparison. */
function seededTarget() {
  const file = path.join(scratch, `case-${(caseId += 1)}.json`);
  writeFileSync(file, snapshotText);
  return file;
}

function item(overrides = {}) {
  return { ...snapshot.projects[0], ...overrides };
}

function tempFiles() {
  return readdirSync(scratch).filter((name) => name.endsWith(".tmp"));
}

/** Commit a candidate against a seeded file and require a clean, no-write rejection. */
function expectRejected(label, candidate, code) {
  test(label, () => {
    const file = seededTarget();
    const before = readFileSync(file, "utf8");
    const result = commitProjectsSnapshot(candidate, { file, log: () => {} });

    assert.equal(result.ok, false, `${label}: must be rejected`);
    assert.equal(result.sha256, undefined, `${label}: a rejected write has no digest`);
    assert.ok(
      result.errors.some((error) => error.code === code),
      `${label}: expected code ${code}, got ${JSON.stringify(result.errors)}`,
    );
    assert.equal(
      readFileSync(file, "utf8"),
      before,
      `${label}: the previous snapshot must keep being served`,
    );
    assert.deepEqual(tempFiles(), [], `${label}: no temp file may survive`);
  });
}

// ——— rule 1: only https, allowlisted host, no credentials —————————————————

expectRejected(
  "a javascript: repository URL is rejected",
  [item({ repoLink: "javascript:alert(1)" })],
  "url-scheme",
);

expectRejected(
  "a data: site URL is rejected",
  [item({ siteUrl: "data:text/html,<script>alert(1)</script>" })],
  "url-scheme",
);

expectRejected(
  "credentials in the URL are rejected",
  [item({ repoLink: "https://yuka:token@github.com/YukaC/PortfolioReact" })],
  "url-credentials",
);

expectRejected(
  "a host outside the allowlist is rejected",
  [item({ siteUrl: "https://evil.example/portfolio" })],
  "url-host",
);

expectRejected(
  "a host that only ends in the allowlisted suffix is rejected",
  [item({ siteUrl: "https://vercel.app.evil.tld/portfolio" })],
  "url-host",
);

expectRejected(
  "the bare vercel.app apex is rejected, like the bare github.io apex",
  [item({ siteUrl: "https://vercel.app/portfolio" })],
  "url-host",
);

// A real deployment is `<project>.vercel.app`, which the exact list refused
// while it accepted the apex nobody deploys on: the sync then dropped every
// demo link in silence and the cards served `siteUrl: null`.
test("a real vercel.app deployment is accepted as a demo link", () => {
  const result = validate([item({ siteUrl: "https://portfolio-yuka.vercel.app/" })]);

  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.items[0].siteUrl, "https://portfolio-yuka.vercel.app/");
});

// PRESERVE: the `*.github.io` shape that already worked, unchanged.
test("a github.io project page is still accepted, and the bare apex still is not", () => {
  const accepted = validate([item({ siteUrl: "https://yuka.github.io/portfolio/" })]);
  assert.equal(accepted.ok, true, JSON.stringify(accepted.errors));
  assert.equal(accepted.items[0].siteUrl, "https://yuka.github.io/portfolio/");

  const refused = validate([item({ siteUrl: "https://github.io/portfolio/" })]);
  assert.equal(refused.ok, false);
  assert.ok(refused.errors.some((error) => error.code === "url-host"));
});

// ——— the stored URL is the parsed one, not the trimmed input ———————————————

test("a tab inside a URL cannot survive into the snapshot", () => {
  const result = validate([
    item({ repoLink: "https://github.com/YukaC/Port\tfolio" }),
  ]);

  assert.equal(result.ok, true, JSON.stringify(result.errors));
  // `trim()` keeps an interior tab; the WHATWG parser drops it, so the parsed
  // `href` is the only form that cannot smuggle whitespace into the markup.
  assert.equal(result.items[0].repoLink, "https://github.com/YukaC/Portfolio");
  assert.doesNotMatch(result.items[0].repoLink, /[\u0000-\u001f\u007f]/);
});

// ——— rule 2, tags: they reach /llms.txt (line-oriented) and the JSON-LD ————

expectRejected(
  "a control character in a tag is rejected, not collapsed away",
  [item({ tags: ["React\n\n## Fake heading"] })],
  "tag-control",
);

expectRejected(
  "markup in a tag is rejected",
  [item({ tags: ["<b>React</b>"] })],
  "tag-markup",
);

expectRejected(
  `a tag over ${MAX_TAG_LENGTH} characters is rejected`,
  [item({ tags: ["a".repeat(MAX_TAG_LENGTH + 1)] })],
  "tag-too-long",
);

test("tags are collapsed, deduplicated and otherwise untouched", () => {
  const result = validate([
    item({ tags: ["  Tailwind   CSS ", "Tailwind CSS", "C#", "  "] }),
  ]);

  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.deepEqual(result.items[0].tags, ["Tailwind CSS", "C#"]);
});

expectRejected(
  "a protocol-relative URL is rejected",
  [item({ repoLink: "//evil.example/YukaC/PortfolioReact" })],
  "url-relative",
);

// ——— rule 2: name and description —————————————————————————————————————————

expectRejected(
  "HTML in the description is rejected",
  [item({ description: "<b>Bold</b> claim about the build." })],
  "description-html",
);

expectRejected(
  "a name outside ^[A-Za-z0-9._-]{1,100}$ is rejected",
  [item({ name: "Portfolio React!" })],
  "name-invalid",
);

expectRejected(
  "a description over 240 characters is rejected",
  [item({ description: "a".repeat(241) })],
  "description-too-long",
);

expectRejected(
  "a control character in the description is rejected",
  [item({ description: "clean copy\u0000with a NUL" })],
  "description-control",
);

// ——— rule 3: count and duplicates ——————————————————————————————————————————

expectRejected(
  `more than ${MAX_PINNED_PROJECTS} items is rejected`,
  [
    ...snapshot.projects,
    item({ name: "extra-project", repoLink: "https://github.com/YukaC/extra-project" }),
  ],
  "too-many-items",
);

expectRejected(
  "a duplicate repoLink is rejected",
  [item(), item({ name: "SameRepoAgain" })],
  "duplicate-repoLink",
);

// ——— the accepted case ————————————————————————————————————————————————————

test("the versioned snapshot is accepted, and its names match the overrides", () => {
  const before = JSON.stringify(snapshot);
  const result = validate(snapshot);

  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.items.length, snapshot.projects.length);
  assert.ok(result.items.length <= MAX_PINNED_PROJECTS);
  assert.match(snapshot.generatedAt, /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
  assert.deepEqual(validate(snapshot), result, "validate() must be pure");

  for (const project of result.items) {
    // L10 (prod-polish): a stale override key silently degrades a card's copy.
    assert.ok(
      PROJECT_OVERRIDES[project.name],
      `${project.name} has no PROJECT_OVERRIDES entry`,
    );
    assert.match(project.name, /^[A-Za-z0-9._-]{1,100}$/);
    assert.ok(project.description.length <= 240);
    assert.equal(project.description, project.description.replace(/\s+/g, " ").trim());
  }

  assert.equal(JSON.stringify(snapshot), before, "validate() must not mutate its input");
});

test("the render path reads the versioned snapshot with no network", () => {
  const read = readProjectsSnapshot();

  assert.equal(read.generatedAt, snapshot.generatedAt);
  assert.deepEqual(read.projects, validate(snapshot).items);
});

// ——— rule 4: the write path ———————————————————————————————————————————————

test("a valid refresh writes atomically and logs the sha256", () => {
  const file = path.join(scratch, "written.json");
  const lines = [];
  const result = commitProjectsSnapshot(snapshot.projects, {
    file,
    log: (line) => lines.push(line),
  });

  assert.equal(result.ok, true);
  const written = readFileSync(file, "utf8");
  assert.equal(
    createHash("sha256").update(written).digest("hex"),
    result.sha256,
    "the logged digest must be the digest of the bytes on disk",
  );
  assert.ok(
    lines.some((line) => line.includes(result.sha256)),
    "the run log must carry the sha256",
  );
  assert.deepEqual(tempFiles(), [], "no temp file may survive a successful write");
  assert.equal(validate(JSON.parse(written)).ok, true);
  assert.match(written, /^\{\n {2}"\$comment":/, "the file keeps its provenance note");
});

// ——— rule 5 (render path): no network in the module the pages import ————

// `fetch-pinned-projects.js` (the old scrape) is deleted: this is the only
// module left between the snapshot on disk and the rendered card.
test("the render-path module contains no network call", () => {
  for (const relative of ["src/lib/projects-snapshot.js"]) {
    const source = readFileSync(path.join(ROOT, relative), "utf8");
    // Comments keep the history of what this replaced ("api.github.com", the 403
    // build); the assertion is about code, so read the module without them.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    for (const forbidden of [
      /\bfetch\s*\(/,
      /api\.github\.com/,
      /github\.com\/YukaC\b/,
      /["']node:https?["']/,
      /XMLHttpRequest|new WebSocket/,
    ]) {
      assert.doesNotMatch(code, forbidden, `${relative} must not reference ${forbidden}`);
    }
  }
});
