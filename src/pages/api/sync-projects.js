/**
 * §17 — the scheduled refresh endpoint (`cron` at minute 0 of every 6th hour).
 *
 * Authorization: a `CRON_SECRET` bearer token (`Authorization: Bearer …`) or the
 * `x-cron-secret` header, compared in constant time. Without a configured
 * secret the route refuses to run at all, so a deploy that forgets the variable
 * cannot leave an open GitHub-fetching endpoint behind.
 *
 * The work itself is `syncProjects()` from `scripts/sync-projects.mjs`: one
 * GraphQL request (4 s timeout, no redirects), then `validate()` and the atomic
 * write from `src/lib/projects-snapshot.js`. A rejected payload writes nothing
 * and answers 502 with the rule that failed — the previous snapshot keeps being
 * served (fail-closed).
 *
 * On success the three prerendered homes are revalidated on demand, which is
 * what actually replaces the served HTML within the 6 h ISR window.
 */
import { timingSafeEqual } from "node:crypto";

import { syncProjects } from "../../../scripts/sync-projects.mjs";

/** Pages that render the snapshot; revalidated after a successful write. */
const REVALIDATE_PATHS = ["/", "/es", "/pt"];

/** Secret from either header; trim, because CI YAML loves trailing spaces. */
function readSecret(req) {
  const authorization = req.headers.authorization;
  if (typeof authorization === "string") {
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }
  const header = req.headers["x-cron-secret"];
  return typeof header === "string" ? header.trim() : null;
}

/** Constant-time compare that never throws on length mismatch. */
function secretsMatch(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  res.setHeader("Cache-Control", "no-store");

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({ ok: false, error: "cron_secret_not_configured" });
  }

  if (!secretsMatch(readSecret(req), secret)) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  const result = await syncProjects({ token: process.env.GITHUB_TOKEN });

  if (!result.ok) {
    // Already logged by the write path; the snapshot on disk is untouched.
    const status = result.reason === "missing-token" ? 503 : 502;
    return res.status(status).json({
      ok: false,
      error: result.reason,
      message: result.message,
      errors: result.errors ?? null,
    });
  }

  const revalidated = [];
  const failed = [];
  for (const path of REVALIDATE_PATHS) {
    try {
      await res.revalidate(path);
      revalidated.push(path);
    } catch (error) {
      failed.push({ path, message: error instanceof Error ? error.message : String(error) });
    }
  }

  return res.status(200).json({
    ok: true,
    items: result.items,
    generatedAt: result.generatedAt,
    sha256: result.sha256,
    revalidated,
    revalidateFailed: failed,
  });
}
