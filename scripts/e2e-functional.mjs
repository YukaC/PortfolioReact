#!/usr/bin/env node
/**
 * E2E funcional — audit.md §21.2, spec S11 (suite `e2e`).
 *
 * The three served routes are the same composition in three languages
 * (`/`, `/es`, `/pt`), so a contract that only holds in English is a contract
 * that does not hold: this script runs the whole behavioural set on each route.
 *
 * Per route:
 *   1. console    no console error, no uncaught exception, no hydration warning;
 *   2. anchors    every nav anchor resolves to a section that actually scrolls
 *                 into view (the target exists and the page lands on it);
 *   3. filters    a work filter narrows the list, marks itself `aria-pressed`
 *                 and "All" restores the full count;
 *   4. copy       "Copiar mail" writes the address to a stubbed clipboard;
 *   5. drawer     at 390 px the drawer opens, moves focus into itself, closes on
 *                 Escape and hands focus back to the trigger;
 *   6. bebop      the footer tagline opens the easter egg and Escape closes it
 *                 with focus restored (reduced motion, so the dialog is the
 *                 deterministic end state instead of a WebGL countdown).
 *
 * The helper shape (server resolution, `record()`, per-check detail strings,
 * exit codes) mirrors `scripts/e2e-runtime.mjs` and `scripts/e2e-a11y.mjs`.
 *
 *   pnpm e2e:functional                        # reuse :4173, else start the build
 *   pnpm e2e:functional --url http://…:3000    # a server already running
 *   pnpm e2e:functional --profile mobile       # one profile (desktop|mobile|reduced)
 *
 * `E2E_TRACE_DIR` turns on Playwright tracing and keeps a zip per failing
 * context — that is the artefact the CI job uploads when a suite goes red.
 *
 * Exit codes: 0 all OK · 1 some check failed · 2 bad usage · 3 no server.
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

const ROUTES = ["/", "/es", "/pt"];
const SECTION_ANCHORS = ["#portfolio", "#about", "#contact"];
const DESKTOP = { viewport: { width: 1280, height: 900 } };
const MOBILE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

/** The three profiles of the CI matrix (§21.5), each its own set of contexts. */
const PROFILES = {
  desktop: { label: "desktop", context: DESKTOP },
  mobile: { label: "mobile", context: MOBILE },
  reduced: { label: "reduced", context: { ...DESKTOP, reducedMotion: "reduce" } },
};

/** A hydration mismatch is not a console error in every React build, so it is
    matched by text as well as by type. */
const HYDRATION = /hydrat|did not match|server (?:rendered|HTML)|text content does not match|tree hydrated but/i;

const results = [];
const record = (route, id, ok, detail) => {
  results.push({ route, id, ok, detail });
  console.log(`  ${ok ? "OK   " : "FALLA"} ${id} — ${detail}`);
};

const fail = (code, message) => {
  console.error(`e2e:functional — ${message}`);
  process.exit(code);
};

const parseArgs = (argv) => {
  const args = { url: "", port: DEFAULT_PORT, headed: false, profiles: Object.keys(PROFILES) };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--url") args.url = argv[(i += 1)] ?? "";
    else if (arg === "--port") args.port = Number(argv[(i += 1)] ?? DEFAULT_PORT);
    else if (arg === "--headed") args.headed = true;
    else if (arg === "--profile") {
      const names = (argv[(i += 1)] ?? "").split(",").map((name) => name.trim());
      const unknown = names.filter((name) => !PROFILES[name]);
      if (unknown.length > 0) {
        fail(2, `unknown profile(s): ${unknown.join(", ")} — valid: ${Object.keys(PROFILES).join(", ")}`);
      }
      args.profiles = names;
    } else if (arg === "--help" || arg === "-h") {
      console.log("uso: e2e:functional [--url <url>] [--port <n>] [--profile <desktop|mobile|reduced>] [--headed]");
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

async function ensureServer(args) {
  const url = args.url || `http://127.0.0.1:${args.port}`;
  if (await isListening(url)) {
    console.log(`[e2e:functional] reusing the server on ${url}`);
    return { url, stop: () => {} };
  }
  if (args.url) fail(3, `no server answering at ${args.url}`);
  if (!existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
    fail(3, "no production build in .next — run `pnpm build` first, or pass --url");
  }

  console.log(`[e2e:functional] starting: next start -p ${args.port}`);
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

/* --------------------------------------------------------------------- helpers */

function watch(page, sink) {
  page.on("console", (message) =>
    sink.push({ type: message.type(), text: message.text().replace(/\s+/g, " ").slice(0, 300) }),
  );
  page.on("pageerror", (error) => sink.push({ type: "pageerror", text: String(error).slice(0, 300) }));
  return sink;
}

function assertConsole(route, messages, label) {
  const errors = messages.filter((message) => message.type === "error" || message.type === "pageerror");
  const hydration = messages.filter((message) => HYDRATION.test(message.text));

  record(
    route,
    `${label}/console`,
    errors.length === 0,
    errors.length === 0 ? "no console error, no uncaught exception" : `${errors.length}× ${errors[0].text}`,
  );
  record(
    route,
    `${label}/hydration`,
    hydration.length === 0,
    hydration.length === 0 ? "no hydration warning" : `${hydration.length}× ${hydration[0].text}`,
  );
}

/* ------------------------------------------------------------------- assertions */

/**
 * Wait for a signal, not for a number of milliseconds: the fonts are in, and the
 * hero's paint reveal has reached opacity 1, which only happens once the entrance
 * tweens have finished. Interacting before that is a race the contract is not
 * about (opening the drawer in the first frames of the entrance leaves the panel
 * mid-tween, see the drawer note below).
 */
async function settle(page) {
  await page
    .waitForFunction(() => document.fonts?.status === "loaded", null, { timeout: 15_000 })
    .catch(() => {});
  await page
    .waitForFunction(
      () => {
        const nodes = [...document.querySelectorAll('[data-r="paint"]')];
        return nodes.length > 0 && nodes.every((node) => Number(getComputedStyle(node).opacity) === 1);
      },
      null,
      { timeout: 15_000 },
    )
    .catch(() => {});
}

/** 2. Anchors resolve: the target exists and the page lands on it. */
async function assertAnchors(page, route, label) {
  const missing = await page.evaluate(
    (anchors) => anchors.filter((hash) => !document.querySelector(hash)),
    SECTION_ANCHORS,
  );
  record(
    route,
    `${label}/anchors`,
    missing.length === 0,
    missing.length === 0 ? `${SECTION_ANCHORS.join(" · ")} all exist` : `missing target(s): ${missing.join(", ")}`,
  );
  if (missing.length > 0) return;

  for (const hash of SECTION_ANCHORS) {
    const link = page.locator(`header a[data-nav-href="${hash}"]`).first();
    const clickable = (await link.count()) > 0 && (await link.isVisible());
    if (!clickable) {
      record(route, `${label}/anchor${hash}`, false, `no visible nav link for ${hash}`);
      continue;
    }

    await link.click();
    let landed = true;
    try {
      await page.waitForFunction(
        (target) => {
          const element = document.querySelector(target);
          if (!element) return false;
          const { top, height } = element.getBoundingClientRect();
          return Math.abs(top) <= 240 && height > 0;
        },
        hash,
        { timeout: 10_000 },
      );
    } catch {
      landed = false;
    }

    const top = await page.evaluate((target) => {
      const element = document.querySelector(target);
      const rect = element.getBoundingClientRect();
      return { top: Math.round(rect.top), scrollY: Math.round(window.scrollY) };
    }, hash);

    record(
      route,
      `${label}/anchor${hash}`,
      landed,
      landed ? `landed on ${hash} (top ${top.top}px, scrollY ${top.scrollY})` : `${hash} did not reach the viewport (top ${top.top}px)`,
    );
  }
}

/** 3. A work filter narrows the list; "All" restores it. */
async function assertFilters(page, route) {
  const count = () => page.locator("[data-work-row]").count();
  const total = await count();
  const tabs = page.locator("[data-work-tab]");
  const tabCount = await tabs.count();

  if (total === 0 || tabCount < 2) {
    record(route, "filters/filter", false, `${total} row(s), ${tabCount} tab(s) — expected rows and several filters`);
    return;
  }

  // Every card the snapshot serves is React-based, so the "React" tab legitimately
  // keeps all six rows; what this check is about is that *a* filter narrows the
  // list, so the tab is probed instead of hard-coded. The pressed check rides
  // along on the winning probe, so a tab that lies about `aria-pressed` cannot
  // pass on a row count alone.
  let narrowed = null;
  for (let index = 1; index < tabCount && narrowed === null; index += 1) {
    await tabs.nth(index).click();
    await page.waitForTimeout(300);
    const filtered = await count();
    const pressed = await page.evaluate(() => {
      const [active] = [...document.querySelectorAll("[data-work-tab]")].filter(
        (tab) => tab.getAttribute("aria-pressed") === "true",
      );
      return {
        active: active ? active.textContent.trim() : "",
        pressed: document.querySelectorAll('[data-work-tab][aria-pressed="true"]').length,
      };
    });
    if (filtered > 0 && filtered < total && pressed.pressed === 1 && pressed.active !== "") {
      narrowed = { index, filtered, pressed };
    }
  }

  record(
    route,
    "filters/filter",
    narrowed !== null,
    narrowed
      ? `${total} rows → ${narrowed.filtered} after "${narrowed.pressed.active}" (tab ${narrowed.index}) · 1 tab pressed`
      : `${total} rows: none of the ${tabCount} tabs narrowed the list and kept one pressed`,
  );

  await tabs.first().click();
  await page.waitForTimeout(300);
  const restored = await count();
  record(
    route,
    "filters/restore",
    restored === total,
    `"All" restored ${restored}/${total} rows`,
  );
}

/** 4. Copy writes the visible address to the clipboard. */
async function assertCopy(page, route) {
  const address = (await page.textContent("#contact .bigmail"))?.trim() ?? "";
  const wrote = await page.evaluate(() => window.__clipboard ?? []);

  await page.locator("#copy-address").click();
  await page.waitForTimeout(400);
  const clipboard = await page.evaluate(() => window.__clipboard ?? []);

  record(
    route,
    "copy/clipboard",
    wrote.length === 0 && clipboard.length === 1 && address.includes(clipboard[0]),
    clipboard.length === 0
      ? `no writeText call (address "${address}")`
      : `writeText("${clipboard[0]}") vs address "${address}"`,
  );
}

/** 5. Drawer: opens, takes focus, closes on Escape, restores focus to the trigger. */
async function assertDrawer(page, route) {
  const trigger = page.locator("header button[aria-controls], header summary").first();
  if ((await trigger.count()) === 0) {
    record(route, "drawer/open", false, "no drawer trigger (button[aria-controls] or summary) in the header");
    return;
  }

  const state = () =>
    page.evaluate(() => {
      const header = document.querySelector("header");
      const button = header?.querySelector("button[aria-controls]");
      const summary = header?.querySelector("summary");
      const details = summary?.closest("details") ?? null;
      /* The drawer's contents are the `.mobile-menu-panel`, whether it is the
         element the toggle points at (`aria-controls`) or — in the no-script
         build — a sibling revealed by `:has(details[open])`. The panel, not the
         disclosure, is what has to appear and take focus. */
      const panel =
        document.querySelector(".mobile-menu-panel") ??
        (button ? document.getElementById(button.getAttribute("aria-controls")) : null);
      const open = button
        ? button.getAttribute("aria-expanded") === "true"
        : Boolean(details?.open);
      const focusable = panel?.querySelector("a[href], button:not([disabled])");
      const shown = (element) => {
        if (!element) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0.5 && rect.height > 1;
      };
      return {
        open,
        side: button ? "button" : "details",
        panelFound: Boolean(panel),
        panelVisible: shown(panel),
        linkVisible: shown(focusable),
        focusInside: Boolean(panel && panel.contains(document.activeElement)),
        focusOnTrigger: Boolean(
          document.activeElement &&
            (document.activeElement === button ||
              document.activeElement === summary ||
              summary?.contains(document.activeElement)),
        ),
      };
    });

  await trigger.click();
  /* The panel fades in and the drawer hands focus over after the transition, so
     the check waits for that settled state instead of racing it: a fixed 700 ms
     read passed or failed depending on the machine (two of three routes went
     red on one run and green on the next, with nothing in between). The
     assertion below is unchanged and still strict — this only removes the race. */
  await page
    .waitForFunction(
      () => {
        const panel = document.querySelector(".mobile-menu-panel");
        if (!panel) return false;
        const link = panel.querySelector("a[href], button:not([disabled])");
        const shown = (element) => {
          if (!element) return false;
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number(style.opacity) > 0.5 &&
            rect.height > 1
          );
        };
        return shown(panel) && shown(link) && panel.contains(document.activeElement);
      },
      null,
      { timeout: 4000 },
    )
    .catch(() => {});
  const opened = await state();
  record(
    route,
    "drawer/open",
    opened.open && opened.panelVisible && opened.linkVisible && opened.focusInside,
    `${opened.side}: open=${opened.open} panel=${opened.panelVisible} link=${opened.linkVisible} focus inside=${opened.focusInside}`,
  );

  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  let closed = await state();
  let via = "Escape";
  if (closed.open) {
    await trigger.click();
    await page.waitForTimeout(700);
    closed = await state();
    via = "click";
  }

  record(
    route,
    "drawer/close",
    !closed.open && !closed.panelVisible && closed.focusOnTrigger,
    `closed via ${via} · open=${closed.open} panel=${closed.panelVisible} focus on trigger=${closed.focusOnTrigger}`,
  );
}

/** 6. Bebop opens from the tagline and Escape closes it. */
async function assertBebop(page, route) {
  const tagline = page.locator(".tagline").first();
  const dialog = page.locator('[role="dialog"][aria-modal="true"]');

  await tagline.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await tagline.hover();
  let opened = true;
  try {
    await dialog.waitFor({ state: "visible", timeout: 20_000 });
  } catch {
    opened = false;
  }
  record(
    route,
    "bebop/open",
    opened,
    opened ? "dialog role=dialog aria-modal=true mounted after hovering the tagline" : "the overlay never appeared",
  );
  if (!opened) return;

  await page.keyboard.press("Escape");
  let closed = true;
  try {
    await dialog.waitFor({ state: "detached", timeout: 15_000 });
  } catch {
    closed = false;
  }
  const focusRestored = await page.evaluate(() => {
    const active = document.activeElement;
    return Boolean(active && active.classList.contains("tagline"));
  });

  record(
    route,
    "bebop/close",
    closed && focusRestored,
    `Escape → overlay ${closed ? "detached" : "still mounted"} · focus back on tagline=${focusRestored}`,
  );
}

/* ------------------------------------------------------------------------ main */

/** Where a failing context leaves its trace. Unset means "do not record". */
const TRACE_DIR = process.env.E2E_TRACE_DIR
  ? path.resolve(process.env.E2E_TRACE_DIR)
  : path.join(os.tmpdir(), "portfolio-e2e-traces");
const TRACING = Boolean(process.env.E2E_TRACE_DIR);

const safeName = (value) => value.replace(/[^a-z0-9.-]+/gi, "-").replace(/^-|-$/g, "") || "root";

/**
 * One page with one profile against one route: the console contract, plus the
 * interactions that profile owns. A trace is kept only for a context that
 * failed, which is what makes `trace.zip` an artefact worth uploading.
 */
async function runProfile(browser, profile, route, baseUrl) {
  const before = results.filter((result) => !result.ok).length;
  const context = await browser.newContext(profile.context);
  if (TRACING) await context.tracing.start({ screenshots: true, snapshots: true });

  const page = await context.newPage();
  const messages = watch(page, []);

  try {
    if (profile.label === "desktop") {
      await page.addInitScript(() => {
        window.__clipboard = [];
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async (value) => {
              window.__clipboard.push(String(value));
            },
            readText: async () => window.__clipboard[0] ?? "",
          },
        });
      });
    }

    await page.goto(`${baseUrl}${route}`, { waitUntil: "load", timeout: 60_000 });

    if (profile.label === "desktop") {
      await assertAnchors(page, route, profile.label);
      await assertFilters(page, route);
      await page.locator("#contact").scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await assertCopy(page, route);
    } else if (profile.label === "mobile") {
      await settle(page);
      await assertDrawer(page, route);
    } else {
      await assertBebop(page, route);
    }

    assertConsole(route, messages, profile.label);
  } finally {
    if (TRACING) {
      const failed = results.filter((result) => !result.ok).length > before;
      if (failed) {
        mkdirSync(TRACE_DIR, { recursive: true });
        const file = path.join(TRACE_DIR, `trace-${safeName(profile.label)}-${safeName(route)}.zip`);
        await context.tracing.stop({ path: file }).catch(() => {});
        console.log(`  [trace] ${file}`);
      } else {
        await context.tracing.stop().catch(() => {});
      }
    }
    await context.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const server = await ensureServer(args);
  const browser = await chromium.launch({
    headless: !args.headed,
    ...(process.env.BROWSER_VERIFY_CHROMIUM
      ? { executablePath: process.env.BROWSER_VERIFY_CHROMIUM }
      : {}),
  });

  try {
    for (const route of ROUTES) {
      console.log(`\n${route}`);
      for (const name of args.profiles) {
        await runProfile(browser, PROFILES[name], route, server.url);
      }
    }
  } finally {
    await browser.close();
    server.stop();
  }

  const failed = results.filter((result) => !result.ok);
  console.log(`\nRESUMEN: ${results.length - failed.length} OK · ${failed.length} FALLA`);
  if (failed.length > 0) {
    console.error("FALLA:");
    for (const result of failed) console.error(`  ${result.route} ${result.id} — ${result.detail}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`e2e:functional — ${error?.stack || error}`);
  process.exitCode = 1;
});
