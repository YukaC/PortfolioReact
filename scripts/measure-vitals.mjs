#!/usr/bin/env node
/**
 * Lab vitals budget for the three served routes.
 *
 * What it protects: "the site feels fast" is not shippable evidence. This runs
 * the production build in a headless Chromium with a 4x CPU throttle (the
 * mobile reality, not a workstation), measures LCP / CLS / TBT per route and
 * exits non-zero when a budget is missed — so a regression in the field, the
 * shader, or the font loading shows up as a failing check instead of a feeling.
 *
 *   pnpm build && pnpm measure:vitals
 *   pnpm measure:vitals --url http://127.0.0.1:3000     # measure a live server
 *   pnpm measure:vitals --json                          # machine-readable
 *
 * The numbers are a lab approximation of the field metrics, not a Lighthouse
 * score: LCP and CLS come straight from the browser's own PerformanceObserver
 * entries, TBT is the long-task time over 50 ms in the measured window.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROUTES = ["/", "/es", "/pt"];

/** Mobile reality: a mid-range phone screen, 4x slower CPU than this machine. */
const DEVICE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
};
const CPU_THROTTLE = 4;
/** How long the page is watched after `load` before the numbers are read. */
const OBSERVE_MS = 4000;

export const BUDGET = {
  lcp: Number(process.env.VITALS_BUDGET_LCP ?? 2500),
  cls: Number(process.env.VITALS_BUDGET_CLS ?? 0.1),
  tbt: Number(process.env.VITALS_BUDGET_TBT ?? 300),
};

/** Collected before any page script runs, so no entry is missed. */
const COLLECT = () => {
  window.__vitals = { lcp: 0, cls: 0, tbt: 0 };
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__vitals.lcp = entry.startTime;
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    /* browser without the entry type */
  }
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__vitals.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  } catch {
    /* browser without the entry type */
  }
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__vitals.tbt += Math.max(0, entry.duration - 50);
      }
    }).observe({ type: "longtask", buffered: true });
  } catch {
    /* browser without the entry type */
  }
};

const parseArgs = (argv) => {
  const args = { url: "", json: false, port: 3100, strict: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--url") args.url = argv[(i += 1)] ?? "";
    else if (arg === "--port") args.port = Number(argv[(i += 1)] ?? args.port);
    else if (arg === "--json") args.json = true;
    else if (arg === "--no-strict") args.strict = false;
  }
  return args;
};

const waitForServer = async (url, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return true;
    } catch {
      /* not listening yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
};

const startServer = async (port) => {
  if (!existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
    throw new Error(
      "No production build found. Run `pnpm build` first, or pass --url to measure a running server.",
    );
  }
  const child = spawn(
    process.execPath,
    [path.join(ROOT, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(port)],
    { cwd: ROOT, env: { ...process.env, NODE_ENV: "production" }, stdio: ["ignore", "pipe", "pipe"] },
  );
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  return child;
};

const measureRoute = async (browser, baseUrl, route) => {
  const context = await browser.newContext(DEVICE);
  const page = await context.newPage();
  await page.addInitScript(COLLECT);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });

  const started = Date.now();
  await page.goto(`${baseUrl}${route}`, { waitUntil: "load", timeout: 60_000 });
  await page.waitForTimeout(OBSERVE_MS);

  const vitals = await page.evaluate(() => window.__vitals ?? { lcp: 0, cls: 0, tbt: 0 });
  const elapsed = Date.now() - started;
  await context.close();

  return {
    route,
    lcp: Math.round(vitals.lcp),
    cls: Number(vitals.cls.toFixed(4)),
    tbt: Math.round(vitals.tbt),
    wallMs: elapsed,
  };
};

const verdict = (row) => ({
  lcp: row.lcp > 0 && row.lcp <= BUDGET.lcp,
  cls: row.cls <= BUDGET.cls,
  tbt: row.tbt <= BUDGET.tbt,
});

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  let server = null;
  const baseUrl = args.url || `http://127.0.0.1:${args.port}`;

  try {
    if (!args.url) {
      server = await startServer(args.port);
    }
    if (!(await waitForServer(baseUrl))) {
      throw new Error(`No server answered at ${baseUrl}`);
    }

    const browser = await chromium.launch({ headless: true });
    const rows = [];
    try {
      for (const route of ROUTES) {
        rows.push(await measureRoute(browser, baseUrl, route));
      }
    } finally {
      await browser.close();
    }

    const results = rows.map((row) => ({ ...row, ok: verdict(row) }));
    const failed = results.filter(
      (row) => !row.ok.lcp || !row.ok.cls || !row.ok.tbt,
    );

    if (args.json) {
      console.log(JSON.stringify({ budget: BUDGET, routes: results }, null, 2));
    } else {
      const pad = (value, width) => String(value).padEnd(width);
      console.log(
        `\nLab vitals · mobile ${DEVICE.viewport.width}px · CPU ${CPU_THROTTLE}x` +
          ` · budget LCP ≤ ${BUDGET.lcp}ms · CLS ≤ ${BUDGET.cls} · TBT ≤ ${BUDGET.tbt}ms\n`,
      );
      console.log(
        `${pad("route", 8)}${pad("LCP", 10)}${pad("CLS", 10)}${pad("TBT", 10)}verdict`,
      );
      for (const row of results) {
        const marks = [
          row.ok.lcp ? "" : "lcp",
          row.ok.cls ? "" : "cls",
          row.ok.tbt ? "" : "tbt",
        ].filter(Boolean);
        console.log(
          `${pad(row.route, 8)}${pad(`${row.lcp}ms`, 10)}${pad(row.cls.toFixed(3), 10)}${pad(`${row.tbt}ms`, 10)}${marks.length ? `FAIL (${marks.join(", ")})` : "pass"}`,
        );
      }
      console.log("");
    }

    if (failed.length > 0 && args.strict) process.exitCode = 1;
  } finally {
    if (server) {
      server.kill("SIGTERM");
    }
  }
};

main().catch((error) => {
  console.error(`measure-vitals: ${error.message}`);
  process.exitCode = 1;
});
