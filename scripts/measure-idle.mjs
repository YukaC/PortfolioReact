#!/usr/bin/env node
/**
 * Reposo — docs/audit.md §21.3 / §18.3, spec S11 (suite `perf`, perfil `idle`).
 *
 * "The page is quiet when nobody touches it" is a number, not an impression:
 * ten seconds of repose, measured through CDP, with the canvas instrumented
 * before the page loads.
 *
 * **One idle path, one check.** §18.3 ends the smoke in `frozen` (0 draws), and
 * that is now the only place it can end: after 350 ms of stillness `LiquidEther`
 * stops feeding the plume and lets it disperse into nothing over 3.7 s at display
 * rate — the dye thins through its dissipation and the procedural haze fades with
 * it — then cancels its loop. There is no low-cadence path left to gate on
 * — a plume presenting five frames a second is a plume that visibly steps — so
 * the script reads whether the loop is parked and applies the one gate:
 *
 *   1. draws      0 draw calls in the whole window (§18.3: the loop is
 *                  cancelled, not slowed down). The dispersal is over before the
 *                  window opens, so anything drawn here is a loop that is not
 *                  parked;
 *
 * and, unchanged:
 *
 *   2. frames     the page asks for no animation frame of its own. The counter
 *                  wraps `requestAnimationFrame` in an init script, so it
 *                  observes instead of asking: it sees the request, it never
 *                  makes one. This is the gate that names the property — until 9
 *                  nov 2026 two libraries held a frame every vsync and this
 *                  instrument could not see a single one of them;
 *   3. recalc     `RecalcStyleCount`, in the unit that matches the frames the
 *                  page asked for: per frame when it asked for some (≤ 1.5, the
 *                  budget of P1-1), and as an absolute count when it asked for
 *                  none — dividing by zero frames is what used to make a page
 *                  that never stopped recalculating look perfect;
 *   4. task       `TaskDuration` has a ceiling, not a target. Its floor is the
 *                  36 CSS flares: 116 ms with their animation ablated, 136–170 ms
 *                  with them running and the page asking for nothing. The budget
 *                  exists to catch a regression against that floor;
 *   5. flares     the CSS flares are still animating (the identity is not the
 *                  smoke): a running `flare` animation and at least one flare
 *                  whose opacity moved during the window.
 *
 * A draw is counted by wrapping `drawElements`/`drawArrays` in an init script, so
 * a draw that comes from a timer is counted exactly like one from a rAF, and the
 * per-present cadence is recovered by grouping those calls (gaps ≥ 60 ms) instead
 * of assuming one draw per frame.
 *
 *   pnpm measure:idle                        # reuse :4173, else start the build
 *   pnpm measure:idle --url http://…:3000    # a server already running
 *   pnpm measure:idle --window 15000         # longer window (ms)
 *   pnpm measure:idle --reduced-motion       # no canvas at all: reduced motion
 *   pnpm measure:idle --viewport 390x844     # a phone: no canvas at all
 *   pnpm measure:idle --swiftshader          # the potato, for contrast
 *   pnpm measure:idle --headed               # watch it, GPU included
 *   pnpm measure:idle --out idle.json        # artefact for CI
 *
 * **Renderer.** Chromium without flags reports SwiftShader even on this GPU host,
 * and in `static` — the tier a software renderer resolves to — no canvas is
 * mounted at all. A "0 draws" read over a page that has no canvas is a vacuous
 * pass, which is what this script used to produce. So the launch comes from
 * `visual-baseline.mjs` (hardware by default, `--swiftshader` to opt out), the
 * renderer string is printed, and the canvas must exist before the window
 * starts: without it `idle/canvas` fails and the draws claim is not made.
 *
 * Exit codes: 0 all budgets met · 1 a budget was missed · 2 bad usage · 3 no server.
 */
import { spawn } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isSoftwareRenderer, launchChromium, rendererOf } from "./visual-baseline.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PORT = 4173;
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const VIEWPORT = { width: 1440, height: 900 };

/** §21.3: 10 s of repose, `RecalcStyleCount ≤ 1.5/frame`, `TaskDuration ≤ 100 ms`. */
const BUDGET = {
  windowMs: Number(process.env.IDLE_WINDOW_MS ?? 10_000),
  /* How long the canvas is allowed to take to appear: the 181 KB of `three`
     download and `requestIdleCallback` both have to land first. */
  canvasMs: 25_000,
  recalcPerFrame: Number(process.env.IDLE_RECALC_PER_FRAME ?? 1.5),
  /* The absolute form, for a window in which the page asked for no frame at all:
     200–230 recalcs per 10 s is what the shipped page costs, and the ceiling
     leaves room for the drift without excusing the 602 a per-vsync loop caused. */
  recalcAbsolute: Number(process.env.IDLE_RECALC_ABSOLUTE ?? 300),
  /* Requests, not served frames: the page's own. A couple are tolerated for a
     late hydration or a resize the browser reports on its own. */
  rafRequests: Number(process.env.IDLE_RAF_REQUESTS ?? 2),
  /* 250 ms, not 100: the floor is the flare animations, measured at 116 ms with
     their animation ablated. This ceiling still catches the 336–355 ms a page
     that requests a frame every vsync spends. */
  taskMs: Number(process.env.IDLE_TASK_MS ?? 250),
  draws: 0,
};

/* §18.3, with the dispersal: 350 ms of full rate, then 3.7 s of the dye leaving
   at that same display rate, then the loop is cancelled. 4700 ms = 350 + 3700 +
   650 ms of margin, so the window never starts inside the dispersal. */
const SETTLE_MS = 4700;

const results = [];
const record = (id, ok, detail) => {
  results.push({ id, ok, detail });
  console.log(`  ${ok ? "OK   " : "FAIL"} ${id} — ${detail}`);
};

const fail = (code, message) => {
  console.error(`measure:idle — ${message}`);
  process.exit(code);
};

const parseArgs = (argv) => {
  const args = {
    url: "",
    port: DEFAULT_PORT,
    windowMs: BUDGET.windowMs,
    out: "",
    software: false,
    headed: false,
    reducedMotion: false,
    viewport: VIEWPORT,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--url") args.url = argv[(i += 1)] ?? "";
    else if (arg === "--port") args.port = Number(argv[(i += 1)] ?? DEFAULT_PORT);
    else if (arg === "--window") args.windowMs = Number(argv[(i += 1)] ?? BUDGET.windowMs);
    else if (arg === "--out") args.out = argv[(i += 1)] ?? "";
    else if (arg === "--reduced-motion") args.reducedMotion = true;
    else if (arg === "--viewport") {
      const [width, height] = String(argv[(i += 1)] ?? "")
        .split("x")
        .map(Number);
      if (!(width > 0 && height > 0)) fail(2, "--viewport wants <width>x<height>");
      args.viewport = { width, height };
    } else if (arg === "--swiftshader" || arg === "--software-gl") args.software = true;
    else if (arg === "--headed") args.headed = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "uso: measure:idle [--url <url>] [--port <n>] [--window <ms>] [--out <file>] [--reduced-motion] [--viewport <w>x<h>] [--swiftshader] [--headed]",
      );
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
    console.log(`[measure:idle] reusing the server on ${url}`);
    return { url, stop: () => {} };
  }
  if (args.url) fail(3, `no server answering at ${args.url}`);
  if (!existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
    fail(3, "no production build in .next — run `pnpm build` first, or pass --url");
  }

  console.log(`[measure:idle] starting: next start -p ${args.port}`);
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

/* ---------------------------------------------------------- in-page instrumentation */

/**
 * Installed before any page script runs. Counts every WebGL draw call and every
 * animation frame, so "0 draws" and "≤ 1.5 recalc per frame" are read from the
 * browser's own calls instead of inferred from a screenshot.
 */
const INSTRUMENT = () => {
  window.__idle = { draws: 0, rafRequests: 0, drawTimes: [] };

  /* The frame counter wraps the request instead of joining it. Counting served
     frames needs a loop, and a loop of the instrument's own is served frames the
     page did not ask for — which Blink then charges to the page by servicing
     every live CSS animation on the main thread. Wrapping measures the property
     the gate is about (does the page ask at all?) and costs nothing by itself. */
  const requestFrame = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function countedRequestFrame(callback) {
    window.__idle.rafRequests += 1;
    return requestFrame(callback);
  };

  const count = (proto) => {
    if (!proto) return;
    for (const name of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"]) {
      const original = proto[name];
      if (typeof original !== "function") continue;
      proto[name] = function counted(...args) {
        window.__idle.draws += 1;
        /* Timestamps make "one presented frame" measurable: the passes of one
           present land in one task, so a gap starts a new present. The array is
           capped so a long window cannot grow it without bound. */
        if (window.__idle.drawTimes.length < 60_000) {
          window.__idle.drawTimes.push(performance.now());
        }
        return original.apply(this, args);
      };
    }
  };
  count(window.WebGL2RenderingContext?.prototype);
  count(window.WebGLRenderingContext?.prototype);
};

/**
 * Presented frames from the draw timestamps: a run of draw calls closer together
 * than `gapMs` is one present (one simulation step + one output pass), so a
 * cadence slower than display rate cannot be mistaken for 90 draw calls of it.
 */
const READ_PRESENTS = (gapMs) => {
  const times = window.__idle.drawTimes ?? [];
  let presents = 0;
  let previous = Number.NEGATIVE_INFINITY;
  for (const time of times) {
    if (time - previous >= gapMs) presents += 1;
    previous = time;
  }
  return presents;
};

/** The flare probe: how many are on screen, their opacity, and their animations. */
const READ_FLARES = () => {
  const visible = [...document.querySelectorAll(".flare")].filter(
    (element) => element.getClientRects().length > 0,
  );
  return {
    visible: visible.length,
    opacities: visible.map((element) => Number(getComputedStyle(element).opacity)),
    /* The identity ships one bell — `flare` — for every density band (§18.4).
       The `^flare` match stays so a band that ever grows its own name again is
       still counted. */
    running: document
      .getAnimations()
      .filter(
        (animation) =>
          /^flare/.test(animation.animationName ?? "") && animation.playState === "running",
      ).length,
  };
};

const readDraws = (page) => page.evaluate(() => window.__idle.draws);

/** Wait for the dispersal to be over, then read whether the loop is parked. */
async function readIdle(page, settleMs = SETTLE_MS) {
  await page.waitForTimeout(settleMs);
  const drawsBefore = await readDraws(page);
  const presentsBefore = await page.evaluate(READ_PRESENTS, 60);
  await page.waitForTimeout(1000);
  const drawsAfter = await readDraws(page);
  const presentsAfter = await page.evaluate(READ_PRESENTS, 60);
  const drawsPerSecond = drawsAfter - drawsBefore;
  const presentsPerSecond = presentsAfter - presentsBefore;
  return {
    path: drawsPerSecond > 0 ? "running" : "frozen",
    drawsPerSecond,
    presentsPerSecond,
    drawsBeforeWindow: drawsAfter,
    presentsBeforeWindow: presentsAfter,
  };
}

/* --------------------------------------------------------------------- assertions */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const server = await ensureServer(args);
  const browser = await launchChromium({ software: args.software, headed: args.headed });
  const report = {
    viewport: args.viewport,
    windowMs: args.windowMs,
    budget: BUDGET,
    server: server.url,
    renderer: "",
    reducedMotion: args.reducedMotion,
  };

  try {
    const context = await browser.newContext({
      viewport: args.viewport,
      deviceScaleFactor: 1,
      reducedMotion: args.reducedMotion ? "reduce" : undefined,
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => console.log(`  [pageerror] ${String(error).slice(0, 200)}`));
    await page.addInitScript(INSTRUMENT);
    report.renderer = await rendererOf(page);
    console.log(`[measure:idle] renderer: ${report.renderer}`);
    if (isSoftwareRenderer(report.renderer)) {
      console.log(
        "[measure:idle] software renderer: the field resolves to `static` and mounts no canvas — use the default launch for the hardware claim",
      );
    }
    await page.goto(server.url, { waitUntil: "load", timeout: 60_000 });

    /* The canvas is a decision of the tier, and it arrives after `three` is
       downloaded. Waiting for it explicitly is what makes "0 draws" a statement
       about the field instead of about an empty page. */
    await page
      .waitForFunction(() => document.querySelectorAll("canvas").length > 0, null, {
        timeout: BUDGET.canvasMs,
      })
      .catch(() => {});

    const canvasCount = await page.locator("canvas").count();
    console.log(
      `\nrepose · ${args.viewport.width}x${args.viewport.height} · ${args.windowMs} ms · canvas=${canvasCount}` +
        `${args.reducedMotion ? " · prefers-reduced-motion: reduce" : ""}`,
    );

    record(
      "idle/canvas",
      canvasCount > 0,
      canvasCount > 0
        ? `${canvasCount} canvas mounted (renderer ${report.renderer})`
        : `no canvas mounted in ${BUDGET.canvasMs} ms — "0 draws" would be vacuous`,
    );

    const idle = await readIdle(page);
    report.canvas = canvasCount;
    report.path = idle.path;
    console.log(`  path: ${idle.path} — ${idle.drawsPerSecond} draw call(s)/s before the window`);

    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    const metricsOf = async () => {
      const { metrics } = await cdp.send("Performance.getMetrics");
      return Object.fromEntries(metrics.map((metric) => [metric.name, metric.value]));
    };

    const flaresBefore = await page.evaluate(READ_FLARES);
    const before = await metricsOf();
    const drawsBefore = await readDraws(page);
    const presentsBefore = await page.evaluate(READ_PRESENTS, 60);
    const rafBefore = await page.evaluate(() => window.__idle.rafRequests);

    /* Nothing is injected here on purpose. The window measures the page as it is:
       the instrument already wrapped `requestAnimationFrame`, so whatever the page
       asks for is counted, and asking for a frame on its behalf is the one thing
       this measurement must not do. */
    await page.waitForTimeout(args.windowMs);

    const rafRequests = (await page.evaluate(() => window.__idle.rafRequests)) - rafBefore;
    const after = await metricsOf();
    const drawsAfter = await readDraws(page);
    const presents = (await page.evaluate(READ_PRESENTS, 60)) - presentsBefore;
    const flaresAfter = await page.evaluate(READ_FLARES);

    const recalc = Math.round((after.RecalcStyleCount ?? 0) - (before.RecalcStyleCount ?? 0));
    const layout = Math.round((after.LayoutCount ?? 0) - (before.LayoutCount ?? 0));
    const taskMs = Math.round(((after.TaskDuration ?? 0) - (before.TaskDuration ?? 0)) * 1000);
    const scriptMs = Math.round(((after.ScriptDuration ?? 0) - (before.ScriptDuration ?? 0)) * 1000);
    const draws = drawsAfter - drawsBefore;
    const perFrame = rafRequests > 0 ? Number((recalc / rafRequests).toFixed(2)) : null;
    const moved = flaresBefore.opacities.filter(
      (opacity, index) => Math.abs(opacity - (flaresAfter.opacities[index] ?? opacity)) > 0.01,
    ).length;

    report.metrics = {
      rafRequests,
      recalc,
      recalcPerFrame: perFrame,
      layout,
      taskMs,
      scriptMs,
      draws,
      presents,
      presentsPerSecond: Number((presents / (args.windowMs / 1000)).toFixed(2)),
      flares: {
        visible: flaresAfter.visible,
        running: flaresAfter.running,
        moved,
      },
    };

    record(
      "idle/draws",
      draws === BUDGET.draws && canvasCount > 0,
      canvasCount === 0
        ? "no canvas in the page — the 0-draw budget was not exercised"
        : draws === 0
          ? `0 draws in ${args.windowMs} ms`
          : `${draws} draw call(s) after the dispersal — the loop is not parked`,
    );

    record(
      "idle/frames",
      rafRequests <= BUDGET.rafRequests,
      rafRequests <= BUDGET.rafRequests
        ? `${rafRequests} requestAnimationFrame request(s) in ${args.windowMs} ms (budget ≤ ${BUDGET.rafRequests}) — the page asks for no frame of its own`
        : `${rafRequests} requestAnimationFrame request(s) in ${args.windowMs} ms (budget ≤ ${BUDGET.rafRequests}) — a loop is running at rest`,
    );

    record(
      "idle/recalc",
      perFrame === null ? recalc <= BUDGET.recalcAbsolute : perFrame <= BUDGET.recalcPerFrame,
      perFrame === null
        ? `${recalc} RecalcStyleCount in ${args.windowMs} ms with 0 frames requested (budget ≤ ${BUDGET.recalcAbsolute} absolute)`
        : `${recalc} RecalcStyleCount / ${rafRequests} requested frames = ${perFrame} per frame (budget ≤ ${BUDGET.recalcPerFrame})`,
    );

    record(
      "idle/task",
      taskMs <= BUDGET.taskMs,
      `TaskDuration ${taskMs} ms (budget ≤ ${BUDGET.taskMs} ms, floor is the flare animations) · script ${scriptMs} ms · layout ${layout}`,
    );

    record(
      "idle/flares",
      flaresAfter.running > 0 && moved > 0,
      `${flaresAfter.visible} flare(s) painted · ${flaresAfter.running} running animation(s) · ${moved} changed opacity`,
    );

    await context.close();
  } finally {
    await browser.close();
    server.stop();
  }

  const failed = results.filter((result) => !result.ok);
  if (args.out) {
    writeFileSync(path.resolve(args.out), `${JSON.stringify({ ...report, results }, null, 2)}\n`);
    console.log(`\n[measure:idle] wrote ${args.out}`);
  }
  console.log(`\nRESUMEN: ${results.length - failed.length} OK · ${failed.length} FAIL`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`measure:idle — ${error?.stack || error}`);
  process.exitCode = 1;
});
