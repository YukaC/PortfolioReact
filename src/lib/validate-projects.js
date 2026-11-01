/**
 * §17 — the single security check for project data.
 *
 * The site serves `src/data/pinned-projects.json` and nothing else, so this
 * module is the entire boundary between "a third party changed something" and
 * "the page ships it". Five rules, all-or-nothing (fail-closed):
 *
 *   1. links are `https:` only, on an allowlisted host, with no credentials and
 *      never protocol-relative — `javascript:`, `data:` and `//host/path` die
 *      here, not in the browser; what is stored is the *parsed* URL, so a tab
 *      or a space inside it cannot survive into the served markup;
 *   2. `name` matches `^[A-Za-z0-9._-]{1,100}$`, the description carries no
 *      markup, no control characters, collapsed whitespace and ≤ 240 chars,
 *      and every tag is collapsed and refused if it carries a control
 *      character or markup (a tag reaches the line-oriented `/llms.txt` and the
 *      JSON-LD);
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
 * Longest tag. A tag is a label on a row and a `ComputerLanguage` name in the
 * JSON-LD; anything longer is copy that belongs in the description.
 */
export const MAX_TAG_LENGTH = 40;

/**
 * Where a snapshot may point. Anything else — including a homepage the API
 * hands back — is rejected rather than silently rendered as a card action.
 */
const ALLOWED_HOSTS = ["github.com"];

/**
 * The two wildcards, in the same shape: a *deployment* host (`yuka.github.io`,
 * `portfolio-foo.vercel.app`) is a subdomain, and the bare apex is not one.
 * `vercel.app` used to sit in the exact list above, so every real Vercel
 * deployment was refused (`foo.vercel.app`) while the apex — which no
 * deployment uses — was accepted; `scripts/sync-projects.mjs` then dropped the
 * demo link in silence and the card served `siteUrl: null`.
 */
const ALLOWED_HOST_SUFFIXES = [".github.io", ".vercel.app"];

/**
 * C0 controls and DEL. In a description they are whitespace and collapse first;
 * in a tag they are refused *before* collapsing, so a newline cannot become the
 * separator of a forged line in `/llms.txt`.
 */
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

/** Cheap markup test: a tag needs a `<` and a closing `>`. React escapes the rest. */
const HTML_TAG = /<[^>]*>/;

/** Markup characters a tag may never carry, `#` excepted (`C#` is a language). */
const MARKUP_CHARACTER = /[<>`]/;

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
 * Check one URL against rule 1 and return its canonical form.
 * `required` distinguishes `repoLink` (mandatory) from `siteUrl` (optional).
 *
 * The stored value is `parsed.href`, not the trimmed input: the WHATWG parser is
 * what validated the URL, so it is also what gets written. `"…/Port\tfolio"`
 * trims to itself (the tab is interior) but parses to `"…/Portfolio"`, and the
 * raw string used to be the one that reached the card and the JSON-LD.
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

  return parsed.href;
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
 * Check every tag against rule 2 and return the stored list.
 *
 * A tag is not a description: it is joined into one line of `/llms.txt` (a
 * line-oriented file, where `"React\n\n## Fake heading"` would forge a
 * heading) and into the JSON-LD as a `ComputerLanguage` name. So it is
 * collapsed, deduplicated, and refused — not rewritten — when it carries a
 * control character or markup: fail-closed means the snapshot keeps serving
 * rather than shipping a laundered string nobody reviewed.
 */
function checkTags(value, { index, errors }) {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value)) {
    fail(errors, {
      index,
      field: "tags",
      code: "tags-invalid",
      message: "tags must be an array of strings",
    });
    return [];
  }

  const tags = [];
  value.forEach((raw) => {
    if (typeof raw !== "string") {
      fail(errors, {
        index,
        field: "tags",
        code: "tags-invalid",
        message: "every tag must be a string",
      });
      return;
    }

    // Tested before `collapse()`: collapsing turns `"React\n\n## Fake heading"`
    // into one innocent-looking line, which is exactly the string that used to
    // reach `/llms.txt`.
    if (CONTROL_CHARACTER.test(raw)) {
      fail(errors, {
        index,
        field: "tags",
        code: "tag-control",
        message: `tag must not contain control characters: ${JSON.stringify(raw)}`,
      });
      return;
    }

    const tag = collapse(raw);
    if (!tag) return;

    if (MARKUP_CHARACTER.test(tag)) {
      fail(errors, {
        index,
        field: "tags",
        code: "tag-markup",
        message: `tag must not contain markup: ${tag}`,
      });
      return;
    }

    if ([...tag].length > MAX_TAG_LENGTH) {
      fail(errors, {
        index,
        field: "tags",
        code: "tag-too-long",
        message: `tag is ${[...tag].length} characters, max ${MAX_TAG_LENGTH}`,
      });
      return;
    }

    if (!tags.includes(tag)) tags.push(tag);
  });

  return tags;
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
  const tags = checkTags(item.tags, { index, errors });

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
  "Every entry is a pinned repository from the profile, with copy and screenshots from PROJECT_OVERRIDES in src/data/projects.js; the file was first seeded from that same set.",
  "The projects-sync CI job runs scripts/sync-projects.mjs every 6 h, and every network refresh must pass validate() before it can touch this file.",
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
