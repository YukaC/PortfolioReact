#!/usr/bin/env node
/**
 * E2E sin JS — audit.md §20 / spec S11 (suite `e2e/no-js`).
 *
 * The visitor with JavaScript disabled is the cheapest end-to-end way to prove
 * that the hard rules of §20.4 hold, because every one of them is a property of
 * the *served* document: a client-side fix cannot hide a failure here.
 *
 * Four assertions per profile (1440×900 and 390×844):
 *
 *   1. words      the 26 `.w > span` are inside their clipping box and carry no
 *                 displacement (`transform: none` or the identity matrix) — the
 *                 §20.4-1 criterion: 0 palabras desplazadas, no JS;
 *   2. headings   the hero `h1` and the three section `h2` render their text;
 *   3. anchors    `#portfolio`, `#about` and `#contact` are reachable in one tap
 *                 at 390 px — a visible anchor, or a visible `<summary>` whose
 *                 `<details>` holds one (§20.4-2);
 *   4. controls   0 visible controls that only work with JS: `.js-only` nodes,
 *                 the work filters and "Copiar mail" are hidden, and the Bebop
 *                 tagline is not a `role="button"` (§20.4-3).
 *
 * Computed style and boxes, never the HTML source: §20.3 was found by reading the
 * rendered document, and a markup-only check would not have seen `display: none`.
 *
 *   pnpm e2e:nojs                          # reuse :4173, else start the build
 *   pnpm e2e:nojs --url http://…:3000      # measure a server already running
 *   pnpm e2e:nojs --json                   # machine-readable report
 *
 * `E2E_TRACE_DIR` turns on Playwright tracing and keeps a zip per failing
 * profile — the artefact the CI job uploads when the gate goes red.
 *
 * Exit codes: 0 all OK · 1 some assertion failed · 2 bad usage · 3 no server.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PORT = 4173;
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

/** §20.1 measured these two profiles; the contract is per profile. */
const PROFILES = [
  {
    name: "desktop 1440x900",
    context: { viewport: { width: 1440, height: 900 } },
    anchorsNeedTapTarget: false,
  },
  {
    name: "mobile 390x844",
    context: {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
    /* At 390 px the nav links are `display: none` in the base stylesheet, so the
       anchors have to come from something the reader can open without JS. */
    anchorsNeedTapTarget: true,
  },
];

const SECTION_ANCHORS = ["#portfolio", "#about", "#contact"];
const HEADINGS = ["h1", "#work-heading", "#about-heading", "#contact-heading"];

const results = [];

const record = (profile, id, ok, detail) => {
  results.push({ profile, id, ok, detail });
  console.log(`  ${ok ? "OK   " : "FALLA"} ${id} — ${detail}`);
};

const fail = (code, message) => {
  console.error(`e2e:nojs — ${message}`);
  process.exit(code);
};

const parseArgs = (argv) => {
  const args = { url: "", port: DEFAULT_PORT, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--url") args.url = argv[(i += 1)] ?? "";
    else if (arg === "--port") args.port = Number(argv[(i += 1)] ?? DEFAULT_PORT);
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") {
      console.log("uso: e2e:nojs [--url <url>] [--port <n>] [--json]");
      process.exit(0);
    } else if (arg.startsWith("-")) fail(2, `unknown argument: ${arg}`);
  }
  return args;
};

const isListening = (url) =>
  new Promise((resolve) => {
    const { hostname, port } = new URL(url);
    const socket = net.connect({ host: hostname, port: Number(port || 80) });
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.setTimeout(1500, () => done(false));
  });

const waitForServer = async (url, timeoutMs = 90_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url, { redirect: "manual" });
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  return false;
};

/** Reuse the server on the port, or start one from the existing build. */
async function ensureServer(args) {
  const url = args.url || `http://127.0.0.1:${args.port}`;
  if (await isListening(url)) {
    console.log(`[e2e:nojs] reusing the server on ${url}`);
    return { url, stop: () => {} };
  }
  if (args.url) fail(3, `no server answering at ${args.url}`);

  const built = existsSync(path.join(ROOT, ".next", "BUILD_ID"));
  if (!built) {
    fail(3, "no production build in .next — run `pnpm build` first, or pass --url");
  }

  console.log(`[e2e:nojs] starting: next start -p ${args.port}`);
  const child = spawn(process.execPath, [NEXT_BIN, "start", "-p", String(args.port)], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production" },
    stdio: "ignore",
    detached: true,
  });
  const stop = () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  };
  process.on("exit", stop);
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      stop();
      process.exit(130);
    });
  }

  if (!(await waitForServer(url))) {
    stop();
    fail(3, `the server never answered at ${url}`);
  }
  return { url, stop };
}

/* ---------------------------------------------------------------- in-page read */

/**
 * The anchors of §20.4-2: how many links to each section a scriptless document
 * offers, and whether the only thing hiding them is a native disclosure — the
 * `<details>/<summary>` the drawer uses, which one tap opens with no script at
 * all.
 */
const READ_ANCHORS = ({ anchors }) => {
  const shown = (element) => {
    if (!element) return false;
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility !== "visible") return false;
    if (Number(style.opacity) < 0.5) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 1 && rect.height > 1;
  };

  return anchors.map((hash) => {
    const links = [...document.querySelectorAll(`a[href="${hash}"]`)].map((link) => {
      const details = link.closest("details");
      const summary = details?.querySelector("summary") ?? null;
      return {
        visible: shown(link),
        inDetails: Boolean(details),
        /* One tap opens the disclosure; the link itself does not have to be
           visible while it is closed. */
        reachable: Boolean(details) && shown(summary),
      };
    });
    return {
      hash,
      visible: links.filter((link) => link.visible).length,
      viaDisclosure: links.filter((link) => link.reachable).length,
      total: links.length,
    };
  });
};

/**
 * Everything the four assertions need, in one trip: computed transform and both
 * boxes for every word, the rendered text of the four headings, and the controls
 * that only work with JS.
 */
const READ_NO_JS = ({ headings, mobile }) => {
  const identity = (transform) => {
    if (!transform || transform === "none") return true;
    const values = (transform.match(/-?[\d.]+(?:e[-+]?\d+)?/g) || []).map(Number);
    if (values.length < 6) return false;
    return [1, 0, 0, 1, 0, 0].every((expected, i) => Math.abs(values[i] - expected) < 0.001);
  };

  const shown = (element) => {
    if (!element) return false;
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility !== "visible") return false;
    if (Number(style.opacity) < 0.5) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 1 && rect.height > 1;
  };

  const words = [...document.querySelectorAll(".w > span")].map((span, index) => {
    const box = span.closest(".w");
    const style = getComputedStyle(span);
    const outer = box ? box.getBoundingClientRect() : { top: 0, bottom: 0 };
    const rect = span.getBoundingClientRect();
    const outside = rect.bottom <= outer.top + 1 || rect.top >= outer.bottom - 1;
    return {
      index,
      word: (span.textContent || "").trim(),
      identity: identity(style.transform),
      transform: style.transform,
      outside,
    };
  });

  const rendered = headings.map((selector) => {
    const element = document.querySelector(selector);
    if (!element) return { selector, present: false, text: "", rects: 0 };
    return {
      selector,
      present: true,
      text: (element.textContent || "").replace(/\s+/g, " ").trim(),
      rects: element.getClientRects().length,
    };
  });

  const jsOnly = [...document.querySelectorAll(".js-only")];
  const deadControls = [
    ...jsOnly.map((element) => ({ kind: "js-only", element })),
    ...[...document.querySelectorAll("[data-work-tab]")].map((element) => ({
      kind: "work tab",
      element,
    })),
    ...[...document.querySelectorAll("#copy-address, #contact button")].map((element) => ({
      kind: "copy address",
      element,
    })),
    ...(mobile
      ? [...document.querySelectorAll('[role="button"]')].map((element) => ({
          kind: "role=button",
          element,
        }))
      : []),
  ]
    .filter((entry) => shown(entry.element))
    .map((entry) => `${entry.kind} <${entry.element.tagName.toLowerCase()}>`);

  return {
    words,
    rendered,
    jsOnlyMarked: jsOnly.length,
    deadControls: [...new Set(deadControls)],
  };
};

/* ------------------------------------------------------------------ assertions */

function assertProfile(profile, state) {
  const displaced = state.words.filter((word) => !word.identity || word.outside);
  record(
    profile.name,
    "words/in-box",
    state.words.length > 0 && displaced.length === 0,
    displaced.length === 0
      ? `${state.words.length}/${state.words.length} words in their box, no displacement`
      : `${displaced.length} displaced: ${displaced
          .slice(0, 5)
          .map((word) => `"${word.word}" transform=${word.transform}${word.outside ? " outside-box" : ""}`)
          .join(" · ")}`,
  );

  const unreadable = state.rendered.filter(
    (heading) => !heading.present || heading.rects === 0 || heading.text.length === 0,
  );
  record(
    profile.name,
    "headings/readable",
    unreadable.length === 0,
    unreadable.length === 0
      ? state.rendered.map((heading) => `${heading.selector}: "${heading.text.slice(0, 28)}"`).join(" · ")
      : unreadable
          .map(
            (heading) =>
              `${heading.selector} ${heading.present ? `rects=${heading.rects} text=${JSON.stringify(heading.text)}` : "missing"}`,
          )
          .join(" · "),
  );

  const unreachable = state.targets.filter((target) => target.visible === 0);
  record(
    profile.name,
    "anchors/one-tap",
    unreachable.length === 0,
    unreachable.length === 0
      ? `${state.targets.map((target) => `${target.hash} ${target.visible} visible`).join(" · ")}${
          state.tapped ? " · revealed by one tap on the drawer summary" : ""
        }`
      : unreachable
          .map(
            (target) =>
              `${target.hash}: ${target.total} anchor(s), 0 visible${
                state.tapped ? " after tapping the drawer summary" : " and no disclosure to open"
              }`,
          )
          .join(" · "),
  );

  record(
    profile.name,
    "controls/no-js-only-visible",
    state.deadControls.length === 0,
    state.deadControls.length === 0
      ? `${state.jsOnlyMarked} .js-only node(s), none of them visible`
      : `${state.deadControls.length} control(s) that need JS are visible: ${state.deadControls
          .slice(0, 6)
          .join(" · ")}`,
  );
}

/* ------------------------------------------------------------------------ main */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const server = await ensureServer(args);
  const traceDir = process.env.E2E_TRACE_DIR ? path.resolve(process.env.E2E_TRACE_DIR) : "";
  if (traceDir) mkdirSync(traceDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_VERIFY_CHROMIUM
      ? { executablePath: process.env.BROWSER_VERIFY_CHROMIUM }
      : {}),
  });
  const stateByProfile = {};

  try {
    for (const profile of PROFILES) {
      console.log(`\n${profile.name} — javaScriptEnabled: false`);
      const before = results.filter((result) => !result.ok).length;
      const context = await browser.newContext({
        ...profile.context,
        javaScriptEnabled: false,
      });
      if (traceDir) await context.tracing.start({ screenshots: true, snapshots: true });
      const page = await context.newPage();
      await page.goto(server.url, { waitUntil: "load", timeout: 60_000 });
      const state = await page.evaluate(READ_NO_JS, {
        headings: HEADINGS,
        mobile: profile.anchorsNeedTapTarget,
      });

      /* §20.4-2 read literally: if a section anchor is not on screen, one tap on
         the document's own disclosure has to put it there. The tap is a real
         click on the `<summary>`, which is native HTML — no script involved. */
      state.targets = await page.evaluate(READ_ANCHORS, { anchors: SECTION_ANCHORS });
      state.tapped = false;
      if (state.targets.some((target) => target.visible === 0)) {
        const summary = page.locator("summary").first();
        if ((await summary.count()) > 0 && (await summary.isVisible())) {
          await summary.click();
          await page.waitForTimeout(250);
          state.tapped = true;
          state.targets = await page.evaluate(READ_ANCHORS, { anchors: SECTION_ANCHORS });
        }
      }

      stateByProfile[profile.name] = state;
      assertProfile(profile, state);

      if (traceDir) {
        const failed = results.filter((result) => !result.ok).length > before;
        if (failed) {
          const file = path.join(traceDir, `trace-no-js-${profile.name.replace(/[^a-z0-9]+/gi, "-")}.zip`);
          await context.tracing.stop({ path: file }).catch(() => {});
          console.log(`  [trace] ${file}`);
        } else {
          await context.tracing.stop().catch(() => {});
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server.stop();
  }

  const failed = results.filter((result) => !result.ok);
  if (args.json) {
    console.log(
      JSON.stringify(
        {
          server: server.url,
          results,
          state: Object.fromEntries(
            Object.entries(stateByProfile).map(([name, state]) => [
              name,
              {
                words: state.words.length,
                displaced: state.words.filter((word) => !word.identity || word.outside).length,
                headings: state.rendered,
                targets: state.targets,
                jsOnlyMarked: state.jsOnlyMarked,
                deadControls: state.deadControls,
              },
            ]),
          ),
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`\nRESUMEN: ${results.length - failed.length} OK · ${failed.length} FALLA`);
  }
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`e2e:nojs — ${error?.stack || error}`);
  process.exitCode = 1;
});
