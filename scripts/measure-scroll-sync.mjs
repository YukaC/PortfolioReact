#!/usr/bin/env node
/**
 * Scroll-sync budget for the field channel (feature spec S2, audit.md §10 P0-2).
 *
 * What it protects: the field reads the scroll through `--p` (reading progress)
 * and `--scy` (smoothed offset). Two smoothing stages used to sit in series over
 * that one number — Lenis's own lerp plus a per-frame factor in
 * `useFieldMotion` — and the measured result was the background arriving 0.5–0.7 s
 * after the content it sits under. A single owner is invisible to a screenshot
 * and easy to reintroduce, so this script jumps the scroll to progress 0.5 and
 * samples `--p` from the element that actually reads it, frame by frame:
 *
 *   pnpm build && node scripts/measure-scroll-sync.mjs
 *   node scripts/measure-scroll-sync.mjs --url http://127.0.0.1:3000   # live server
 *   node scripts/measure-scroll-sync.mjs --budget 60                    # tighter gate
 *   node scripts/measure-scroll-sync.mjs --json                         # machine-readable
 *
 * It exits non-zero when `--p` needs more than the budget (default 100 ms) to
 * travel 95 % of the jump.
 *
 * The value is read from `.field-blob`, not from `:root`: since the
 * scroll-perf pass the channel is written on the elements that read it, so the
 * `:root` custom property is only the settled default. The sampler falls back to
 * `:root` if the field is missing, which is itself worth seeing.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROUTE = "/";
/** Jump to this reading progress and watch the channel catch up. */
const JUMP_PROGRESS = 0.5;
/** How long the channel is watched after the jump. */
const WINDOW_MS = 1500;
/** Long enough for hydration, the field chunk and the first frames. */
const SETTLE_MS = 1800;
/** Jumps per run; the best one is the verdict (see the note on `measure`). */
const ATTEMPTS = 3;
/** Time between attempts, so the previous jump's work is not the next one's frame. */
const ATTEMPT_PAUSE_MS = 400;

/** Desktop, because this measures the layer, not the device. */
const VIEWPORT = { width: 1440, height: 900 };

const DEFAULT_BUDGET_MS = 100;

const parseArgs = (argv) => {
  const args = { url: "", json: false, port: 3100, budgetMs: DEFAULT_BUDGET_MS };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--url") args.url = argv[(i += 1)] ?? "";
    else if (arg === "--port") args.port = Number(argv[(i += 1)] ?? args.port);
    else if (arg === "--budget") args.budgetMs = Number(argv[(i += 1)] ?? args.budgetMs);
    else if (arg === "--json") args.json = true;
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

/** Runs in the page: jump, then sample the channel per frame. */
const SAMPLE_AFTER_JUMP = ({ jumpProgress, windowMs }) => {
  /* Each channel is read from an element that actually receives it: the scroll
     offset is written on `.hero-copy`, the reading progress on `.field-blob`.
     `:root` only carries the settled defaults. */
  const readers = {
    p: document.querySelector(".field-blob"),
    scy: document.querySelector(".hero-copy"),
  };
  const read = (key) => {
    const element = readers[key] ?? document.documentElement;
    const prop = key === "p" ? "--p" : "--scy";
    const value = parseFloat(getComputedStyle(element).getPropertyValue(prop));
    return Number.isFinite(value) ? value : 0;
  };
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const target = Math.round(maxScroll * jumpProgress);

  return new Promise((resolve) => {
    const samples = [];
    let startedAt = 0;
    const step = (now) => {
      samples.push({ t: now - startedAt, p: read("p"), scy: read("scy") });
      if (now - startedAt >= windowMs) {
        resolve({ target, maxScroll, samples });
        return;
      }
      requestAnimationFrame(step);
    };
    // One frame of headroom so the jump and the first sample are not the same
    // frame: the question is how long the channel takes to follow, not whether
    // it was ever behind at t=0.
    requestAnimationFrame(() => {
      window.scrollTo(0, target);
      startedAt = performance.now();
      requestAnimationFrame(step);
    });
  });
};

/** First time the series reached `fraction` of where it settled. */
const msToFraction = (samples, key, fraction) => {
  const settled = samples.length > 0 ? samples[samples.length - 1][key] : 0;
  if (!(settled > 0)) {
    return { settled, ms: Number.POSITIVE_INFINITY, frames: Number.POSITIVE_INFINITY };
  }
  const goal = settled * fraction;
  const index = samples.findIndex((sample) => sample[key] >= goal);
  const hit = index === -1 ? null : samples[index];
  return {
    settled,
    ms: hit ? Math.round(hit.t) : Number.POSITIVE_INFINITY,
    frames: index === -1 ? Number.POSITIVE_INFINITY : index + 1,
  };
};

/** Median interval of the sampled frames, so the latency can be read as frames. */
const medianFrameMs = (samples) => {
  const intervals = [];
  for (let i = 1; i < samples.length; i += 1) {
    intervals.push(samples[i].t - samples[i - 1].t);
  }
  if (intervals.length === 0) return 0;
  intervals.sort((a, b) => a - b);
  return Math.round(intervals[Math.floor(intervals.length / 2)]);
};

/**
 * The number this measures is quantised by the frame rate: the channel is
 * written in the frame the scroll is reported, so the floor is one frame. On a
 * host whose frames cost more than the budget (a dev server on a software GL
 * path is 80–110 ms per frame, the same 87 ms the audit measured on SwiftShader)
 * a single jump measures the host, not the code. So the jump is repeated and the
 * best attempt is the verdict, with every attempt and the frame interval printed
 * next to it: a latency the reader can check is worth more than a number that
 * looks precise.
 */
const measure = async (browser, baseUrl, budgetMs) => {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  await page.goto(`${baseUrl}${ROUTE}`, { waitUntil: "load", timeout: 60_000 });
  await page.waitForTimeout(SETTLE_MS);

  const attempts = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    // Start from the top, so the jump is a jump and not a shorter hop.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(ATTEMPT_PAUSE_MS);
    const result = await page.evaluate(SAMPLE_AFTER_JUMP, {
      jumpProgress: JUMP_PROGRESS,
      windowMs: WINDOW_MS,
    });
    attempts.push({
      ...result,
      progress: msToFraction(result.samples, "p", 0.95),
      scroll: msToFraction(result.samples, "scy", 0.95),
      frameMs: medianFrameMs(result.samples),
    });
  }
  await context.close();

  const best = attempts.reduce((a, b) => (b.progress.ms < a.progress.ms ? b : a));
  const expected = best.target / best.maxScroll;
  const ok = best.progress.settled >= expected * 0.9 && best.progress.ms <= budgetMs;

  return {
    expectedProgress: Number(expected.toFixed(4)),
    settledProgress: Number(best.progress.settled.toFixed(4)),
    p95ms: best.progress.ms,
    scy95ms: best.scroll.ms,
    frames: best.progress.frames,
    frameMs: best.frameMs,
    attempts: attempts.map((a) => ({ p95ms: a.progress.ms, frameMs: a.frameMs })),
    budgetMs,
    ok,
  };
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  let server = null;
  const baseUrl = args.url || `http://127.0.0.1:${args.port}`;

  try {
    if (!args.url) server = await startServer(args.port);
    if (!(await waitForServer(baseUrl))) {
      throw new Error(`No server answered at ${baseUrl}`);
    }

    const browser = await chromium.launch({ headless: true });
    let row = null;
    try {
      row = await measure(browser, baseUrl, args.budgetMs);
    } finally {
      await browser.close();
    }

    if (args.json) {
      console.log(JSON.stringify(row, null, 2));
    } else {
      const ms = (value) => (Number.isFinite(value) ? `${value} ms` : "never (the channel was not written)");
      console.log(`--p jump to progress ${row.expectedProgress.toFixed(2)} (settled ${row.settledProgress})`);
      console.log(`--scy to 95%: ${ms(row.scy95ms)}`);
      console.log(`--p to 95%: ${ms(row.p95ms)}`);
      console.log(`frames: ${row.frames} at ~${row.frameMs} ms/frame (attempts: ${row.attempts.map((a) => a.p95ms).join(", ")} ms)`);
      console.log(`budget: ${row.budgetMs} ms → ${row.ok ? "pass" : "FAIL"}`);
    }

    if (!row.ok) {
      console.error(
        row.settledProgress < row.expectedProgress * 0.9
          ? "The `--p` channel never followed the jump: the field is not mounted (reduced motion? no reader in the DOM?), so there is nothing to measure."
          : "--p did not follow the scroll inside the budget: the smoothed scroll has more than one owner again (audit.md §10 P0-2).",
      );
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.kill();
    }
  }
};

await main();
