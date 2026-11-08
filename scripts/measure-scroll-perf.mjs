#!/usr/bin/env node
/**
 * Scroll de página completa — audit.md §21.3, spec S11 (suite `perf`).
 *
 * Two hard numbers, measured while the page really scrolls to the bottom:
 *
 *   p95 de frame ≤ 24 ms   ·  jank ≤ 2 %   (frame internals longer than 50 ms)
 *
 * and one budget read from the DOM instead of from the clock: the total surface
 * carrying `filter`/`backdrop-filter` must stay **≤ 2 Mpx** at 1440×900 (§21.3,
 * P1-2 measured 4.83 Mpx before the program). Nested surfaces add up, because
 * each one is its own compositing cost — the number is "how many megapixels of
 * blur the compositor has to keep alive", not "how many elements".
 *
 * Profiles (§21.2 + §21.3):
 *   desktop      1440×900, no CPU throttle
 *   mobile-4x    390×844, DPR 2, CPU 4× slower — the phone reality
 *   software-gl  1440×900 in SwiftShader (`--use-gl=angle --use-angle=swiftshader`),
 *                which is the gate that forces the quality tiers to exist (§18.6):
 *                it is the profile where a 150 ms frame used to be normal.
 *
 * The scroll is real input (wheel events), not `window.scrollTo`, so Lenis, the
 * scrub timelines and the reveal observer all take part; frame intervals are
 * recorded by one rAF loop inside the page for the whole gesture.
 *
 *   pnpm measure:scroll                       # desktop + mobile-4x
 *   pnpm measure:scroll --profile desktop     # one profile
 *   pnpm measure:scroll --software-gl         # only the SwiftShader gate
 *   pnpm measure:scroll --swiftshader         # run the chosen profiles on the CPU rasterizer
 *   pnpm measure:scroll --headed              # watch it, GPU included
 *   pnpm measure:scroll --out scroll.json     # artefact for CI
 *
 * **Renderer.** The launch — and therefore the renderer — comes from
 * `visual-baseline.mjs`: hardware (`--use-gl=angle --use-angle=gl`) by default,
 * SwiftShader only when a profile asks for it (`software-gl`) or when
 * `--swiftshader` opts out. Without that, Chromium reports SwiftShader on this
 * GPU host and `desktop` measures the same machine as `software-gl` while
 * claiming to be a desktop profile (L14). Every profile prints the renderer
 * string it ran on.
 *
 * Exit codes: 0 budgets met · 1 a budget was missed · 2 bad usage · 3 no server.
 */
import { spawn } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { launchChromium, rendererOf } from "./visual-baseline.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PORT = 4173;
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

/** §21.3 */
const BUDGET = {
  p95Ms: Number(process.env.SCROLL_BUDGET_P95 ?? 24),
  jank: Number(process.env.SCROLL_BUDGET_JANK ?? 0.02),
  blurMpx: Number(process.env.SCROLL_BUDGET_BLUR ?? 2),
};

/** A frame longer than this is jank (RAIL: the reader noticed the stall). */
const JANK_MS = 50;

const PROFILES = {
  desktop: {
    name: "desktop 1440x900",
    context: { viewport: { width: 1440, height: 900 } },
    throttle: 1,
    measureBlur: true,
  },
  "mobile-4x": {
    name: "mobile 390x844 · cpu 4x",
    context: {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
    throttle: 4,
    measureBlur: false,
  },
  "software-gl": {
    name: "software GL 1440x900 (SwiftShader)",
    context: { viewport: { width: 1440, height: 900 } },
    throttle: 1,
    measureBlur: false,
    swiftshader: true,
  },
};

const results = [];
const record = (profile, id, ok, detail) => {
  results.push({ profile, id, ok, detail });
  console.log(`  ${ok ? "OK   " : "FAIL"} ${id} — ${detail}`);
};

const fail = (code, message) => {
  console.error(`measure:scroll — ${message}`);
  process.exit(code);
};

const parseArgs = (argv) => {
  const args = { url: "", port: DEFAULT_PORT, only: null, out: "", headed: false, software: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--url") args.url = argv[(i += 1)] ?? "";
    else if (arg === "--port") args.port = Number(argv[(i += 1)] ?? DEFAULT_PORT);
    else if (arg === "--out") args.out = argv[(i += 1)] ?? "";
    else if (arg === "--headed") args.headed = true;
    else if (arg === "--swiftshader") args.software = true;
    else if (arg === "--software-gl") args.only = ["software-gl"];
    else if (arg === "--profile") args.only = (argv[(i += 1)] ?? "").split(",").map((name) => name.trim());
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "uso: measure:scroll [--url <url>] [--port <n>] [--profile <name,…>] [--software-gl] [--swiftshader] [--headed] [--out <file>]",
      );
      process.exit(0);
    } else if (arg.startsWith("-")) fail(2, `unknown argument: ${arg}`);
  }
  if (args.only) {
    const unknown = args.only.filter((name) => !PROFILES[name]);
    if (unknown.length > 0) fail(2, `unknown profile(s): ${unknown.join(", ")} — valid: ${Object.keys(PROFILES).join(", ")}`);
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
    console.log(`[measure:scroll] reusing the server on ${url}`);
    return { url, stop: () => {} };
  }
  if (args.url) fail(3, `no server answering at ${args.url}`);
  if (!existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
    fail(3, "no production build in .next — run `pnpm build` first, or pass --url");
  }

  console.log(`[measure:scroll] starting: next start -p ${args.port}`);
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

/* ---------------------------------------------------------------- in-page probes */

/** Starts the frame recorder: one rAF loop, alive for the whole gesture. */
const START_RECORDER = () => {
  window.__scroll = { frames: [], stop: false, started: performance.now() };
  let last = performance.now();
  const tick = (now) => {
    window.__scroll.frames.push(now - last);
    last = now;
    if (!window.__scroll.stop) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

/** Total surface with `filter`/`backdrop-filter`, in CSS px², biggest first. */
const READ_BLUR = () => {
  const hasFilter = (value) => Boolean(value) && value !== "none";
  const areas = [];
  let total = 0;

  for (const element of document.querySelectorAll("*")) {
    const style = getComputedStyle(element);
    if (!hasFilter(style.filter) && !hasFilter(style.backdropFilter)) continue;
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    const area = rect.width * rect.height;
    total += area;
    areas.push({
      selector: `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).trim().split(/\s+/).slice(0, 3).join(".")}` : ""}`,
      px: Math.round(area),
      filter: hasFilter(style.filter) ? style.filter : "",
      backdrop: hasFilter(style.backdropFilter) ? style.backdropFilter : "",
    });
  }

  areas.sort((a, b) => b.px - a.px);
  return { mpx: Number((total / 1e6).toFixed(2)), top: areas.slice(0, 6) };
};

const percentile = (values, share) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(share * sorted.length) - 1));
  return sorted[index];
};

/* --------------------------------------------------------------------- the gesture */

/** Scroll to the bottom with real wheel input; the page records every interval. */
async function scrollThrough(page) {
  const total = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  await page.evaluate(START_RECORDER);

  let previous = -1;
  let stalls = 0;
  for (let i = 0; i < 400; i += 1) {
    await page.mouse.wheel(0, 420);
    await page.waitForTimeout(16);
    const position = await page.evaluate(() => Math.round(window.scrollY));
    if (position >= total - 2) break;
    if (position === previous) {
      stalls += 1;
      if (stalls > 30) break;
    } else {
      stalls = 0;
    }
    previous = position;
  }

  const state = await page.evaluate(() => {
    window.__scroll.stop = true;
    return { frames: window.__scroll.frames, position: Math.round(window.scrollY), elapsed: Math.round(performance.now() - window.__scroll.started) };
  });

  return { frames: state.frames, total, position: state.position, elapsed: state.elapsed };
}

/* -------------------------------------------------------------------- one profile */

async function runProfile(profile, url, options) {
  console.log(`\n${profile.name}`);
  const browser = await launchChromium({
    software: profile.swiftshader || options.software,
    headed: options.headed,
  });

  const report = { profile: profile.name, renderer: "" };

  try {
    const context = await browser.newContext(profile.context);
    const page = await context.newPage();
    if (profile.throttle > 1) {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.throttle });
    }
    await page.goto(url, { waitUntil: "load", timeout: 60_000 });
    await page
      .waitForFunction(() => document.fonts?.status === "loaded", null, { timeout: 20_000 })
      .catch(() => {});
    await page.waitForTimeout(1200);

    const canvas = await page.locator("canvas").count();
    report.renderer = await rendererOf(page);
    console.log(`  renderer: ${report.renderer}`);

    let blur = null;
    if (profile.measureBlur) {
      blur = await page.evaluate(READ_BLUR);
      record(
        profile.name,
        "blur/budget",
        blur.mpx <= BUDGET.blurMpx,
        `${blur.mpx} Mpx of filter/backdrop surface (budget ≤ ${BUDGET.blurMpx}) · biggest: ${blur.top
          .map((entry) => `${entry.selector} ${Math.round(entry.px / 1000)}k`)
          .join(" · ")}`,
      );
    }

    const gesture = await scrollThrough(page);
    const frames = gesture.frames.filter((value) => value > 0);
    const p95 = Number(percentile(frames, 0.95).toFixed(1));
    const jank = frames.length > 0 ? frames.filter((value) => value > JANK_MS).length / frames.length : 1;
    const complete = gesture.total > 0 && gesture.position >= gesture.total - 2;

    Object.assign(report, {
      canvas,
      blur,
      scroll: {
        distance: gesture.total,
        reached: gesture.position,
        complete,
        frames: frames.length,
        elapsedMs: gesture.elapsed,
        p95,
        max: Number(Math.max(...frames, 0).toFixed(1)),
        jank: Number((jank * 100).toFixed(2)),
      },
    });

    record(
      profile.name,
      "scroll/complete",
      complete,
      `${gesture.position}/${gesture.total} px scrolled in ${gesture.elapsed} ms · ${frames.length} frames · canvas=${canvas} · renderer=${report.renderer}`,
    );
    record(
      profile.name,
      "scroll/p95",
      frames.length > 0 && complete && p95 <= BUDGET.p95Ms,
      `p95 ${p95} ms (budget ≤ ${BUDGET.p95Ms}) · max ${report.scroll.max} ms`,
    );
    record(
      profile.name,
      "scroll/jank",
      frames.length > 0 && complete && jank <= BUDGET.jank,
      `${report.scroll.jank} % of frames > ${JANK_MS} ms (budget ≤ ${BUDGET.jank * 100} %)`,
    );

    await context.close();
  } finally {
    await browser.close();
  }

  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const server = await ensureServer(args);
  const names = args.only ?? ["desktop", "mobile-4x"];
  const reports = [];

  try {
    for (const name of names) {
      const profile = PROFILES[name];
      reports.push(await runProfile(profile, server.url, args));
    }
  } finally {
    server.stop();
  }

  const failed = results.filter((result) => !result.ok);
  if (args.out) {
    writeFileSync(
      path.resolve(args.out),
      `${JSON.stringify({ budget: BUDGET, profiles: reports, results }, null, 2)}\n`,
    );
    console.log(`\n[measure:scroll] wrote ${args.out}`);
  }
  console.log(`\nRESUMEN: ${results.length - failed.length} OK · ${failed.length} FAIL`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`measure:scroll — ${error?.stack || error}`);
  process.exitCode = 1;
});
