#!/usr/bin/env node
/**
 * Reposo — audit.md §21.3 / §18.3, spec S11 (suite `perf`, perfil `idle`).
 *
 * "The page is quiet when nobody touches it" is a number, not an impression:
 * ten seconds of repose, measured through CDP, with the canvas instrumented
 * before the page loads.
 *
 * Asserts, over a 10 s window with no input:
 *   1. draws      the canvas draws 0 frames after the smoke freezes (§18.3: the
 *                 loop is cancelled, not slowed down) — `drawElements` and
 *                 `drawArrays` are wrapped in an init script, so a draw that
 *                 comes from a timer is counted exactly like one from a rAF;
 *   2. recalc     `RecalcStyleCount` ≤ 1.5 × animation frames: one style
 *                 invalidation per frame is the budget of P1-1, and 1.5 leaves
 *                 room for the channels a single frame legitimately writes;
 *   3. task       `TaskDuration` ≤ 100 ms in the whole window: repose may not
 *                 spend a tenth of a second of main thread;
 *   4. flares     the CSS flares are still animating (the field is asleep, the
 *                 identity is not): a running `flare` animation and at least one
 *                 flare whose opacity moved during the window.
 *
 *   pnpm measure:idle                        # reuse :4173, else start the build
 *   pnpm measure:idle --url http://…:3000    # a server already running
 *   pnpm measure:idle --window 15000         # longer window (ms)
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
  taskMs: Number(process.env.IDLE_TASK_MS ?? 100),
  draws: 0,
};

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
  const args = { url: "", port: DEFAULT_PORT, windowMs: BUDGET.windowMs, out: "", software: false, headed: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--url") args.url = argv[(i += 1)] ?? "";
    else if (arg === "--port") args.port = Number(argv[(i += 1)] ?? DEFAULT_PORT);
    else if (arg === "--window") args.windowMs = Number(argv[(i += 1)] ?? BUDGET.windowMs);
    else if (arg === "--out") args.out = argv[(i += 1)] ?? "";
    else if (arg === "--swiftshader" || arg === "--software-gl") args.software = true;
    else if (arg === "--headed") args.headed = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "uso: measure:idle [--url <url>] [--port <n>] [--window <ms>] [--out <file>] [--swiftshader] [--headed]",
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
  window.__idle = { draws: 0, frames: 0 };

  const count = (proto) => {
    if (!proto) return;
    for (const name of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"]) {
      const original = proto[name];
      if (typeof original !== "function") continue;
      proto[name] = function counted(...args) {
        window.__idle.draws += 1;
        return original.apply(this, args);
      };
    }
  };
  count(window.WebGL2RenderingContext?.prototype);
  count(window.WebGLRenderingContext?.prototype);
};

/** The flare probe: how many are on screen, their opacity, and their animations. */
const READ_FLARES = () => {
  const visible = [...document.querySelectorAll(".flare")].filter(
    (element) => element.getClientRects().length > 0,
  );
  return {
    visible: visible.length,
    opacities: visible.map((element) => Number(getComputedStyle(element).opacity)),
    /* The identity ships four keyframes — `flare`, `flare-22`, `flare-12`,
       `flare-6` — one per density band (§18.4). Matching only the base name
       would count zero on every viewport wide enough to switch band. */
    running: document
      .getAnimations()
      .filter(
        (animation) =>
          /^flare/.test(animation.animationName ?? "") && animation.playState === "running",
      ).length,
  };
};

const readDraws = (page) => page.evaluate(() => window.__idle.draws);

/** Wait until the smoke has stopped drawing, then half a second more. */
async function waitForFreeze(page, timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs;
  let previous = await readDraws(page);
  let stableSince = null;

  while (Date.now() < deadline) {
    await page.waitForTimeout(250);
    const current = await readDraws(page);
    if (current === previous) {
      stableSince ??= Date.now();
      if (Date.now() - stableSince >= 1500) {
        await page.waitForTimeout(500);
        return { frozen: true, drawsBeforeWindow: await readDraws(page) };
      }
    } else {
      stableSince = null;
      previous = current;
    }
  }
  return { frozen: false, drawsBeforeWindow: previous };
}

/* --------------------------------------------------------------------- assertions */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const server = await ensureServer(args);
  const browser = await launchChromium({ software: args.software, headed: args.headed });
  const report = {
    viewport: VIEWPORT,
    windowMs: args.windowMs,
    budget: BUDGET,
    server: server.url,
    renderer: "",
  };

  try {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
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
    console.log(`\nrepose · ${VIEWPORT.width}x${VIEWPORT.height} · ${args.windowMs} ms · canvas=${canvasCount}`);

    record(
      "idle/canvas",
      canvasCount > 0,
      canvasCount > 0
        ? `${canvasCount} canvas mounted (renderer ${report.renderer})`
        : `no canvas mounted in ${BUDGET.canvasMs} ms — "0 draws" would be vacuous`,
    );

    const freeze = await waitForFreeze(page);
    report.canvas = canvasCount;
    report.frozen = freeze.frozen;

    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    const metricsOf = async () => {
      const { metrics } = await cdp.send("Performance.getMetrics");
      return Object.fromEntries(metrics.map((metric) => [metric.name, metric.value]));
    };

    const flaresBefore = await page.evaluate(READ_FLARES);
    const before = await metricsOf();
    const drawsBefore = await readDraws(page);
    const framesBefore = await page.evaluate(() => window.__idle.frames);

    /* The frame counter runs inside the page for the whole window: it is the
       denominator of the recalc budget, and a page that stopped producing frames
       would otherwise look perfect. */
    await page.evaluate(() => {
      const tick = () => {
        window.__idle.frames += 1;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.waitForTimeout(args.windowMs);

    const frames = (await page.evaluate(() => window.__idle.frames)) - framesBefore;
    const after = await metricsOf();
    const drawsAfter = await readDraws(page);
    const flaresAfter = await page.evaluate(READ_FLARES);

    const recalc = Math.round((after.RecalcStyleCount ?? 0) - (before.RecalcStyleCount ?? 0));
    const layout = Math.round((after.LayoutCount ?? 0) - (before.LayoutCount ?? 0));
    const taskMs = Math.round(((after.TaskDuration ?? 0) - (before.TaskDuration ?? 0)) * 1000);
    const scriptMs = Math.round(((after.ScriptDuration ?? 0) - (before.ScriptDuration ?? 0)) * 1000);
    const draws = drawsAfter - drawsBefore;
    const ratio = frames > 0 ? Number((recalc / frames).toFixed(2)) : Number.POSITIVE_INFINITY;
    const moved = flaresBefore.opacities.filter(
      (opacity, index) => Math.abs(opacity - (flaresAfter.opacities[index] ?? opacity)) > 0.01,
    ).length;

    report.metrics = {
      frames,
      recalc,
      recalcPerFrame: ratio,
      layout,
      taskMs,
      scriptMs,
      draws,
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
          ? `0 draws in ${args.windowMs} ms${freeze.frozen ? "" : " (the smoke never reported a stable frame)"}`
          : `${draws} draw call(s) after the freeze — the loop is not parked`,
    );

    record(
      "idle/recalc",
      frames > 0 && ratio <= BUDGET.recalcPerFrame,
      `${recalc} RecalcStyleCount / ${frames} frames = ${ratio} per frame (budget ≤ ${BUDGET.recalcPerFrame})`,
    );

    record(
      "idle/task",
      taskMs <= BUDGET.taskMs,
      `TaskDuration ${taskMs} ms (budget ≤ ${BUDGET.taskMs} ms) · script ${scriptMs} ms · layout ${layout}`,
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
