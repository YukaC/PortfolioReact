/**
 * §17 — the render path reads the versioned snapshot and nothing else.
 *
 * This module used to scrape the public profile page and fan out one
 * `api.github.com` request per project at build time (6 of 7 of them answered
 * 403, so every "Website" link degraded in silence). Now the data is the
 * committed, validated `src/data/pinned-projects.json`: zero requests at build
 * and at render, and the build works with no network at all (§16.3 A5).
 *
 * The refresh happens out of band, once every 6 h: `scripts/sync-projects.mjs`
 * or `/api/sync-projects`. See `./projects-snapshot.js` for the write path.
 *
 * Same return shape the pages already consume — `src/pages/*.jsx` did not
 * change except for the ISR window.
 */
import { readProjectsSnapshot } from "./projects-snapshot.js";

/**
 * The pinned projects, from the snapshot. Kept async so the `getStaticProps`
 * call sites stay unchanged, and so a future cache layer does not ripple.
 *
 * @returns {Promise<object[]>} the six cards, in snapshot order
 */
export async function fetchPinnedProjects() {
  return readProjectsSnapshot().projects;
}
