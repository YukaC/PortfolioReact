/**
 * §24 S6 — one URL per project, derived from the snapshot and nothing else.
 *
 * The slug is the repository name verbatim (`PortfolioReact`,
 * `cowboy-bebop-grub-theme`): it is the identifier the snapshot already
 * validates (`^[A-Za-z0-9._-]{1,100}$`), it is the same string the work list
 * keys its rows with, and it needs no lossy transform — a kebab-case pass over
 * `MuniDgoSaaS` invents a spelling nobody recognises. A project without a
 * usable name falls back to the last segment of its `repoLink`, which the
 * snapshot guarantees is an allowlisted `https:` URL.
 *
 * Nothing here reads a file or a locale: the same slug answers for `/work/…`,
 * `/es/work/…` and `/pt/work/…`, so the three URLs of a project can never
 * drift apart. Pure by design, so `src/lib/seo.test.js` can pin the derivation.
 */

/** A slug has to survive a URL path unchanged: no empty segment, no `.`/`..`. */
export const SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Names that would turn the segment into a path traversal or a no-op. */
const RESERVED = new Set([".", ".."]);

function isUsableSlug(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 100 &&
    !RESERVED.has(value) &&
    SLUG_PATTERN.test(value)
  );
}

/** The repository name at the end of a GitHub URL (`…/YukaC/PortfolioReact`). */
export function repoName(repoLink) {
  if (typeof repoLink !== "string") return "";
  try {
    const { pathname } = new URL(repoLink);
    const [last] = pathname.split("/").filter(Boolean).slice(-1);
    return last ? decodeURIComponent(last).replace(/\.git$/i, "") : "";
  } catch {
    return "";
  }
}

/**
 * The slug a project's pages live at.
 *
 * Throws instead of inventing a value: a build with an unusable project name
 * must stop, not publish a URL that silently differs from the row it links to.
 *
 * @param {{ name?: string, repoLink?: string } | string} project
 * @returns {string}
 */
export function projectSlug(project) {
  if (typeof project === "string") {
    if (isUsableSlug(project)) return project;
    throw new Error(`[project-slugs] ${JSON.stringify(project)} is not a usable slug`);
  }

  const name = typeof project?.name === "string" ? project.name.trim() : "";
  if (isUsableSlug(name)) return name;

  const fallback = repoName(project?.repoLink);
  if (isUsableSlug(fallback)) return fallback;

  throw new Error(
    `[project-slugs] cannot derive a slug from ${JSON.stringify(project?.name ?? project?.repoLink)}`,
  );
}

/** Every slug of a list, in the list's order. */
export function projectSlugs(projects) {
  return (Array.isArray(projects) ? projects : []).map((project) => projectSlug(project));
}

/**
 * The project that owns a URL segment, or `null`.
 *
 * `generateStaticParams` and the page body both go through this, so the closed
 * set of routes and the lookup inside a route can never disagree.
 */
export function findProjectBySlug(projects, slug) {
  if (!Array.isArray(projects) || typeof slug !== "string") return null;
  return projects.find((project) => projectSlug(project) === slug) ?? null;
}

/**
 * Site-relative path of a project page for one locale (`/work/x`, `/es/work/x`).
 *
 * English is untranslated and lives at the root, which is why it contributes no
 * prefix at all — the same rule the home pages follow (`/`, `/es`, `/pt`).
 *
 * @param {string} locale
 * @param {object|string} project
 * @returns {string}
 */
export function projectPath(locale, project) {
  const prefix = locale && locale !== "en" ? `/${locale}` : "";
  return `${prefix}/work/${projectSlug(project)}`;
}
