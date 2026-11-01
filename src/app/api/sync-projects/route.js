/**
 * §17 — the scheduled refresh endpoint (`cron` at minute 0 of every 6th hour).
 *
 * This was `src/pages/api/sync-projects.js`; it is a Route Handler now, so the
 * Pages Router tree could be deleted outright (audit.md §16.3 A5) and there is
 * one router in the repo. The contract is the same one, method for method and
 * field for field:
 *
 * Authorization: a `CRON_SECRET` bearer token (`Authorization: Bearer …`) or the
 * `x-cron-secret` header, compared in constant time. Without a configured secret
 * the route refuses to run at all, so a deploy that forgets the variable cannot
 * leave an open GitHub-fetching endpoint behind.
 *
 * The work itself is `syncProjects()` from `scripts/sync-projects.mjs`: one
 * GraphQL request (4 s timeout, no redirects), then `validate()` and the atomic
 * write from `src/lib/projects-snapshot.js`. A rejected payload writes nothing
 * and answers 502 with the rule that failed — the previous snapshot keeps being
 * served (fail-closed).
 *
 * On success the three prerendered homes are revalidated on demand
 * (`revalidatePath`, the App Router equivalent of `res.revalidate`), which is
 * what actually replaces the served HTML within the 6 h ISR window.
 */
import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";

import { syncProjects } from "../../../../scripts/sync-projects.mjs";

/** Pages that render the snapshot; revalidated after a successful write. */
const REVALIDATE_PATHS = ["/", "/es", "/pt"];

/** The route reads a file and a secret: never prerendered, never cached. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Secret from either header; trim, because CI YAML loves trailing spaces. */
function readSecret(request) {
  const authorization = request.headers.get("authorization");
  if (typeof authorization === "string") {
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }
  const header = request.headers.get("x-cron-secret");
  return typeof header === "string" ? header.trim() : null;
}

/** Constant-time compare that never throws on length mismatch. */
function secretsMatch(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function handle(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return json({ ok: false, error: "cron_secret_not_configured" }, 503);
  }

  if (!secretsMatch(readSecret(request), secret)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const result = await syncProjects({ token: process.env.GITHUB_TOKEN });

  if (!result.ok) {
    // Already logged by the write path; the snapshot on disk is untouched.
    const status = result.reason === "missing-token" ? 503 : 502;
    return json(
      {
        ok: false,
        error: result.reason,
        message: result.message,
        errors: result.errors ?? null,
      },
      status,
    );
  }

  const revalidated = [];
  const failed = [];
  for (const path of REVALIDATE_PATHS) {
    try {
      revalidatePath(path);
      revalidated.push(path);
    } catch (error) {
      failed.push({
        path,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return json(
    {
      ok: true,
      items: result.items,
      generatedAt: result.generatedAt,
      sha256: result.sha256,
      revalidated,
      revalidateFailed: failed,
    },
    200,
  );
}

/* The cron sends `POST` (Vercel) and `curl` sends `GET`; both do the same thing,
   which is what the Pages Router handler allowed too. */

export async function GET(request) {
  return handle(request);
}

export async function POST(request) {
  return handle(request);
}
