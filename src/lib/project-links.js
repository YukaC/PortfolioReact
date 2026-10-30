/**
 * Where a project card points. Pure and dependency-free so the ISR fetch and
 * the card share one decision, and tests can cover it without network access.
 */

/** Trimmed URL string, or null when the value is empty or not a string. */
function normalizeUrl(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolve the card destination and whether the secondary repo action survives.
 *
 * Order: a `siteUrl` set in PROJECT_OVERRIDES wins, then the repo's "Website"
 * field read from the GitHub API, then the repository itself. The small repo
 * action is dropped when it would lead to the same place as the card.
 *
 * @param {{ repoUrl?: string, siteUrlFromOverride?: string|null, siteUrlFromApi?: string|null }} [links]
 * @returns {{ siteUrl: string|null, repoUrl: string|null, showRepoLink: boolean }}
 */
export function resolveProjectLinks({
  repoUrl,
  siteUrlFromOverride,
  siteUrlFromApi,
} = {}) {
  const repo = normalizeUrl(repoUrl);
  const siteUrl =
    normalizeUrl(siteUrlFromOverride) ?? normalizeUrl(siteUrlFromApi) ?? repo;

  return {
    siteUrl,
    repoUrl: repo,
    showRepoLink: Boolean(repo) && siteUrl !== repo,
  };
}
