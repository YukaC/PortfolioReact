import { readProjectsSnapshot } from "@/lib/projects-snapshot";
import { sitemapEntries } from "@/lib/seo";

/**
 * §24 S1 — `/sitemap.xml`, generated instead of hand-written.
 *
 * `public/sitemap.xml` was a single `<loc>` for `/` with no `lastmod` and no
 * alternates, so the two translated documents and every project were invisible
 * to a crawler. This route replaces it from the same snapshot the pages render:
 * three home entries plus one entry per project per language, each carrying the
 * snapshot's `generatedAt` as `lastmod` and the reciprocal
 * `<xhtml:link rel="alternate" hreflang>` set (including `x-default`).
 *
 * The file it used to be is deleted rather than kept: a static `public/` asset
 * is served before a generated route, so leaving it in place would have shipped
 * the old sitemap and nothing would have failed loudly.
 *
 * `revalidate` matches the pages' ISR window (§17): a refreshed snapshot
 * produces a refreshed sitemap without a manual deploy.
 */
export const revalidate = 21600;

export default function sitemap() {
  const { generatedAt, projects } = readProjectsSnapshot();

  return sitemapEntries({ generatedAt, projects });
}
