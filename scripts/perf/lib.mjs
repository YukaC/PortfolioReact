/**
 * Shared pieces for the perf probes: device / network / renderer profiles, the
 * in-page recorders, and the little arithmetic every probe needs.
 *
 * Why a module instead of copy-paste: a frame-pacing number without the renderer
 * next to it, or a mobile number at a viewport someone typed differently, is not
 * evidence. One definition of each profile is what keeps `pnpm perf` comparable
 * between stages and between runs.
 *
 *   import { parseArgs, launch, openSession, stats } from "./lib.mjs";
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

/* ------------------------------------------------------------------ profiles */

/** Android Chrome on a Pixel-class phone is the profile the site is judged on. */
const PIXEL_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

export const DEVICES = {
  phone: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: PIXEL_UA,
  },
  "phone-3x": {
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: PIXEL_UA,
  },
  tablet: {
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: PIXEL_UA,
  },
  desktop: {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
};

/**
 * The path the phone actually takes. `none` is the lab baseline; the rest are
 * the shapes `Network.emulateNetworkConditions` can reproduce.
 */
export const NETWORKS = {
  none: null,
  edge: { latency: 60, downMbps: 8, upMbps: 2 },
  lte: { latency: 170, downMbps: 1.6, upMbps: 0.75 },
  slow3g: { latency: 400, downMbps: 0.4, upMbps: 0.4 },
};

/**
 * Two renderers, because CPU throttling cannot fake a fill-rate bill: `hw` is the
 * desktop GPU, `sw` is SwiftShader, the stand-in for "a phone GPU with no
 * headroom". A page that is smooth on `hw` and 30 fps on `sw` is paying raster.
 */
export const GL_ARGS = {
  hw: ["--use-gl=angle", "--use-angle=gl", "--enable-gpu-rasterization", "--ignore-gpu-blocklist"],
  sw: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
};

/* ----------------------------------------------------------------- arguments */

const camel = (key) =>
  key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

/**
 * `--flag`, `--key value` and positionals. Values are coerced when they look like
 * a number or a boolean, because every caller here wants `--cpu 4` to be 4.
 */
export function parseArgs(argv, defaults = {}, booleans = []) {
  const out = { ...defaults };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      out.help = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (booleans.includes(key)) {
      out[camel(key)] = true;
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[camel(key)] = true;
      continue;
    }
    out[camel(key)] = /^-?\d+(\.\d+)?$/.test(next) ? Number(next) : next;
    i += 1;
  }
  out._ = positional;
  return out;
}

/* -------------------------------------------------------------------- browser */

export const launch = ({ gl = "hw", headed = false } = {}) =>
  chromium.launch({
    headless: !headed,
    args: GL_ARGS[gl] ?? GL_ARGS.hw,
    ...(process.env.BROWSER_VERIFY_CHROMIUM ? { executablePath: process.env.BROWSER_VERIFY_CHROMIUM } : {}),
  });

/** `mbps` is what a person reads on a spec sheet; CDP wants bytes per second. */
const bytesPerSecond = (mbps) => Math.round((mbps * 1024 * 1024) / 8);

/**
 * One context, one page, with the CPU throttle and the network conditions already
 * applied — both have to be in place *before* the first request to mean anything.
 */
export async function openSession(browser, { device = "phone", dpr = 0, net = "none", cpu = 4 } = {}) {
  const profile = { ...(DEVICES[device] ?? DEVICES.phone) };
  if (dpr) profile.deviceScaleFactor = dpr;
  const context = await browser.newContext(profile);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  if (cpu) await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });

  const shape = NETWORKS[net];
  if (shape) {
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: shape.latency,
      downloadThroughput: bytesPerSecond(shape.downMbps),
      uploadThroughput: bytesPerSecond(shape.upMbps),
    });
  }

  const renderer = async () =>
    page.evaluate(() => {
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
      if (!gl) return "no webgl";
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      return String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    });

  return { context, page, cdp, renderer };
}

/* ----------------------------------------------------------------- recorders */

/**
 * Installed before any page script, so the numbers start at the first frame:
 * paint, LCP, layout shift, long tasks, frame deltas, when `html.js` lands, and
 * when a canvas appears.
 */
export const LOAD_RECORDER = () => {
  const R = (window.__PERF = {
    t0: performance.now(),
    js: 0,
    firstReveal: 0,
    canvasAt: 0,
    fcp: 0,
    lcp: 0,
    cls: 0,
    longtasks: [],
    frames: [],
    errors: [],
  });
  const now = () => +(performance.now() - R.t0).toFixed(1);

  const observe = (type, handler) => {
    try {
      new PerformanceObserver((list) => handler(list.getEntries())).observe({ type, buffered: true });
    } catch {
      /* the browser may not know the type; the probe records absence as absence */
    }
  };

  observe("longtask", (entries) => {
    for (const e of entries) R.longtasks.push({ t: +e.startTime.toFixed(1), d: +e.duration.toFixed(1) });
  });
  observe("paint", (entries) => {
    for (const e of entries) if (e.name === "first-contentful-paint") R.fcp = +e.startTime.toFixed(1);
  });
  observe("largest-contentful-paint", (entries) => {
    for (const e of entries) R.lcp = +e.startTime.toFixed(1);
  });
  observe("layout-shift", (entries) => {
    for (const e of entries) if (!e.hadRecentInput) R.cls += e.value;
  });

  window.addEventListener("error", (e) => R.errors.push(String(e.message).slice(0, 160)));

  let last = 0;
  let alive = true;
  const tick = (t) => {
    if (last) R.frames.push(+(t - last).toFixed(1));
    last = t;
    if (alive) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  setTimeout(() => {
    alive = false;
  }, 15000);

  const markJs = () => {
    if (!R.js && document.documentElement.classList.contains("js")) R.js = now();
  };

  const attach = () => {
    if (!document.documentElement) return setTimeout(attach, 4);
    markJs();
    new MutationObserver(markJs).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    new MutationObserver(() => {
      if (!R.canvasAt && document.querySelector("canvas")) R.canvasAt = now();
    }).observe(document.documentElement, { childList: true, subtree: true });
  };
  attach();
};

/** A frame-and-scroll-position recorder for one gesture. */
export const FRAME_RECORDER = () => {
  const R = (window.__FRAMES = { rows: [] });
  let last = 0;
  let alive = true;
  window.__STOP_FRAMES = () => {
    alive = false;
  };
  const tick = (t) => {
    if (last) R.rows.push([+(t - last).toFixed(1), Math.round(window.scrollY)]);
    last = t;
    if (alive) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

export const readFrames = (page) =>
  page.evaluate(() => {
    window.__STOP_FRAMES();
    return window.__FRAMES.rows;
  });

/* ----------------------------------------------------------------- arithmetic */

export function stats(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q) => +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))].toFixed(1);
  return {
    n: sorted.length,
    p50: at(0.5),
    p90: at(0.9),
    p95: at(0.95),
    max: +sorted[sorted.length - 1].toFixed(1),
    avg: +(sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(1),
  };
}

/** The sentence a stage shows in the final table: the number, and what it means. */
export function headline(name, value, unit, limit) {
  const pass = limit === undefined ? undefined : value <= limit;
  return {
    name,
    value,
    unit,
    limit,
    pass,
    text: `${name} ${value}${unit}${limit === undefined ? "" : ` (budget ${pass ? "≤" : "over"} ${limit}${unit})`}`,
  };
}

/* ------------------------------------------------------------------- output */

export function writeArtifact(dir, name, data) {
  mkdirSync(dir, { recursive: true });
  const file = `${dir}/${name}.json`;
  writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

/**
 * The one machine-readable line `perf-suite.sh` reads out of a probe.
 */
export function emitSummary(payload) {
  console.log(`PROBE_SUMMARY ${JSON.stringify(payload)}`);
}

export const fail = (code, message) => {
  console.error(`perf probe — ${message}`);
  process.exit(code);
};

export const print = (line = "") => console.log(line);
export const row = (key, value) => console.log(`  ${String(key).padEnd(22)} ${value}`);
