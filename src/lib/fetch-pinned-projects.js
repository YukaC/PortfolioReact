import {
  GITHUB_USERNAME,
  PINNED_FALLBACK,
  PROJECT_OVERRIDES,
} from "@/data/projects";

const PROFILE_USER_AGENT =
  "Mozilla/5.0 (compatible; PortfolioReact/1.0; +https://github.com/YukaC/PortfolioReact)";

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

function mapPinnedRepo(repo) {
  const override = PROJECT_OVERRIDES[repo.name] ?? {};
  const title = override.title ?? repo.name;
  const description =
    override.description ??
    repo.description ??
    "Open-source project on GitHub.";

  return {
    name: repo.name,
    title,
    description,
    // Local screenshots only — GitHub OG images rate-limit and clash with dark UI.
    imgSrc: override.imgSrc ?? null,
    alt: override.alt ?? `${title} repository`,
    tags: buildTags(repo, override),
    repoLink: repo.url,
  };
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

    return pinnedRepos.map(mapPinnedRepo);
  } catch (error) {
    console.warn(
      "[fetchPinnedProjects] Falling back to static pins:",
      error instanceof Error ? error.message : error,
    );
    return PINNED_FALLBACK;
  }
}
