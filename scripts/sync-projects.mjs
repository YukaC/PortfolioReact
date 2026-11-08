/**
 * §17 — the 6-hourly refresh: profile pins + homepages in, validated snapshot out.
 *
 * Writes the same file the render path reads (`src/data/pinned-projects.json`)
 * through the same validation and the same atomic write the API endpoint uses
 * (`commitProjectsSnapshot`). Nothing here can publish an unvalidated card:
 * if one item breaks a rule, `validate()` fails the whole run and the previous
 * snapshot keeps being served.
 *
 *   GITHUB_TOKEN=… node scripts/sync-projects.mjs
 *   node scripts/sync-projects.mjs --public
 *
 * Two ways in, one way out:
 *
 *   - with a token, one GraphQL request returns the pins and their homepages;
 *   - with `--public`, no token is needed: the profile page is read for the
 *     pinned repository names (the profile still ships them) and each of those
 *     repositories is read from the public REST API — one request per repo,
 *     against the unauthenticated limit (60/h), which is why the fan-out is a
 *     loop and not a crawl. GitHub needs a `User-Agent`, and the pins keep the
 *     order the profile gives them.
 *
 * Both fetch strategies hand the same `node` shape to `toProject()` and both
 * end in `commitProjectsSnapshot()`: `validate()` first, then the atomic write
 * with its `sha256` in the log. Nothing reaches the file that would not have
 * been accepted had a token been present.
 *
 * No token and no `--public` → exit 1, snapshot untouched (degrade, never wipe).
 * Any fetch, parse, API or validation failure behaves the same way. The sha256
 * of the written bytes goes to the run log, so a refresh is attributable from
 * CI output alone.
 *
 * Network facts: two hosts (`github.com`, `api.github.com`), a 4 s timeout on
 * every request, and `redirect: "error"` so a request can never be walked
 * off-host.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  GITHUB_USERNAME,
  MAX_PINNED_PROJECTS,
  PROJECT_OVERRIDES,
} from "../src/data/projects.js";
import { resolveProjectLinks } from "../src/lib/project-links.js";
import { commitProjectsSnapshot } from "../src/lib/projects-snapshot.js";
import {
  NAME_PATTERN,
  formatErrors,
  isAllowedHost,
} from "../src/lib/validate-projects.js";

const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
const PUBLIC_REPO_ENDPOINT = "https://api.github.com/repos";
const PROFILE_URL = `https://github.com/${GITHUB_USERNAME}`;
const USER_AGENT = "PortfolioReact-projects-sync/1.0";

/** A slow GitHub must never hold the cron job open. */
const REQUEST_TIMEOUT_MS = 4000;

/**
 * What the public profile page still emits around its pins: the list wrapper,
 * one `<li>` per pin, and the pin's own name in `<span class="repo">`. Same
 * markers the render path read before the snapshot existed, so the profiles
 * that worked then are parsed here today.
 */
const PINNED_LIST_MARKER = "js-pinned-items-reorder-list";
const PINNED_ITEM_MARKER = "pinned-item-list-item js-pinned-item-list-item";
const PINNED_NAME = /<span class="repo">([^<]+)<\/span>/;

const PINS_QUERY = `query PinnedProjects($login: String!, $count: Int!) {
  user(login: $login) {
    pinnedItems(first: $count, types: [REPOSITORY]) {
      nodes {
        ... on Repository {
          name
          description
          url
          homepageUrl
          primaryLanguage { name }
        }
      }
    }
  }
}`;

/**
 * Keep a homepage only when rule 1 would accept it. A custom domain that is not
 * allowlisted is dropped with a log line — never silently, and never by
 * shipping a link the snapshot rules forbid.
 */
function normalizeHomepage(value, name, log) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const raw = value.trim();
  try {
    const { protocol, hostname } = new URL(raw);
    if (protocol !== "https:" || !isAllowedHost(hostname)) {
      log(`[sync-projects] dropped off-allowlist homepage for ${name}: ${hostname} (${protocol})`);
      return null;
    }
    return raw;
  } catch {
    log(`[sync-projects] dropped unparseable homepage for ${name}: ${raw}`);
    return null;
  }
}

/**
 * Turn one pinned repository into the card the site renders: override copy
 * wins, the repository fields are the fallback, and the links are resolved by
 * the same helper the card uses.
 *
 * @param {{ name: string, description?: string|null, url: string,
 *   homepageUrl?: string|null, primaryLanguage?: { name?: string }|null }} node
 */
export function toProject(node, { log = () => {} } = {}) {
  const override = PROJECT_OVERRIDES[node.name];
  if (!override) {
    // L10 (prod-polish): a pin without an override key renders generic copy.
    log(`[sync-projects] no PROJECT_OVERRIDES entry for ${node.name}: card copy will degrade`);
  }
  const copy = override ?? {};
  const title = copy.title ?? node.name;
  const links = resolveProjectLinks({
    repoUrl: node.url,
    siteUrlFromOverride: copy.siteUrl,
    siteUrlFromApi: normalizeHomepage(node.homepageUrl, node.name, log),
  });
  const language = node.primaryLanguage?.name ?? null;

  return {
    name: node.name,
    title,
    description: copy.description ?? node.description ?? "Open-source project on GitHub.",
    problem: copy.problem ?? null,
    outcome: copy.outcome ?? null,
    imgSrc: copy.imgSrc ?? null,
    alt: copy.alt ?? `${title} repository`,
    tags: copy.tags?.length ? copy.tags : language ? [language] : [],
    repoLink: links.repoUrl,
    siteUrl: links.siteUrl === links.repoUrl ? null : links.siteUrl,
    isFeatured: Boolean(copy.isFeatured),
  };
}

/** One GraphQL round trip; any non-2xx, error payload or timeout is fatal. */
async function fetchPinnedItems(token) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    // No redirects at all: a redirect is how a request leaves the allowlist.
    redirect: "error",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      query: PINS_QUERY,
      variables: { login: GITHUB_USERNAME, count: MAX_PINNED_PROJECTS },
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    throw new Error(`GitHub GraphQL: ${payload.errors[0]?.message ?? "unknown error"}`);
  }

  const nodes = payload?.data?.user?.pinnedItems?.nodes;
  if (!Array.isArray(nodes)) {
    throw new Error("GitHub GraphQL: no pinnedItems in the response");
  }
  return nodes.filter(Boolean);
}

/**
 * The pinned repository names, in the profile's order.
 *
 * Pure on purpose: the profile markup is the one thing that can drift without
 * any API changing, and a pin whose name cannot be read has to fail the run
 * instead of shrinking the list — six pins rendering as five is exactly the
 * silent loss this mode exists to end.
 *
 * @param {string} html
 * @returns {string[]}
 */
export function parsePinnedNames(html) {
  if (typeof html !== "string" || html === "") {
    throw new Error("the profile page came back empty");
  }

  const start = html.indexOf(PINNED_LIST_MARKER);
  if (start < 0) {
    throw new Error(`the profile page carries no ${PINNED_LIST_MARKER} list: the markup changed`);
  }

  const blocks = html.slice(start).split(PINNED_ITEM_MARKER).slice(1);
  if (blocks.length === 0) {
    throw new Error("the pinned list carries no items: the markup changed");
  }

  const names = [];
  for (const block of blocks) {
    const name = block.match(PINNED_NAME)?.[1]?.trim();
    if (!name) {
      throw new Error("a pinned item carries no repository name: the markup changed");
    }
    // The name goes into `repoLink`, so it is refused here with the snapshot's
    // own rule rather than laundered into a URL the validator would reject.
    if (!NAME_PATTERN.test(name)) {
      throw new Error(`the profile returned a pinned name the snapshot refuses: ${JSON.stringify(name)}`);
    }
    if (!names.includes(name)) names.push(name);
  }

  return names;
}

/** The profile page, same timeout and the same ban on redirects as the API. */
async function fetchProfileHtml() {
  const response = await fetch(PROFILE_URL, {
    redirect: "error",
    headers: { Accept: "text/html", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`GitHub profile HTTP ${response.status}`);
  }

  return response.text();
}

/**
 * One pinned repository, mapped onto the shape the GraphQL path produces, so
 * `toProject()` below never learns which endpoint answered.
 *
 * The repository URL is *built from the pin*, not read from the payload: the
 * allowlist is about hosts, and a URL this file constructs cannot point a card
 * somewhere `validate()` would have to reject.
 */
async function fetchPublicNode(name) {
  const url = `${PUBLIC_REPO_ENDPOINT}/${GITHUB_USERNAME}/${encodeURIComponent(name)}`;
  const response = await fetch(url, {
    redirect: "error",
    headers: { Accept: "application/vnd.github+json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const exhausted = response.headers.get("x-ratelimit-remaining") === "0";
    throw new Error(
      `GitHub REST HTTP ${response.status} for ${name}${
        exhausted ? " (unauthenticated rate limit exhausted: retry later or set GITHUB_TOKEN)" : ""
      }`,
    );
  }

  const repo = await response.json();
  const fullName = typeof repo?.full_name === "string" ? repo.full_name : "";
  if (fullName.toLowerCase() !== `${GITHUB_USERNAME}/${name}`.toLowerCase()) {
    throw new Error(
      `GitHub REST answered ${JSON.stringify(fullName)} for ${name}: refusing a repository that is not the pin`,
    );
  }

  return {
    name,
    description: typeof repo.description === "string" ? repo.description : null,
    url: `https://github.com/${GITHUB_USERNAME}/${name}`,
    homepageUrl: typeof repo.homepage === "string" ? repo.homepage : null,
    primaryLanguage:
      typeof repo.language === "string" && repo.language ? { name: repo.language } : null,
  };
}

/** Profile names → one REST request each, in the profile's order. */
async function fetchPublicPinnedItems({ log = () => {} } = {}) {
  const names = parsePinnedNames(await fetchProfileHtml());
  log(
    `[sync-projects] public mode: ${names.length} pin(s) on ${PROFILE_URL}: ${names.join(", ")}`,
  );

  const nodes = [];
  for (const name of names.slice(0, MAX_PINNED_PROJECTS)) {
    nodes.push(await fetchPublicNode(name));
    log(`[sync-projects] public mode: read ${GITHUB_USERNAME}/${name}`);
  }
  return nodes;
}

/**
 * Fetch, map, validate, write. Shared by the CLI below and by the cron Route
 * Handler (`src/app/api/sync-projects/route.js`), so the endpoint and the
 * scheduled job cannot drift apart.
 *
 * @param {{ token?: string, public?: boolean, file?: string, log?: (line: string) => void }} [options]
 * @returns {Promise<{ ok: true, sha256: string, items: number, generatedAt: string }
 *   | { ok: false, reason: string, message: string, errors?: object[] }>}
 */
export async function syncProjects({
  token = process.env.GITHUB_TOKEN,
  public: publicMode = false,
  file,
  log = console.log,
} = {}) {
  if (!publicMode && !token) {
    return {
      ok: false,
      reason: "missing-token",
      message: "GITHUB_TOKEN is not set and --public was not asked for: snapshot kept as is",
    };
  }

  let nodes;
  try {
    nodes = publicMode ? await fetchPublicPinnedItems({ log }) : await fetchPinnedItems(token);
  } catch (error) {
    return {
      ok: false,
      reason: "fetch-failed",
      message: error instanceof Error ? error.message : String(error),
    };
  }

  if (nodes.length === 0) {
    return {
      ok: false,
      reason: "no-pins",
      message: "the profile returned no pinned repositories: snapshot kept as is",
    };
  }

  const projects = nodes.slice(0, MAX_PINNED_PROJECTS).map((node) => toProject(node, { log }));

  // L10 again, from the other side: an override whose repo was renamed never
  // matches a pin, so the card it was written for falls back to generic copy.
  const pinnedNames = new Set(nodes.map((node) => node.name));
  for (const key of Object.keys(PROJECT_OVERRIDES)) {
    if (!pinnedNames.has(key)) {
      log(`[sync-projects] PROJECT_OVERRIDES.${key} matches no current pin`);
    }
  }

  const result = commitProjectsSnapshot(projects, { file, log });

  if (!result.ok) {
    return {
      ok: false,
      reason: "validation-failed",
      message: `snapshot rejected, nothing written: ${formatErrors(result.errors)}`,
      errors: result.errors,
    };
  }

  return {
    ok: true,
    sha256: result.sha256,
    items: result.projects.length,
    generatedAt: result.generatedAt,
  };
}

/**
 * CLI entry: exit non-zero on any failure, and never write in that case.
 *
 *   node scripts/sync-projects.mjs            # GraphQL, needs GITHUB_TOKEN
 *   node scripts/sync-projects.mjs --public   # profile page + public REST
 */
async function main() {
  const result = await syncProjects({ public: process.argv.includes("--public") });

  if (!result.ok) {
    console.error(`[sync-projects] FAILED (${result.reason}): ${result.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `[sync-projects] ok items=${result.items} generatedAt=${result.generatedAt} sha256=${result.sha256}`,
  );
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  main().catch((error) => {
    console.error("[sync-projects] FAILED:", error);
    process.exitCode = 1;
  });
}
