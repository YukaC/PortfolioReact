#!/usr/bin/env node
/**
 * One measurement mode per invocation, for `scripts/perf-suite.sh`.
 *
 * Why a probe and not one big script: every mode below has to open its own
 * browser the way its number requires (headless only for `load`, a fresh
 * context per ablation variant, one long-lived page for the stress battery).
 * Splitting them by mode means a slow or crashing stage cannot take the others
 * with it, and the orchestrator gets one JSON artefact and one
 * `PROBE_SUMMARY` line per stage it can read without parsing prose.
 *
 * Every mode measures; almost none of them judge. The only budgets that exist
 * are the ones the repo already owns (§21.3: scroll frame p95 ≤ 24 ms, jank
 * ≤ 2 % of frames over 50 ms); everything else is reported as a number with
 * `n/a` where the browser does not answer, so a regression is read from a delta
 * instead of invented here.
 *
 *   node scripts/perf/probe.mjs <mode> --url <url> [flags]
 *
 * Modes: load · sections · reveal · ablate · stress
 *
 * Exit codes: 0 measured · 2 bad usage · 3 the URL did not answer.
 */

import { readFileSync } from "node:fs";

import {
  DEVICES,
  emitSummary,
  fail,
  FRAME_RECORDER,
  GL_ARGS,
  headline,
  launch,
  LOAD_RECORDER,
  NETWORKS,
  openSession,
  parseArgs,
  print,
  row,
  stats,
  writeArtifact,
} from "./lib.mjs";

/* ------------------------------------------------------------------ contract */

const DEFAULTS = {
  url: "",
  out: ".perf/out",
  label: "",
  device: "phone",
  dpr: 0,
  cpu: 4,
  gl: "hw",
  net: "none",
  iter: 3,
};

/** The budgets the repo already ships (docs/audit.md §21.3); nothing else is judged. */
const BUDGET = { p95Ms: 24, jankPct: 2, jankMs: 50 };

/** `load` watches the page this long after `load`: fonts, the field and the shader settle. */
const LOAD_SETTLE_MS = 6000;
/** Every other mode waits this long so the gesture starts on a settled page. */
const SETTLE_MS = 2500;

/** A missing measurement must read as missing, not as a zero. */
class UrlError extends Error {}

const USAGE = `
perf probe — one measurement mode per run.

  node scripts/perf/probe.mjs <mode> --url <url> [flags]

Modes
  load       cold load, no scrolling: FCP/LCP/CLS, long tasks, frames, requests
             by type, script bytes, DOM and will-change cost, navigation timing
  sections   full-page wheel scroll with frames bucketed by the section that owned
             the viewport, plus the compositor layer inventory and the marquee,
             will-change and blurred-surface geometry
  reveal     per-node enter → .is-in → opaque timeline for every [data-r] node
  ablate     the same scroll once per variant (baseline, no-blur, no-blend,
             no-blobs, no-marquee) and the delta against the baseline
  stress     scroll · fling · resize/rotation · live preference changes · locale
             navigation · filter cycling · a leak snapshot before and after

Flags
  --url <u>        page to measure (required)
  --out <dir>      artefact directory (default .perf/out)
  --label <s>      artefact name (default: the mode)
  --device <d>     phone | phone-3x | tablet | desktop (default phone)
  --dpr <n>        override the device pixel ratio
  --cpu <n>        CPU throttle rate (default 4, 0 disables)
  --gl <g>         hw | sw  (sw = SwiftShader, the phone-GPU stand-in)
  --net <n>        none | edge | lte | slow3g
  --iter <n>       repetitions for the flows that cycle (default 3)
  --css <s>        sections only: CSS injected right after load, before the settle
  --css-file <p>   the same read from disk, for snippets shell quoting would eat
  --headed         show the browser (ignored by load, which is headless only)
  -h, --help       this text
`.trim();

/* -------------------------------------------------------------------- helpers */

const isNum = (value) => typeof value === "number" && Number.isFinite(value);

/** `n/a` beats a fabricated zero every time. */
const orNA = (value, unit = "") => (isNum(value) ? `${value}${unit}` : "n/a");

const kb = (bytes) => (isNum(bytes) ? `${Math.round(bytes / 1024)} kB` : "n/a");

const mpx = (px) => (isNum(px) ? +(px / 1e6).toFixed(2) : null);

const firstLine = (error) => String(error?.message ?? error).split("\n")[0];

const headlineFor = (name, value, unit, limit) =>
  isNum(value) ? headline(name, value, unit, limit) : headline(name, "n/a", unit);

/**
 * The CSS `sections` injects, or the empty string for "measure the page as it
 * ships". Read before the browser starts, so a bad path is a usage error (exit 2)
 * and never a run that quietly measured the untouched page.
 */
function resolveInjectedCss(args) {
  if (args.css === true || args.cssFile === true) fail(2, "--css and --css-file both need a value");
  const inline = typeof args.css === "string" ? args.css : "";
  const path = typeof args.cssFile === "string" ? args.cssFile : "";
  if (inline && path) fail(2, "--css and --css-file are exclusive; pass one of them");
  if (!path) return inline;
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    return fail(2, `--css-file ${path} is not readable (${firstLine(error)})`);
  }
}

/** One frame series → the shape every mode reports: pacing, jank and the >32 ms count. */
function frameReport(values) {
  const list = values ?? [];
  const summary = stats(list);
  if (!summary) {
    return { n: 0, p50: null, p90: null, p95: null, max: null, avg: null, slow32: null, jankPct: null };
  }
  const jank = list.filter((delta) => delta > BUDGET.jankMs).length;
  return {
    ...summary,
    slow32: list.filter((delta) => delta > 32).length,
    jankPct: +((jank / list.length) * 100).toFixed(2),
  };
}

const longTaskReport = (rows) => ({
  count: rows.length,
  totalMs: +rows.reduce((sum, entry) => sum + entry.d, 0).toFixed(1),
  maxMs: rows.length ? Math.max(...rows.map((entry) => entry.d)) : null,
});

/**
 * `goto` is the only place a dead URL can appear, and it is the one condition
 * the orchestrator must tell apart from a broken probe (exit 3).
 */
async function gotoPage(page, url) {
  let response;
  try {
    response = await page.goto(url, { waitUntil: "load", timeout: 60_000 });
  } catch (error) {
    throw new UrlError(`${url} did not answer (${firstLine(error)})`);
  }
  if (response && response.status() >= 400) throw new UrlError(`${url} answered ${response.status()}`);
  return response;
}

/** Index into the page-wide frame recorder, so a flow can slice its own frames. */
const frameMark = (page) => page.evaluate(() => window.__FRAMES?.rows.length ?? 0);

const framesSince = (page, from) =>
  page.evaluate((index) => (window.__FRAMES?.rows ?? []).slice(index).map((entry) => entry[0]), from);

const stamp = (page) =>
  page.evaluate(() => ({
    frames: window.__FRAMES?.rows.length ?? 0,
    long: window.__PERF ? +(performance.now() - window.__PERF.t0).toFixed(1) : 0,
  }));

const mark = (page) => page.evaluate(() => +(performance.now() - (window.__PERF?.t0 ?? 0)).toFixed(1));

const longTasksBetween = (page, from, to) =>
  page.evaluate(
    ([start, end]) => (window.__PERF?.longtasks ?? []).filter((entry) => entry.t >= start && entry.t < end),
    [from, to],
  );

/**
 * Full-page scroll with real wheel input (the technique `measure-scroll-perf.mjs`
 * established): Lenis, the scroll ranges and the reveal observer only
 * take part when the events are real wheels, and a `scrollTo` would measure a
 * page nobody visits.
 */
async function scrollWholePage(page, { step = 420, maxSteps = 400 } = {}) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  let previous = -1;
  let stalls = 0;
  for (let i = 0; i < maxSteps; i += 1) {
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(16);
    const position = await page.evaluate(() => Math.round(window.scrollY));
    if (position >= total - 2) return { position, total, steps: i + 1, complete: true };
    if (position === previous) {
      stalls += 1;
      if (stalls > 30) return { position, total, steps: i + 1, complete: false };
    } else {
      stalls = 0;
    }
    previous = position;
  }
  return { position: previous, total, steps: maxSteps, complete: false };
}

/** Small steps, because the reveal observer fires on entry and the node needs frames to fade. */
async function walkDown(page, { step = 260, maxSteps = 240 } = {}) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  let position = 0;
  for (let i = 0; i < maxSteps; i += 1) {
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(24);
    position = await page.evaluate(() => Math.round(window.scrollY));
    if (position >= total - 2) return { position, total, steps: i + 1, complete: true };
  }
  return { position, total, steps: maxSteps, complete: false };
}

/**
 * How long the page keeps moving after the input stopped, and how many frames it
 * burned doing it — the number a fling is judged by.
 */
async function waitForScrollQuiet(page, { quietMs = 250, timeoutMs = 10_000 } = {}) {
  const started = Date.now();
  let position = await page.evaluate(() => Math.round(window.scrollY));
  let lastChange = Date.now();
  while (Date.now() - started < timeoutMs) {
    await page.waitForTimeout(50);
    const next = await page.evaluate(() => Math.round(window.scrollY));
    if (next !== position) {
      position = next;
      lastChange = Date.now();
    } else if (Date.now() - lastChange >= quietMs) {
      return { position, settleMs: Date.now() - started };
    }
  }
  return { position, settleMs: Date.now() - started, timedOut: true };
}

/**
 * The compositor's own inventory: how many layers the page keeps alive and how
 * many pixels of texture that costs. SwiftShader numbers only mean something
 * next to it, because fill rate is what a phone GPU runs out of.
 */
async function layerInventory(cdp, page) {
  let layers = null;
  const onChange = (event) => {
    if (event.layers) layers = event.layers;
  };
  try {
    cdp.on("LayerTree.layerTreeDidChange", onChange);
    await cdp.send("LayerTree.enable");
    // Blink reports the tree when it composites a frame, not when asked.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.waitForTimeout(400);
  } catch {
    /* protocol missing on this build: the caller reports n/a */
  } finally {
    cdp.off("LayerTree.layerTreeDidChange", onChange);
    await cdp.send("LayerTree.disable").catch(() => {});
  }
  if (!layers) return { count: null, drawsContent: null, totalMpx: null, empty: null, top: [] };

  const measured = layers.map((layer) => ({
    name: layer.name || "",
    width: layer.width,
    height: layer.height,
    px: layer.width * layer.height,
    drawsContent: Boolean(layer.drawsContent),
  }));
  const total = measured.reduce((sum, layer) => sum + layer.px, 0);
  return {
    count: measured.length,
    drawsContent: measured.filter((layer) => layer.drawsContent).length,
    empty: measured.filter((layer) => layer.px === 0).length,
    totalMpx: mpx(total),
    top: [...measured].sort((a, b) => b.px - a.px).slice(0, 8),
  };
}

/** Load-time bookkeeping read out of the LOAD_RECORDER plus the resource timeline. */
function readLoadRecord() {
  const R = window.__PERF;
  if (!R) return null;
  const resources = performance.getEntriesByType("resource");
  const nav = performance.getEntriesByType("navigation")[0] ?? null;

  const byType = {};
  for (const entry of resources) {
    const type = entry.initiatorType || "other";
    const bucket = (byType[type] ??= { count: 0, transferBytes: 0, decodedBytes: 0 });
    bucket.count += 1;
    bucket.transferBytes += entry.transferSize || 0;
    bucket.decodedBytes += entry.decodedBodySize || 0;
  }
  const scripts = resources.filter((entry) => entry.initiatorType === "script");

  let willChange = 0;
  for (const element of document.querySelectorAll("*")) {
    const value = getComputedStyle(element).willChange;
    if (value && value !== "auto") willChange += 1;
  }

  const slowest = [...R.longtasks].sort((a, b) => b.d - a.d).slice(0, 5);
  return {
    fcp: R.fcp || null,
    lcp: R.lcp || null,
    cls: +R.cls.toFixed(3),
    js: R.js || null,
    canvasAt: R.canvasAt || null,
    errors: R.errors,
    longtasks: {
      count: R.longtasks.length,
      totalMs: +R.longtasks.reduce((sum, entry) => sum + entry.d, 0).toFixed(1),
      top: slowest,
    },
    frames: R.frames,
    network: {
      requests: resources.length,
      transferBytes: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
      byType,
    },
    scripts: {
      count: scripts.length,
      transferBytes: scripts.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
      decodedBytes: scripts.reduce((sum, entry) => sum + (entry.decodedBodySize || 0), 0),
    },
    dom: { nodes: document.querySelectorAll("*").length, willChange },
    timing: nav
      ? {
          ttfb: +nav.responseStart.toFixed(1),
          dcl: +nav.domContentLoadedEventEnd.toFixed(1),
          load: +nav.loadEventEnd.toFixed(1),
          transferBytes: nav.transferSize || 0,
        }
      : null,
  };
}

/** The page's block order, its marquee band and what the compositor has to blur. */
function readSections() {
  const top = (element) => Math.round(element.getBoundingClientRect().top + window.scrollY);
  const height = (element) => Math.round(element.getBoundingClientRect().height);
  const name = (element) =>
    element.id ||
    String(element.className || "").trim().split(/\s+/).filter(Boolean)[0] ||
    element.tagName.toLowerCase();

  const blocks = [...new Set([...document.querySelectorAll("main > *, footer")])]
    .filter((element) => height(element) > 0)
    .map((element) => ({ name: name(element), tag: element.tagName.toLowerCase(), top: top(element), height: height(element) }))
    .sort((a, b) => a.top - b.top)
    .map((block, index) => ({ ...block, index }));

  const marquee = document.querySelector(".marquee");
  const band = marquee
    ? {
        top: top(marquee),
        height: height(marquee),
        width: Math.round(marquee.getBoundingClientRect().width),
        rows: [...marquee.querySelectorAll(".mq")].map((rowElement) => ({
          variant: rowElement.className,
          height: height(rowElement),
          trackWidth: Math.round(rowElement.querySelector(".mq-track")?.getBoundingClientRect().width ?? 0),
        })),
        spanFontSize: (() => {
          const span = marquee.querySelector(".mq span");
          return span ? getComputedStyle(span).fontSize : null;
        })(),
        fontToken: getComputedStyle(document.documentElement).getPropertyValue("--text-marquee").trim() || null,
      }
    : null;

  const hasFilter = (value) => Boolean(value) && value !== "none";
  let blurPx = 0;
  const surfaces = [];
  for (const element of document.querySelectorAll("*")) {
    const style = getComputedStyle(element);
    if (!hasFilter(style.filter) && !hasFilter(style.backdropFilter)) continue;
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
    const rect = element.getBoundingClientRect();
    const px = rect.width * rect.height;
    if (px < 1) continue;
    blurPx += px;
    surfaces.push({
      selector: `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).trim().split(/\s+/).slice(0, 3).join(".")}` : ""}`,
      px: Math.round(px),
      filter: hasFilter(style.filter) ? style.filter : "",
      backdrop: hasFilter(style.backdropFilter) ? style.backdropFilter : "",
    });
  }
  surfaces.sort((a, b) => b.px - a.px);

  let willChange = 0;
  for (const element of document.querySelectorAll("*")) {
    const value = getComputedStyle(element).willChange;
    if (value && value !== "auto") willChange += 1;
  }

  return {
    sections: blocks,
    viewport: window.innerHeight,
    marquee: band,
    blur: { px: blurPx, count: surfaces.length, top: surfaces.slice(0, 5) },
    willChange,
    revealNodes: document.querySelectorAll('[data-r]:not([data-r="paint"])').length,
  };
}

/**
 * Per-node reveal timeline. Frames, not probes: the question "did the reveal
 * land before the reader arrived" only has an answer if entry, `.is-in` and full
 * opacity are all stamped on the same clock the scroll ran on.
 */
const REVEAL_RECORDER = () => {
  const R = (window.__REVEAL = { nodes: [], done: null, t0: performance.now() });
  const inViewport = (rect) => rect.bottom > 0 && rect.top < window.innerHeight && rect.height > 0;

  const sync = () => {
    const seen = new Set(R.nodes.map((node) => node.element));
    for (const element of document.querySelectorAll('[data-r]:not([data-r="paint"])')) {
      if (seen.has(element)) continue;
      const classes = String(element.className || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).join(".");
      R.nodes.push({
        element,
        label: `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ""}#${R.nodes.length}`,
        enter: null,
        isIn: null,
        opaque: null,
      });
    }
    return R.nodes.length;
  };

  let frame = 0;
  const tick = () => {
    frame += 1;
    if (frame % 15 === 1) sync();
    const now = +(performance.now() - R.t0).toFixed(1);
    let pending = 0;
    for (const node of R.nodes) {
      if (node.opaque !== null) continue;
      pending += 1;
      if (node.enter === null && inViewport(node.element.getBoundingClientRect())) node.enter = now;
      if (node.isIn === null && node.element.classList.contains("is-in")) node.isIn = now;
      if (Number(getComputedStyle(node.element).opacity) >= 0.99) node.opaque = now;
    }
    if (R.nodes.length > 0 && pending === 0) {
      R.done = now;
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  R.resync = sync;
};

/**
 * Reveals that are still invisible while on screen: a stranded node is a real
 * bug. The observer gives up the last 8 % of the viewport on purpose
 * (`rootMargin: 0 0 -8% 0`), so a node inside that band is *waiting*, not
 * stranded, and the two are counted apart instead of silently mixed.
 */
const strandedReveals = (page) =>
  page.evaluate(() => {
    const vh = window.innerHeight;
    const band = vh * 0.08;
    const faint = [];
    const notIn = [];
    let pending = 0;
    const label = (element) =>
      `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).trim().split(/\s+/)[0]}` : ""}`;
    for (const element of document.querySelectorAll("[data-r]")) {
      const rect = element.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= vh || rect.height === 0) continue;
      if (rect.top >= vh - band) {
        pending += 1;
        continue;
      }
      if (Number(getComputedStyle(element).opacity) < 0.5) faint.push(label(element));
      if (!element.classList.contains("is-in") && element.dataset.r !== "paint") notIn.push(label(element));
    }
    return { faint: faint.length, notIn: notIn.length, pending, labels: [...faint, ...notIn].slice(0, 6) };
  });

/* --------------------------------------------------------------------- modes */

async function modeLoad(args) {
  // Headless always: `load` is the lab profile, and a window on a desktop GPU is
  // not the phone this number is read for.
  const browser = await launch({ gl: args.gl, headed: false });
  try {
    const { page, renderer } = await openSession(browser, args);
    // Before any page script: LCP, CLS and long tasks have no buffered history
    // for the frames that started before an observer existed.
    await page.addInitScript(LOAD_RECORDER);
    await gotoPage(page, args.url);
    await page.waitForTimeout(LOAD_SETTLE_MS);

    const raw = await page.evaluate(readLoadRecord);
    if (!raw) throw new Error("LOAD_RECORDER did not run on this page");
    const frames = frameReport(raw.frames);
    const head = headlineFor("lcp", raw.lcp, "ms");

    print(`${args.label} — cold load ${args.url}`);
    row("renderer", await renderer());
    row("fcp / lcp", `${orNA(raw.fcp, "ms")} / ${orNA(raw.lcp, "ms")}`);
    row("cls", raw.cls);
    row("js class time", orNA(raw.js, "ms"));
    row("canvas at", orNA(raw.canvasAt, "ms"));
    row("long tasks", `${raw.longtasks.count} · ${raw.longtasks.totalMs} ms`);
    for (const task of raw.longtasks.top) row(`  at ${task.t}ms`, `${task.d} ms`);
    row("frames", `${frames.n} · p50 ${orNA(frames.p50, "ms")} · p95 ${orNA(frames.p95, "ms")} · max ${orNA(frames.max, "ms")}`);
    row("requests", `${raw.network.requests} · ${kb(raw.network.transferBytes)}`);
    for (const [type, bucket] of Object.entries(raw.network.byType).sort((a, b) => b[1].transferBytes - a[1].transferBytes)) {
      row(`  ${type}`, `${bucket.count} · ${kb(bucket.transferBytes)}`);
    }
    row("scripts", `${raw.scripts.count} · ${kb(raw.scripts.transferBytes)} transfer · ${kb(raw.scripts.decodedBytes)} decoded`);
    row("dom nodes", `${raw.dom.nodes} · will-change ${raw.dom.willChange}`);
    row("ttfb / dcl / load", raw.timing ? `${orNA(raw.timing.ttfb, "ms")} / ${orNA(raw.timing.dcl, "ms")} / ${orNA(raw.timing.load, "ms")}` : "n/a");
    if (raw.errors.length) row("page errors", raw.errors.join(" | "));

    const artifact = {
      mode: "load",
      label: args.label,
      url: args.url,
      device: args.device,
      dpr: args.dpr || DEVICES[args.device]?.deviceScaleFactor,
      cpu: args.cpu,
      gl: args.gl,
      net: args.net,
      renderer: await renderer(),
      headline: head,
      ...raw,
      frames,
    };
    finish("load", args, artifact, head);
  } finally {
    await browser.close();
  }
}

async function modeSections(args) {
  const injectedCss = resolveInjectedCss(args);
  const browser = await launch({ gl: args.gl, headed: args.headed });
  try {
    const { page, cdp, renderer } = await openSession(browser, args);
    await page.addInitScript(FRAME_RECORDER);
    await gotoPage(page, args.url);
    // After the load and before the settle, so the injection is neither part of
    // the load nor of the scroll: the same gesture, one variable changed.
    if (injectedCss) await page.addStyleTag({ content: injectedCss });
    await page.waitForTimeout(SETTLE_MS);

    // Measured before the gesture: reveal transitions move transforms, not boxes.
    const geometry = await page.evaluate(readSections);
    const from = await frameMark(page);
    const walk = await scrollWholePage(page);
    const rows = await page.evaluate((index) => (window.__FRAMES?.rows ?? []).slice(index), from);
    const layers = await layerInventory(cdp, page);

    const overall = frameReport(rows.map((entry) => entry[0]));
    const mid = geometry.viewport / 2;
    const buckets = new Map();
    for (const [delta, scrollY] of rows) {
      const at = scrollY + mid;
      let owner = null;
      for (const section of geometry.sections) if (section.top <= at) owner = section;
      const key = owner ? owner.name : "above-the-fold";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(delta);
    }
    const sections = [...buckets].map(([name, values]) => ({ section: name, ...frameReport(values) }));
    const head = headlineFor("scroll p95", overall.p95, "ms", BUDGET.p95Ms);

    print(`${args.label} — sections ${args.url}`);
    row("renderer", await renderer());
    if (injectedCss) row("injected css", `${injectedCss.length} chars`);
    row("scroll p95 / jank", `${orNA(overall.p95, "ms")} p95 · ${orNA(overall.jankPct, "%")} of frames > ${BUDGET.jankMs} ms`);
    row("frames", `${overall.n} · avg ${orNA(overall.avg, "ms")} · max ${orNA(overall.max, "ms")}`);
    row("walk", `${walk.complete ? "complete" : "incomplete"} · ${walk.position}/${walk.total}px · ${walk.steps} steps`);
    for (const section of sections) {
      row(`  ${section.section}`, `n ${section.n} · p95 ${orNA(section.p95, "ms")} · avg ${orNA(section.avg, "ms")}`);
    }
    row("layers", layers.count === null ? "n/a" : `${layers.count} · ${layers.drawsContent} draw · ${layers.totalMpx} Mpx`);
    for (const layer of layers.top.slice(0, 5)) {
      row(`  layer ${layer.width}×${layer.height}`, `${mpx(layer.px)} Mpx · ${layer.drawsContent ? "draws" : "no content"}${layer.name ? ` · ${layer.name}` : ""}`);
    }
    if (geometry.marquee) {
      row("marquee band", `${geometry.marquee.height}px tall × ${geometry.marquee.width}px at ${geometry.marquee.top}px`);
      for (const track of geometry.marquee.rows) {
        row(`  row ${track.variant}`, `${track.height}px · track ${track.trackWidth}px`);
      }
      row("mq span font", `${geometry.marquee.spanFontSize ?? "n/a"} (--text-marquee: ${geometry.marquee.fontToken ?? "n/a"})`);
    } else {
      row("marquee band", "n/a");
    }
    row("blurred surfaces", `${mpx(geometry.blur.px)} Mpx over ${geometry.blur.count} surfaces`);
    row("will-change nodes", geometry.willChange);

    const artifact = {
      mode: "sections",
      label: args.label,
      url: args.url,
      device: args.device,
      dpr: args.dpr || DEVICES[args.device]?.deviceScaleFactor,
      cpu: args.cpu,
      gl: args.gl,
      net: args.net,
      // Only present when something was injected: a run that changed the CSS says
      // so in the artifact, and a clean run stays byte-identical to before.
      ...(injectedCss ? { injectedCss } : {}),
      renderer: await renderer(),
      headline: head,
      budget: { p95Ms: BUDGET.p95Ms, jankPct: BUDGET.jankPct, jankMs: BUDGET.jankMs },
      overall,
      sections,
      layers,
      marquee: geometry.marquee,
      blur: { mpx: mpx(geometry.blur.px), count: geometry.blur.count, top: geometry.blur.top },
      willChange: geometry.willChange,
      revealNodes: geometry.revealNodes,
      blockGeometry: geometry.sections,
      walk,
    };
    finish("sections", args, artifact, head);
  } finally {
    await browser.close();
  }
}

async function modeReveal(args) {
  const browser = await launch({ gl: args.gl, headed: args.headed });
  try {
    const { page, renderer } = await openSession(browser, args);
    await page.addInitScript(REVEAL_RECORDER);
    await gotoPage(page, args.url);
    await page.waitForTimeout(SETTLE_MS);

    const walk = await walkDown(page);
    // The last nodes still need the fade the walk triggered; poll instead of guessing.
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
      if (await page.evaluate(() => Boolean(window.__REVEAL?.done))) break;
      await page.waitForTimeout(200);
    }

    const nodes = await page.evaluate(() =>
      (window.__REVEAL?.nodes ?? []).map((node) => ({
        label: node.label,
        enter: node.enter,
        isIn: node.isIn,
        opaque: node.opaque,
      })),
    );
    const gap = (to, from) => (isNum(to) && isNum(from) ? +(to - from).toFixed(1) : null);
    const measured = nodes.map((node) => ({
      ...node,
      enterIsIn: gap(node.isIn, node.enter),
      isInOpaque: gap(node.opaque, node.isIn),
      enterOpaque: gap(node.opaque, node.enter),
    }));

    const series = (key) => measured.map((node) => node[key]).filter(isNum);
    const summary = (key) => {
      const values = series(key);
      if (!values.length) return { n: 0, avg: null, max: null };
      return { n: values.length, avg: +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1), max: Math.max(...values) };
    };
    const summaryOf = { enterIsIn: summary("enterIsIn"), isInOpaque: summary("isInOpaque"), enterOpaque: summary("enterOpaque") };
    const neverOpaque = measured.filter((node) => node.opaque === null).length;
    const head = headlineFor("reveal enter→opaque avg", summaryOf.enterOpaque.avg, "ms");

    print(`${args.label} — reveal ${args.url}`);
    row("renderer", await renderer());
    row("nodes", `${measured.length} (${neverOpaque} never opaque)`);
    row("walk", `${walk.complete ? "complete" : "incomplete"} · ${walk.position}/${walk.total}px · ${walk.steps} steps`);
    for (const [key, value] of Object.entries(summaryOf)) {
      row(`avg ${key}`, `${orNA(value.avg, "ms")} (max ${orNA(value.max, "ms")} over ${value.n})`);
    }
    for (const node of measured) {
      row(`  ${node.label}`, `enter ${orNA(node.enter, "ms")} → is-in ${orNA(node.enterIsIn, "ms")} → opaque ${orNA(node.enterOpaque, "ms")}`);
    }

    const artifact = {
      mode: "reveal",
      label: args.label,
      url: args.url,
      device: args.device,
      dpr: args.dpr || DEVICES[args.device]?.deviceScaleFactor,
      cpu: args.cpu,
      gl: args.gl,
      net: args.net,
      renderer: await renderer(),
      headline: head,
      summary: summaryOf,
      neverOpaque,
      nodes: measured,
      walk,
    };
    finish("reveal", args, artifact, head);
  } finally {
    await browser.close();
  }
}

/** What turns "it feels slow" into a delta: one variable off at a time, same gesture. */
const ABLATIONS = [
  { id: "baseline", css: "" },
  { id: "no-blur", css: ".field-blob-layer{filter:none !important}" },
  { id: "no-blend", css: ".field-blob-layer{mix-blend-mode:normal !important}" },
  /* The candidate fix: no blur, no blend group, and no promotion, so the six
     blob elements stop being compositor layers at all. If this lands on the
     no-blobs number, the fix costs nothing visually structural. */
  {
    id: "flat-field",
    css:
      ".field-blob-layer{filter:none !important;mix-blend-mode:normal !important;will-change:auto !important}" +
      ".field-blob{will-change:auto !important}",
  },
  { id: "no-blobs", css: ".field-blob{display:none !important}" },
  /* Does the cost scale with the number of layers? Each blob is two stacked
     elements (start/end) that cross-fade with --p, so this goes from six to
     three without touching the gradients themselves. */
  { id: "blobs-half", css: ".field-blob-end{display:none !important}" },
  { id: "blobs-one", css: ".field-blob-2,.field-blob-3{display:none !important}" },
  /* The implementation candidate: the plume as one element. The six blob nodes
     are gone and their light is stacked as background-image layers on the field
     itself, so there is no blend group and no nested stacking context. */
  {
    id: "plume-flat",
    css:
      ".field-blob{display:none !important}" +
      ".bocanada-field{background-image:" +
      "radial-gradient(circle at 18% 8%, hsl(212 88% 52% / .34), transparent 58%)," +
      "radial-gradient(circle at 82% 38%, hsl(222 78% 58% / .22), transparent 60%)," +
      "radial-gradient(circle at 44% 78%, hsl(204 90% 62% / .1), transparent 62%)," +
      "radial-gradient(ellipse 70% 48% at 50% 6%, rgb(150 210 255 / .15), transparent 58%)," +
      "radial-gradient(ellipse 88% 66% at 72% 40%, rgb(2 60 140 / .55), transparent 64%)," +
      "linear-gradient(180deg,#081430 0%,#050d20 54%,#04091a 100%) !important}" +
      ".bocanada-field{will-change:auto !important}",
  },
  { id: "no-marquee", css: ".marquee{display:none !important}" },
];

async function runAblation(browser, args, variant) {
  // A fresh context per variant: no HTTP cache, no warmed style sheet, no
  // leftover `will-change` promotion from the previous run.
  const { context, page } = await openSession(browser, args);
  try {
    await page.addInitScript(FRAME_RECORDER);
    await gotoPage(page, args.url);
    await page.waitForTimeout(SETTLE_MS);
    if (variant.css) {
      await page.addStyleTag({ content: variant.css });
      await page.waitForTimeout(400);
    }
    const from = await frameMark(page);
    const walk = await scrollWholePage(page);
    const deltas = await framesSince(page, from);
    return {
      variant: variant.id,
      css: variant.css || null,
      frames: frameReport(deltas),
      walk: { complete: walk.complete, position: walk.position, total: walk.total, steps: walk.steps },
    };
  } finally {
    await context.close();
  }
}

async function modeAblate(args) {
  const browser = await launch({ gl: args.gl, headed: args.headed });
  const variants = [];
  try {
    for (const variant of ABLATIONS) variants.push(await runAblation(browser, args, variant));
  } finally {
    await browser.close();
  }

  const baseline = variants[0].frames;
  const delta = (value, base) => (isNum(value) && isNum(base) ? +(value - base).toFixed(1) : null);
  for (const variant of variants) {
    variant.deltaP95 = delta(variant.frames.p95, baseline.p95);
    variant.deltaSlow32 = delta(variant.frames.slow32, baseline.slow32);
    variant.deltaJankPct = delta(variant.frames.jankPct, baseline.jankPct);
  }
  const head = headlineFor("baseline p95", baseline.p95, "ms", BUDGET.p95Ms);

  print(`${args.label} — ablation ${args.url}`);
  row("variant", "n · p95 · avg · max · >32ms · jank% · Δp95");
  for (const variant of variants) {
    const f = variant.frames;
    row(
      `  ${variant.variant}`,
      `${f.n} · ${orNA(f.p95, "ms")} · ${orNA(f.avg, "ms")} · ${orNA(f.max, "ms")} · ${orNA(f.slow32)} · ${orNA(f.jankPct, "%")} · ${variant.deltaP95 === null ? "n/a" : `${variant.deltaP95 > 0 ? "+" : ""}${variant.deltaP95}ms`}`,
    );
  }
  row("baseline p95", orNA(baseline.p95, "ms"));

  const artifact = {
    mode: "ablate",
    label: args.label,
    url: args.url,
    device: args.device,
    dpr: args.dpr || DEVICES[args.device]?.deviceScaleFactor,
    cpu: args.cpu,
    gl: args.gl,
    net: args.net,
    headline: head,
    budget: { p95Ms: BUDGET.p95Ms, jankPct: BUDGET.jankPct, jankMs: BUDGET.jankMs },
    variants,
  };
  finish("ablate", args, artifact, head);
}

/* ---- stress flows: measured, never asserted ---------------------------------- */

async function stressScroll(page) {
  const from = await page.evaluate(() => Math.round(window.scrollY));
  const walk = await scrollWholePage(page);
  return { from, to: walk.position, steps: walk.steps, complete: walk.complete };
}

async function stressFling(page) {
  const from = await page.evaluate(() => Math.round(window.scrollY));
  // One single huge delta: the shape a trackpad fling or a fast flick has, and
  // the one Lenis has to absorb without dropping the reveal observer.
  await page.mouse.wheel(0, 20_000);
  const settled = await waitForScrollQuiet(page);
  return { from, to: settled.position, settleMs: settled.settleMs, timedOut: Boolean(settled.timedOut) };
}

async function stressResize(page) {
  const steps = [
    { name: "phone landscape", width: 844, height: 390 },
    { name: "desktop", width: 1440, height: 900 },
    { name: "phone portrait", width: 390, height: 844 },
  ];
  const results = [];
  for (const step of steps) {
    const start = await mark(page);
    await page.setViewportSize({ width: step.width, height: step.height });
    await page.waitForTimeout(900);
    const end = await mark(page);
    results.push({
      ...step,
      longTasks: longTaskReport(await longTasksBetween(page, start, end)),
      viewport: await page.evaluate(() => `${window.innerWidth}x${window.innerHeight}`),
    });
  }
  return { steps: results };
}

async function stressPreferences(page, cdp) {
  const results = [];
  const apply = async (name, run) => {
    const start = await mark(page);
    let supported = true;
    try {
      await run();
    } catch {
      supported = false;
    }
    await page.waitForTimeout(1000);
    const end = await mark(page);
    const stranded = await strandedReveals(page);
    results.push({
      name,
      supported,
      longTasks: supported ? longTaskReport(await longTasksBetween(page, start, end)) : null,
      faint: stranded.faint,
      notIn: stranded.notIn,
      pending: stranded.pending,
      strandedLabels: stranded.labels,
    });
  };

  // A preference that changes mid-session must not leave the document invisible:
  // the observer's own contract says reduced motion reveals everything once.
  await apply("reduced motion on", () => page.emulateMedia({ reducedMotion: "reduce" }));
  await apply("reduced motion off", () => page.emulateMedia({ reducedMotion: "no-preference" }));
  await apply("reduced transparency on", () =>
    cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] }),
  );
  await apply("reduced transparency off", () =>
    cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "no-preference" }] }),
  );
  return { steps: results };
}

/**
 * One locale hop. On a phone the switcher lives in the `<details>` drawer, which
 * is the only copy of the link that can be hit at that width; on desktop the
 * pill is directly clickable.
 */
async function localeHop(page, href) {
  const drawer = page.locator(".menu-summary:visible");
  if ((await drawer.count()) > 0) {
    await drawer.first().click({ timeout: 2000 });
    await page.waitForTimeout(400);
  }
  await page.locator(`a[hreflang][href="${href}"]:visible`).last().click({ timeout: 3000 });
}

async function stressNavigation(page) {
  // The locale switcher is the only place the three routes exist in the DOM; the
  // hop list is read from it instead of being written down here.
  const hrefs = await page.evaluate(() => [
    ...new Set([...document.querySelectorAll("a[hreflang]")].map((link) => link.getAttribute("href")).filter(Boolean)),
  ]);
  const hops = [];
  const record = async (href, via, startedAt) => {
    await page.waitForTimeout(1200);
    hops.push({
      href,
      via,
      url: page.url(),
      ms: Date.now() - startedAt,
      longTasks: await page.evaluate(() =>
        window.__PERF
          ? {
              count: window.__PERF.longtasks.length,
              totalMs: +window.__PERF.longtasks.reduce((sum, entry) => sum + entry.d, 0).toFixed(1),
            }
          : null,
      ),
    });
  };

  for (const href of hrefs.slice(0, 3)) {
    const started = Date.now();
    let via = "click";
    try {
      await Promise.all([page.waitForLoadState("load", { timeout: 20_000 }).catch(() => {}), localeHop(page, href)]);
    } catch {
      // The link is not reachable from this viewport at all; the route is still
      // visited, and the hop records which way it got there.
      via = "goto";
      await page.goto(new URL(href, page.url()).href, { waitUntil: "load" }).catch(() => {});
    }
    await record(href, via, started);
  }

  const started = Date.now();
  await page.goBack({ waitUntil: "load", timeout: 20_000 }).catch(() => {});
  await record("goBack", "goBack", started);
  return { hops };
}

async function stressFilters(page, iter) {
  const tabs = await page.locator("[data-work-tab]").count();
  const cycles = [];
  for (let pass = 0; pass < iter; pass += 1) {
    for (let index = 0; index < tabs; index += 1) {
      const clicked = await page
        .locator("[data-work-tab]")
        .nth(index)
        .click({ timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      await page.waitForTimeout(600);
      // A remounted row the observer never saw keeps neither `.is-in` nor opacity.
      const stranded = await strandedReveals(page);
      cycles.push({ pass, tab: index, clicked, notIn: stranded.notIn, faint: stranded.faint, pending: stranded.pending, labels: stranded.labels });
    }
  }
  // Back to the unfiltered list, so the leak snapshot compares like with like.
  const restored = await page
    .locator("[data-work-tab]")
    .first()
    .click({ timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  await page.waitForTimeout(600);
  return { tabs, cycles, restored, strandedTotal: cycles.reduce((sum, cycle) => sum + cycle.notIn, 0) };
}

async function stressSnapshot(cdp, page) {
  const dom = await page.evaluate(() => ({
    nodes: document.querySelectorAll("*").length,
    revealNodes: document.querySelectorAll("[data-r]").length,
    heapBytes: performance.memory ? performance.memory.usedJSHeapSize : null,
    scrollY: Math.round(window.scrollY),
  }));
  const layers = await layerInventory(cdp, page);
  return { ...dom, layers: layers.count };
}

/** Frames and long tasks for one flow, sliced out of the page-wide recorders. */
async function measureFlow({ page, flows }, name, run) {
  const from = await stamp(page);
  let detail;
  try {
    detail = (await run()) ?? {};
  } catch (error) {
    detail = { error: firstLine(error) };
  }
  const to = await stamp(page);
  // A navigation restarts both recorders, so a slice across it would be a lie.
  const reloaded = to.frames < from.frames || to.long < from.long;
  const frames = reloaded ? null : frameReport(await framesSince(page, from.frames));
  const longTasks = reloaded ? null : longTaskReport(await longTasksBetween(page, from.long, to.long));
  flows[name] = { ...detail, frames, longTasks };

  const parts = [];
  if (frames) parts.push(`p95 ${orNA(frames.p95, "ms")}`, `${orNA(frames.slow32)} frames > 32 ms`);
  else parts.push("frames n/a (navigated)");
  if (longTasks) parts.push(`long tasks ${longTasks.count} · ${longTasks.totalMs} ms`);
  if (isNum(detail.strandedTotal)) parts.push(`${detail.strandedTotal} stranded`);
  if (isNum(detail.settleMs)) parts.push(`settled in ${detail.settleMs} ms`);
  if (detail.error) parts.push(`error ${detail.error}`);
  row(name, parts.join(" · "));
}

async function modeStress(args) {
  const browser = await launch({ gl: args.gl, headed: args.headed });
  const flows = {};
  try {
    const { page, cdp } = await openSession(browser, args);
    await page.addInitScript(LOAD_RECORDER);
    await page.addInitScript(FRAME_RECORDER);
    await gotoPage(page, args.url);
    await page.waitForTimeout(SETTLE_MS);

    print(`${args.label} — stress ${args.url}`);
    const before = await stressSnapshot(cdp, page);
    const rec = { page, flows };
    await measureFlow(rec, "scroll", () => stressScroll(page));
    await measureFlow(rec, "fling", () => stressFling(page));
    await measureFlow(rec, "resize", () => stressResize(page));
    await measureFlow(rec, "preferences", () => stressPreferences(page, cdp));
    await measureFlow(rec, "navigation", () => stressNavigation(page));
    await measureFlow(rec, "filters", () => stressFilters(page, args.iter));
    const after = await stressSnapshot(cdp, page);

    for (const step of flows.preferences?.steps ?? []) {
      row(`  prefs ${step.name}`, `${orNA(step.faint)} faint · ${orNA(step.notIn)} without .is-in · ${orNA(step.pending)} below the fold trigger`);
    }
    const filterPending = (flows.filters?.cycles ?? []).reduce((sum, cycle) => sum + (cycle.pending ?? 0), 0);
    row("  filters after settle", `${orNA(flows.filters?.strandedTotal)} without .is-in · ${filterPending} below the fold trigger`);
    row("  resize viewports", (flows.resize?.steps ?? []).map((step) => step.viewport).join(" → ") || "n/a");
    row("  locale hops", (flows.navigation?.hops ?? []).map((hop) => `${hop.href} ${hop.ms}ms`).join(" → ") || "n/a");

    const leak = {
      nodes: after.nodes - before.nodes,
      layers: isNum(after.layers) && isNum(before.layers) ? after.layers - before.layers : null,
      revealNodes: after.revealNodes - before.revealNodes,
      heapBytes: isNum(after.heapBytes) && isNum(before.heapBytes) ? after.heapBytes - before.heapBytes : null,
      before,
      after,
    };
    const batteryMs = Object.values(flows).reduce(
      (sum, flow) => sum + (flow.longTasks?.totalMs ?? 0) + (flow.hops ?? []).reduce((hopSum, hop) => hopSum + (hop.longTasks?.totalMs ?? 0), 0),
      0,
    );
    const head = headlineFor("stress long-task total", +batteryMs.toFixed(1), "ms");

    row("battery long tasks", head.text);
    row("leak · nodes", leak.nodes === null ? "n/a" : `${leak.nodes > 0 ? "+" : ""}${leak.nodes} (${before.nodes} → ${after.nodes})`);
    row("leak · layers", leak.layers === null ? "n/a" : `${leak.layers > 0 ? "+" : ""}${leak.layers} (${orNA(before.layers)} → ${orNA(after.layers)})`);
    row("leak · reveal nodes", `${leak.revealNodes > 0 ? "+" : ""}${leak.revealNodes}`);
    row("leak · js heap", leak.heapBytes === null ? "n/a" : `${Math.round(leak.heapBytes / 1024)} kB`);

    const artifact = {
      mode: "stress",
      label: args.label,
      url: args.url,
      device: args.device,
      dpr: args.dpr || DEVICES[args.device]?.deviceScaleFactor,
      cpu: args.cpu,
      gl: args.gl,
      net: args.net,
      iter: args.iter,
      headline: head,
      batteryLongTaskMs: +batteryMs.toFixed(1),
      flows,
      leak,
    };
    finish("stress", args, artifact, head);
  } finally {
    await browser.close();
  }
}

/* ---------------------------------------------------------------------- main */

const MODES = {
  load: modeLoad,
  sections: modeSections,
  reveal: modeReveal,
  ablate: modeAblate,
  stress: modeStress,
};

/** One artefact, then the single machine-readable line `perf-suite.sh` reads. */
function finish(mode, args, artifact, head) {
  const file = writeArtifact(args.out, args.label, artifact);
  row("artifact", file);
  emitSummary({ mode, label: args.label, headline: head.text, artifact: file });
}

async function main() {
  const argv = process.argv.slice(2);
  const mode = argv[0];
  const args = parseArgs(argv.slice(1), DEFAULTS, ["headed"]);

  if (mode === "help" || mode === "-h" || mode === "--help" || args.help) {
    print(USAGE);
    return;
  }
  if (!MODES[mode]) fail(2, `unknown mode "${mode ?? ""}" — expected one of ${Object.keys(MODES).join(", ")}\n\n${USAGE}`);
  if (!args.url) fail(2, "--url is required");
  if (!DEVICES[args.device]) fail(2, `--device must be one of ${Object.keys(DEVICES).join(", ")}`);
  if (!GL_ARGS[args.gl]) fail(2, `--gl must be one of ${Object.keys(GL_ARGS).join(", ")}`);
  if (!(args.net in NETWORKS)) fail(2, `--net must be one of ${Object.keys(NETWORKS).join(", ")}`);
  if (!Number.isFinite(args.iter) || args.iter < 1) fail(2, `--iter must be a number >= 1 (got ${args.iter})`);
  if (!Number.isFinite(args.cpu) || args.cpu < 0) fail(2, `--cpu must be a number >= 0 (got ${args.cpu})`);
  // `ablate` owns its own variant list; only `sections` takes an injected sheet.
  if (mode !== "sections" && (args.css !== undefined || args.cssFile !== undefined)) {
    fail(2, "--css and --css-file are sections-only");
  }
  args.label = args.label || mode;

  try {
    await MODES[mode](args);
  } catch (error) {
    if (error instanceof UrlError) fail(3, error.message);
    throw error;
  }
}

await main();
