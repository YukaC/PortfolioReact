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
 *
 * ## Where the refresh actually happens
 *
 * The snapshot lives inside the bundle (`src/data/pinned-projects.json`), and a
 * serverless filesystem is read-only: on Vercel the write throws `EROFS`, the
 * handler answered 500, and the scheduled caller retried and failed every six
 * hours for ever — so `generatedAt` froze and the sitemap `lastmod`, the
 * JSON-LD `dateModified` and the page's "última actualización" all lied.
 *
 * The supported writer is the CI job `.github/workflows/projects-sync.yml`,
 * which checks the repository out with `contents: write`, runs
 * `node scripts/sync-projects.mjs` and commits the snapshot only when the file
 * changed. This route stays as the **self-hosted** trigger — a box where the
 * repository directory is writable — and it fails closed and honestly anywhere
 * else: a read-only target answers 501 with the job's name in the message,
 * instead of a 500 that looks like a bug in the sync.
 */
import { timingSafeEqual } from "node:crypto";
import { accessSync, constants as fsConstants } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";

import { SNAPSHOT_FILE } from "@/lib/projects-snapshot";

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

/**
 * Why this deployment cannot write the snapshot, or `null` when it can.
 *
 * Two signals, cheapest first: the platform says so (`VERCEL`), or the
 * directory that holds the file is not writable for this process (`EROFS` on a
 * read-only mount, `EACCES` on a locked-down container). `accessSync` is the
 * honest probe — it asks the same kernel permission `renameSync` will ask.
 */
function readOnlyTarget() {
  if (process.env.VERCEL === "1") {
    return "the deployment filesystem is read-only (VERCEL=1)";
  }

  try {
    accessSync(path.dirname(SNAPSHOT_FILE), fsConstants.W_OK);
    return null;
  } catch (error) {
    return `the snapshot directory is not writable (${error?.code ?? "unknown error"})`;
  }
}

/** The message a non-writable deployment gets: what to use instead, by name. */
const READ_ONLY_MESSAGE =
  "this deployment cannot write src/data/pinned-projects.json. The 6 h refresh is owned by the " +
  "projects-sync CI job (.github/workflows/projects-sync.yml), which runs `node scripts/sync-projects.mjs` " +
  "and commits the snapshot; this route only writes on a host whose repository directory is writable.";

async function handle(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return json({ ok: false, error: "cron_secret_not_configured" }, 503);
  }

  if (!secretsMatch(readSecret(request), secret)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const readOnly = readOnlyTarget();
  if (readOnly) {
    return json(
      {
        ok: false,
        error: "read-only-target",
        message: `${readOnly}: ${READ_ONLY_MESSAGE}`,
      },
      501,
    );
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
