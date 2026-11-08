import { SITE_URL } from "@/data/constants";

/**
 * §24 S5 — the AI-crawler decision, made explicitly instead of inherited.
 *
 * Before this file the site shipped a `public/robots.txt` with a bare
 * `Allow: /` under `*`: every assistant crawler was permitted, nobody had
 * decided it, and nothing in the repository said so. The audit's rule (§26) is
 * that a decision has to be written down with its reason, not left implicit —
 * so each of the eight user agents the audit names gets its own block, and the
 * block says `Allow: /`.
 *
 * The decision is **allow**. The reasons, for the record:
 *
 *   • this is a personal portfolio whose entire purpose is to be found,
 *     quoted and attributed, and every fact a crawler needs (the role, the
 *     place, the stack, the training, the projects and their repositories) is
 *     already in the server-rendered HTML with no script;
 *   • `OAI-SearchBot`, `PerplexityBot` and `ChatGPT-User` index and cite the
 *     page, which is exactly the surface GEO asks for;
 *   • `Google-Extended` and `Applebot-Extended` only govern model training, not
 *     indexing: blocking them would remove the site from the assistants'
 *     answers without protecting anything a reader came for;
 *   • `CCBot` is the same trade for Common Crawl;
 *   • there is no private area to keep out. `/api/sync-projects` is guarded by
 *     `CRON_SECRET`, not by obscurity, so it needs no `Disallow` line.
 *
 * Serving a different document to a named agent (cloaking) is not an option
 * here at all (§26): every user agent gets the same bytes.
 *
 * This is `app/robots.js` rather than a static `public/robots.txt` so the
 * sitemap URL cannot drift from `SITE_URL`; the public file it replaces is
 * deleted, because `public/` would otherwise shadow this route.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "ClaudeBot",
  "Google-Extended",
  "CCBot",
  "Applebot-Extended",
];

export default function robots() {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
