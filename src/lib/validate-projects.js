/**
 * §17 — the single security check for project data.
 *
 * The site serves `src/data/pinned-projects.json` and nothing else, so this
 * module is the entire boundary between "a third party changed something" and
 * "the page ships it". Five rules, all-or-nothing (fail-closed):
 *
 *   1. links are `https:` only, on an allowlisted host, with no credentials and
 *      never protocol-relative — `javascript:`, `data:` and `//host/path` die
 *      here, not in the browser;
 *   2. `name` matches `^[A-Za-z0-9._-]{1,100}$`, the description carries no
 *      markup, no control characters, collapsed whitespace and ≤ 240 chars;
 *   3. at most `MAX_PINNED_PROJECTS` items, no duplicate `repoLink`;
 *   4. the write is atomic (temp file + rename) with the snapshot `sha256` in
 *      the run log — that half lives in `./projects-snapshot.js`;
 *   5. one failing item means nothing is written: the previous snapshot keeps
 *      being served.
 *
 * Pure by design: no `fetch`, no `fs`, no throwing for expected rejections.
 * `validate()` returns `{ ok: true, items }` or `{ ok: false, errors }` so the
 * caller decides what to log and the test suite can assert on error codes.
 */
import { createHash } from "node:crypto";

import { MAX_PINNED_PROJECTS, PROJECT_OVERRIDES } from "../data/projects.js";

/** GitHub repo slugs: no spaces, no dots-only names, no markup. */
export const NAME_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

/** Longest description a work card can hold without truncating on mobile. */
export const MAX_DESCRIPTION_LENGTH = 240;

/**
 * Where a snapshot may point. Anything else — including a homepage the API
 * hands back — is rejected rather than silently rendered as a card action.
 */
const ALLOWED_HOSTS = ["github.com", "vercel.app"];

/** `*.github.io` (a project page) is allowed; the bare apex is not. */
const ALLOWED_HOST_SUFFIXES = [".github.io"];

/** C0 controls and DEL. Tabs/newlines are whitespace and collapse first. */
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

/** Cheap markup test: a tag needs a `<` and a closing `>`. React escapes the rest. */
const HTML_TAG = /<[^>]*>/;

/** Local image path only — a remote `src` is an asset leak, not a screenshot. */
const LOCAL_IMAGE = /^\/(?!\/)[\w./-]+$/;

/**
 * Hosts that `PROJECT_OVERRIDES` declares, so a project's own domain can be
 * allowlisted in one place instead of widening the list for every project.
 */
function overrideHosts() {
  const hosts = new Set();
  for (const override of Object.values(PROJECT_OVERRIDES)) {
    const siteUrl = typeof override?.siteUrl === "string" ? override.siteUrl.trim() : "";
    if (!siteUrl) continue;
    try {
      const { hostname } = new URL(siteUrl);
      if (hostname) hosts.add(hostname.toLowerCase());
    } catch {
      // A broken override URL cannot widen the allowlist; validate() rejects it
      // later if it ever reaches a snapshot.
    }
  }
  return hosts;
}

/** Hosts declared by `PROJECT_OVERRIDES` on top of the fixed allowlist. */
export const OVERRIDE_ALLOWED_HOSTS = overrideHosts();

/** `https://` host allowlist: exact hosts plus the `*.github.io` wildcard. */
export function isAllowedHost(host) {
  const normalized = typeof host === "string" ? host.toLowerCase() : "";
  if (!normalized) return false;
  if (ALLOWED_HOSTS.includes(normalized)) return true;
  if (OVERRIDE_ALLOWED_HOSTS.has(normalized)) return true;
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => normalized.endsWith(suffix) && normalized.length > suffix.length,
  );
}

/** Collapsed, trimmed text — the only shape a snapshot stores. */
function collapse(value) {
  return value.replace(/\s+/g, " ").trim();
}

function fail(errors, { index = null, field = "snapshot", code, message }) {
  errors.push({ index, field, code, message });
  return null;
}

/**
 * Check one URL against rule 1 and return its trimmed form.
 * `required` distinguishes `repoLink` (mandatory) from `siteUrl` (optional).
 */
function checkUrl(value, { index, field, required, errors }) {
  if (value === null || value === undefined || value === "") {
    if (required) {
      fail(errors, {
        index,
        field,
        code: "url-missing",
        message: `${field} is required`,
      });
    }
    return null;
  }

  if (typeof value !== "string") {
    return fail(errors, {
      index,
      field,
      code: "url-invalid",
      message: `${field} must be a string`,
    });
  }

  const raw = value.trim();
  if (raw.startsWith("//") || raw.startsWith("\\\\")) {
    return fail(errors, {
      index,
      field,
      code: "url-relative",
      message: `${field} must be absolute, not protocol-relative: ${raw}`,
    });
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return fail(errors, {
      index,
      field,
      code: "url-invalid",
      message: `${field} is not a URL: ${raw}`,
    });
  }

  if (parsed.protocol.toLowerCase() !== "https:") {
    return fail(errors, {
      index,
      field,
      code: "url-scheme",
      message: `${field} must be https:, got ${parsed.protocol}`,
    });
  }

  if (parsed.username || parsed.password) {
    return fail(errors, {
      index,
      field,
      code: "url-credentials",
      message: `${field} must not carry credentials: ${raw}`,
    });
  }

  if (!isAllowedHost(parsed.hostname)) {
    return fail(errors, {
      index,
      field,
      code: "url-host",
      message: `${field} host is not allowlisted: ${parsed.hostname}`,
    });
  }

  return raw;
}

/** Check one description against rule 2 and return the stored form. */
function checkDescription(value, { index, errors }) {
  if (value !== undefined && value !== null && typeof value !== "string") {
    return fail(errors, {
      index,
      field: "description",
      code: "description-invalid",
      message: "description must be a string",
    });
  }

  const description = collapse(String(value ?? ""));
  if (!description) {
    return fail(errors, {
      index,
      field: "description",
      code: "description-empty",
      message: "description is empty",
    });
  }

  if (HTML_TAG.test(description)) {
    return fail(errors, {
      index,
      field: "description",
      code: "description-html",
      message: "description must not contain HTML tags",
    });
  }

  if (CONTROL_CHARACTER.test(description)) {
    return fail(errors, {
      index,
      field: "description",
      code: "description-control",
      message: "description must not contain control characters",
    });
  }

  if ([...description].length > MAX_DESCRIPTION_LENGTH) {
    return fail(errors, {
      index,
      field: "description",
      code: "description-too-long",
      message: `description is ${[...description].length} characters, max ${MAX_DESCRIPTION_LENGTH}`,
    });
  }

  return description;
}

/** Copy fields are stored collapsed; absent or non-string becomes null. */
function optionalText(value) {
  return typeof value === "string" && collapse(value) ? collapse(value) : null;
}

/**
 * The exact object shape a card consumes, built only from checked values.
 * Unknown fields are dropped so the snapshot cannot grow an unchecked surface.
 */
function canonicalItem(item, index, errors) {
  const name =
    typeof item.name === "string" && NAME_PATTERN.test(item.name) ? item.name : null;
  if (!name) {
    fail(errors, {
      index,
      field: "name",
      code: "name-invalid",
      message: `name must match ${NAME_PATTERN}: ${JSON.stringify(item.name)}`,
    });
  }

  const description = checkDescription(item.description, { index, errors });
  const repoLink = checkUrl(item.repoLink, {
    index,
    field: "repoLink",
    required: true,
    errors,
  });
  const siteUrl = checkUrl(item.siteUrl, {
    index,
    field: "siteUrl",
    required: false,
    errors,
  });

  const title = optionalText(item.title) ?? name;
  const imgSrc =
    typeof item.imgSrc === "string" && LOCAL_IMAGE.test(item.imgSrc.trim())
      ? item.imgSrc.trim()
      : null;
  const tags = Array.isArray(item.tags)
    ? item.tags.filter((tag) => typeof tag === "string" && collapse(tag))
    : [];

  return {
    name,
    title,
    description,
    problem: optionalText(item.problem),
    outcome: optionalText(item.outcome),
    imgSrc,
    alt: optionalText(item.alt) ?? `${title ?? "Project"} repository`,
    tags,
    repoLink,
    // Stored only when it differs from the repository; the card re-resolves.
    siteUrl: siteUrl && siteUrl !== repoLink ? siteUrl : null,
    isFeatured: Boolean(item.isFeatured),
  };
}

function isoOrNull(value) {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : value;
}

/**
 * Validate a snapshot candidate.
 *
 * Accepts either the snapshot object (`{ generatedAt, projects }`) or a bare
 * array of projects. Never throws for a rejected candidate.
 *
 * @param {unknown} candidate
 * @returns {{ ok: true, items: object[] } | { ok: false, errors: object[] }}
 */
export function validate(candidate) {
  const errors = [];

  const isSnapshotObject =
    candidate !== null && typeof candidate === "object" && !Array.isArray(candidate);
  const items = Array.isArray(candidate)
    ? candidate
    : isSnapshotObject
      ? candidate.projects
      : null;

  if (!Array.isArray(items)) {
    fail(errors, {
      code: "invalid-snapshot",
      message: "a snapshot is either an array of projects or { generatedAt, projects }",
    });
    return { ok: false, errors };
  }

  if (items.length === 0) {
    fail(errors, {
      code: "empty-snapshot",
      message: "an empty snapshot would blank the work list, so it is refused",
    });
  }

  if (items.length > MAX_PINNED_PROJECTS) {
    fail(errors, {
      code: "too-many-items",
      message: `${items.length} items, max ${MAX_PINNED_PROJECTS}`,
    });
  }

  if (isSnapshotObject && candidate.generatedAt !== undefined) {
    if (!isoOrNull(candidate.generatedAt)) {
      fail(errors, {
        field: "generatedAt",
        code: "invalid-generatedAt",
        message: "generatedAt must be an ISO 8601 timestamp",
      });
    }
  }

  const canonical = [];
  const seenRepoLinks = new Map();

  items.forEach((item, index) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      fail(errors, {
        index,
        code: "invalid-item",
        message: "each project must be an object",
      });
      return;
    }

    const project = canonicalItem(item, index, errors);
    if (typeof project.repoLink === "string") {
      const key = project.repoLink.toLowerCase();
      if (seenRepoLinks.has(key)) {
        fail(errors, {
          index,
          field: "repoLink",
          code: "duplicate-repoLink",
          message: `repoLink already used by item ${seenRepoLinks.get(key)}: ${project.repoLink}`,
        });
      } else {
        seenRepoLinks.set(key, index);
      }
    }
    canonical.push(project);
  });

  return errors.length > 0 ? { ok: false, errors } : { ok: true, items: canonical };
}

/** Readable one-line summary for logs and thrown errors. */
export function formatErrors(errors) {
  return errors
    .map(({ index, field, code, message }) =>
      index === null ? `${code}: ${message}` : `[${index}] ${field} ${code}: ${message}`,
    )
    .join("; ");
}

/**
 * The provenance note the snapshot carries in `$comment`, so a hand-edit or a
 * refresh that skips `validate()` is visible in the diff of the served file.
 */
export const SNAPSHOT_PROVENANCE = [
  "Generated file — do not edit by hand.",
  "Entries were seeded from PINNED_FALLBACK + PROJECT_OVERRIDES in src/data/projects.js (the cards the site served when the profile scrape failed).",
  "scripts/sync-projects.mjs rewrites this file from the live profile every 6 h, and every network refresh must pass validate() before it can touch it.",
].join(" ");

/** Deterministic bytes for a snapshot: fixed key order, 2-space JSON, one newline. */
export function serializeSnapshot({ generatedAt, projects }) {
  return `${JSON.stringify(
    { $comment: SNAPSHOT_PROVENANCE, generatedAt, projects },
    null,
    2,
  )}\n`;
}

/** `sha256` of exactly the bytes that get written — the run log's fingerprint. */
export function sha256Hex(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
