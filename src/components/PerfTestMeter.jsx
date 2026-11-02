"use client";

import { useEffect } from "react";

/**
 * The overlay that mounts the meter, in `next dev` only.
 *
 * `/test` is a rewrite onto the real site (`next.config.js`), not a page. A page
 * of its own would only ever measure itself, and the meter measures the document
 * it runs on — the field, the reveals, the scrolling — so the route has to serve
 * the real thing and the measuring code has to arrive beside it. That is this
 * component's whole job: it is mounted by both root layouts, it renders nothing,
 * and in development it loads `src/perf/meter.js` into `document.body`, where the
 * meter builds its own bubble inside a closed shadow root.
 *
 * The import is dynamic on purpose. A static `import` would bind the meter into
 * the client bundle of every route that mounts the overlay — which is every route
 * — so a production build would ship a measuring probe nobody can reach. The
 * `NODE_ENV` gate is the other half of the same promise: `process.env.NODE_ENV` is
 * substituted at build time, so in a production build this effect is
 * `if ("production" !== "development") return;` and the whole module, dynamic
 * import included, drops out of the graph (S9).
 *
 * The session flag is what makes `/test` usable. The meter starts on the measuring
 * route (`/test`, `/test/es`, `/test/work/<slug>` — any of them) and then follows
 * the reader through client-side navigation, because a measuring session is
 * "until the tab closes", not "until the first link". A visitor who never opened
 * `/test` has no flag and never sees a bubble.
 */

/** Where the meter posts inside the dev server (the phone proxy keeps `/__perf/report`). */
const REPORT_ENDPOINT = "/api/perf-report";
/** The measuring route, as the browser sees it before the rewrite is applied. */
const TEST_PATH = "/test";
/** Marks the tab as a measuring session, so the bubble survives navigation. */
const SESSION_KEY = "pf-test";

/**
 * Set once per page load, outside React.
 *
 * React 19 runs every effect twice in development under Strict Mode, and the meter
 * is an IIFE that installs a rAF loop and a 100 ms sampler: two runs would mean two
 * meters on one page. The flag is module scope rather than a ref because the
 * component may be remounted without the module being evaluated again.
 */
let started = false;

/** True on `/test` and everything under it, exactly as the rewrite is declared. */
const isTestPath = (pathname) =>
  pathname === TEST_PATH || pathname.startsWith(`${TEST_PATH}/`);

export default function PerfTestMeter() {
  useEffect(() => {
    /* Dead code in a production build (see the note above): this is the gate. */
    if (process.env.NODE_ENV !== "development") return;
    if (started) return;

    const pathname = window.location.pathname;
    if (isTestPath(pathname)) sessionStorage.setItem(SESSION_KEY, "1");
    else if (sessionStorage.getItem(SESSION_KEY) !== "1") return;

    started = true;
    /* Read by the meter when it posts; the proxy's path stays the default. */
    window.__perfReportEndpoint = REPORT_ENDPOINT;

    /* Kept out of the initial bundle: this is the one import that must not exist
       in a build, so it is resolved at runtime instead of at module scope. */
    import("@/perf/meter").catch((error) => {
      /* A failed chunk request is not fatal for the site — and it must not be
         remembered as "already mounted", or a reload could never recover. */
      started = false;
      console.warn("[perf] the meter did not load", error);
    });
  }, []);

  return null;
}
