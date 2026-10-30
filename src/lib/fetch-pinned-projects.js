import {
  GITHUB_USERNAME,
  MAX_PINNED_PROJECTS,
  PINNED_FALLBACK,
  PROJECT_OVERRIDES,
} from "@/data/projects";
import { resolveProjectLinks } from "@/lib/project-links";

const PROFILE_USER_AGENT =
  "Mozilla/5.0 (compatible; PortfolioReact/1.0; +https://github.com/YukaC/PortfolioReact)";

/** Mirrors the page ISR window, so the demo links refresh with the pins. */
const HOMEPAGE_REVALIDATE_SECONDS = 3600;

/** Short timeout: a slow GitHub must never hold up the page render. */
const HOMEPAGE_TIMEOUT_MS = 4000;

/**
 * Parse pinned repos from the public GitHub profile HTML.
 * Pins are public — no API token required.
 */
function parsePinnedReposFromProfileHtml(html, username) {
  const listMatch = html.match(
    /js-pinned-items-reorder-list[\s\S]*?(?=<div class="js-yearly-contributions|id="js-contribution|$)/,
  );
  if (!listMatch) return [];

  const itemBlocks = listMatch[0]
    .split(/pinned-item-list-item js-pinned-item-list-item/)
    .slice(1);

  return itemBlocks
    .map((itemHtml) => {
      const nameMatch = itemHtml.match(/class="repo">([^<]+)</);
      const name = nameMatch?.[1]?.trim();
      if (!name) return null;

      const descriptionMatch = itemHtml.match(
        /pinned-item-desc[^>]*>\s*([\s\S]*?)\s*</,
      );
      const languageMatch = itemHtml.match(
        /itemprop="programmingLanguage">([^<]+)</,
      );
      const rawDescription = descriptionMatch?.[1]
        ?.replace(/\s+/g, " ")
        .trim();

      return {
        name,
        description: rawDescription || null,
        url: `https://github.com/${username}/${name}`,
        primaryLanguage: languageMatch?.[1]?.trim() || null,
      };
    })
    .filter(Boolean);
}

function buildTags(repo, override) {
  if (override?.tags?.length) return override.tags;
  if (repo.primaryLanguage) return [repo.primaryLanguage];
  return [];
}

function mapPinnedRepo(repo, homepageFromApi = null) {
  const override = PROJECT_OVERRIDES[repo.name] ?? {};
  const title = override.title ?? repo.name;
  const description =
    override.description ??
    repo.description ??
    "Open-source project on GitHub.";
  const links = resolveProjectLinks({
    repoUrl: repo.url,
    siteUrlFromOverride: override.siteUrl,
    siteUrlFromApi: homepageFromApi,
  });

  return {
    name: repo.name,
    title,
    description,
    problem: override.problem ?? null,
    outcome: override.outcome ?? null,
    // Local screenshots only — GitHub OG images rate-limit and clash with dark UI.
    imgSrc: override.imgSrc ?? null,
    alt: override.alt ?? `${title} repository`,
    tags: buildTags(repo, override),
    repoLink: links.repoUrl,
    siteUrl: links.siteUrl,
    isFeatured: Boolean(override.isFeatured),
  };
}

/**
 * Read a repo's "Website" field from the public GitHub API.
 * Server-side only and tolerant to rate limits, so a miss degrades to the
 * repository URL instead of breaking the render.
 */
async function fetchRepoHomepage(name) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${encodeURIComponent(name)}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": PROFILE_USER_AGENT,
        },
        next: { revalidate: HOMEPAGE_REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(HOMEPAGE_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      throw new Error(`GitHub API HTTP ${response.status}`);
    }

    const payload = await response.json();
    return typeof payload?.homepage === "string" ? payload.homepage : null;
  } catch (error) {
    console.warn(
      `[fetchRepoHomepage] No homepage for ${name}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/** One request per project, in parallel; each failure only affects its card. */
async function fetchHomepages(names) {
  const entries = await Promise.all(
    names.map(async (name) => [name, await fetchRepoHomepage(name)]),
  );
  return Object.fromEntries(entries);
}

/**
 * Fetch pinned repositories by reading the public GitHub profile page.
 * Falls back to PINNED_FALLBACK when the request fails or returns nothing.
 */
export async function fetchPinnedProjects() {
  try {
    const response = await fetch(`https://github.com/${GITHUB_USERNAME}`, {
      headers: {
        "User-Agent": PROFILE_USER_AGENT,
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub profile HTTP ${response.status}`);
    }

    const html = await response.text();
    const pinnedRepos = parsePinnedReposFromProfileHtml(
      html,
      GITHUB_USERNAME,
    );

    if (pinnedRepos.length === 0) {
      throw new Error("No pinned repositories found on profile");
    }

    const pinned = pinnedRepos.slice(0, MAX_PINNED_PROJECTS);
    const homepages = await fetchHomepages(pinned.map((repo) => repo.name));

    return pinned.map((repo) =>
      mapPinnedRepo(repo, homepages[repo.name] ?? null),
    );
  } catch (error) {
    console.warn(
      "[fetchPinnedProjects] Falling back to static pins:",
      error instanceof Error ? error.message : error,
    );
    return PINNED_FALLBACK.slice(0, MAX_PINNED_PROJECTS);
  }
}
