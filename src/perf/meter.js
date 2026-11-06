/* eslint-env browser */
/**
 * The measuring script the phone runs, served by remote-proxy.mjs at /__perf/meter.js.
 *
 * It lives in its own file because it is browser code injected into a page it does
 * not own: as a template inside the proxy every backtick had to be escaped, one
 * miss turned into a SyntaxError on the phone and the badge never appeared. A real
 * file is checked by `node --check` and by the proxy at startup instead.
 *
 * It answers two questions. "How fast is the page" comes from frame deltas and long
 * tasks. "Which object misbehaved" comes from the anomaly scan: a watchlist of
 * interactive nodes, reveal nodes and compositing surfaces is sampled every 100 ms
 * and diffed at the end of the window, so a report can say `covered · a.work-row`
 * instead of only "the page was slow".
 *
 * The third question is the one a phone answers better than a desktop: "does the
 * background stay put while I scroll". It is not one layer and it is not fixed —
 * `.bocanada-field` is `absolute inset-0` inside the field wrapper and the blobs are
 * pushed by the motion script — so every field layer is sampled in viewport
 * coordinates and gets its own verdict, live, without the recording window.
 *
 * Cost discipline: one rAF loop that only accumulates numbers, one 100 ms interval
 * that is the only place the DOM is read for the anomaly scan, and one 20 Hz pass
 * that reads the field layers (see the note beside it: that one is the price of
 * seeing a one-frame jump, and it is the meter's own cost).
 *
 * That cost used to be an assumption. It is now measured: every pass the meter
 * schedules itself — the field pass, the 100 ms sampler, the sparklines, the badge
 * text — is wrapped in one performance.now() pair and summed into the report's
 * `meter` block. It is the line that decides whether a slow phone is the site or
 * the probe, and the badge's panel toggle turns the most expensive of those passes
 * off for a recording that leaves it out.
 */
(() => {
  if (window.__perfMeter) return;
  window.__perfMeter = true;

  /* -------------------------------------------------------------- constants */

  /**
   * The phone pays twice for every pass the meter schedules: in the frame it steals
   * and in the long task it joins.
   *
   * Measured on a real one — 5 cores, 352x781 at DPR 3.075, Brave on Android 10,
   * 2 nov 2026 — the meter charged itself 63.2 and 116.7 ms/s, that is 6.3 % and
   * 11.7 % of the measured window, with single passes of up to 41 ms. Ten to
   * fourteen field passes and ten samples per second at ~5.7 ms each is more than
   * two frames of jank per second that the site never asked for; an instrument that
   * expensive changes what it measures.
   *
   * So the schedule follows the pointer rather than one constant:
   *
   *   • fine pointer (a desktop): unchanged — 100 ms sampler, one field pass in
   *     three frames. There is budget to spare and the numbers stay comparable to
   *     the artifacts already stored;
   *   • coarse pointer (the phone being diagnosed): a 250 ms sampler, one field
   *     pass in twelve frames, and a quarter of the watchlist. The verdicts keep
   *     their meaning — the field history is still 90 samples, it simply covers
   *     more scroll — and the probe stops being the loudest thing in the report.
   */
  const COARSE_POINTER = (() => {
    try {
      return matchMedia("(pointer: coarse)").matches;
    } catch {
      return false;
    }
  })();

  const SAMPLE_MS = COARSE_POINTER ? 250 : 100;
  /** The phone has to survive this scan, so the watchlist is bounded on purpose. */
  const NODE_CAP = COARSE_POINTER ? 160 : 400;
  const MAX_ITEMS = 40;
  const TAP_SETTLE_MS = 400;
  /** One-time full-document style scans (will-change, blur) are capped too. */
  const SCAN_CAP = 4000;

  /* The field panel: sampled on every third frame, and it is always live. */
  const FIELD_SELECTORS = [
    [".bocanada-field", "field"],
    [".field-blob-1", "blob-1"],
    [".field-blob-2", "blob-2"],
    [".field-blob-3", "blob-3"],
    [".field-glow", "glow"],
    [".field-grain", "grain"],
    [".bocanada-lattice", "lattice"],
    [".bocanada-flares", "flares"],
    ["canvas", "canvas"],
  ];
  /** 90 samples at ~5 Hz on a phone is the last eighteen seconds of scroll, and at
      20 Hz on a desktop the last four; either is long enough to see a drift and short
      enough that the verdict follows the finger. */
  const FIELD_HISTORY = 90;
  const PINNED_PX = 2;
  const DRIFT_PX = 50;
  const DRIFT_R = 0.9;
  const JUMP_PX = 40;
  const FLICKER_STEP = 0.15;
  /* The site's own live green and coral: the panel is read at a glance on a phone. */
  const LIVE_COLOR = "#4ade80";
  const BAD_COLOR = "#e2727f";
  const SPARK_W = 96;
  const SPARK_H = 22;
  const SPARK_DPR = Math.min(typeof devicePixelRatio === "number" ? devicePixelRatio : 1, 2);
  /** The field pass: one frame in three on a fine pointer (~20 Hz at 60 Hz), one in
      twelve on a coarse one (~5 Hz). One pass is a forced layout read of nine nodes,
      and on the phone that read cost up to 41 ms — see the constants block. */
  const FIELD_FRAME_STRIDE = COARSE_POINTER ? 12 : 3;

  const INTERACTIVE =
    'a, button, [role="button"], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const REVEAL = "[data-r]";
  const SURFACE = '.marquee, .marquee-inner, .field-blob, [class*="field"], canvas, header, footer';

  /* Flags live beside the node list so a detector can ask "is this a tap target"
     without re-matching a selector on every node. */
  const F_INTERACTIVE = 1;
  const F_REVEAL = 2;
  const F_SURFACE = 4;

  /* A sample is a flat tuple, not an object: 400 nodes × 100 ms × a long scroll is
     a lot of tuples and the phone pays for every property it allocates. */
  const OP = 0;
  const HIDDEN = 1;
  const GONE = 2;
  const X = 3;
  const Y = 4;
  const W = 5;
  const H = 6;
  const SY = 7;

  /* A field row is a tuple too, and it keeps the layer's translate so the report can
     say how far the motion script moved it between the first and the last sample. */
  const L_SY = 0;
  const L_TOP = 1;
  const L_H = 2;
  const L_OP = 3;
  const L_HIDDEN = 4;
  const L_TX = 5;
  const L_TY = 6;

  /* ------------------------------------------------------------------ state */

  const S = {
    state: "idle",
    startedAtMs: 0,
    startedAtIso: "",
    durationMs: 0,
    samples: 0,
    frames: [],
    longtasks: [],
    loaf: [],
    cls: 0,
    fcp: 0,
    lcp: 0,
    nodes: [],
    flags: [],
    index: new WeakMap(),
    series: new Map(),
    classHits: new Map(),
    /* Up to three distinct class values per node, so classThrash can say what
       changed and not only how often. */
    classSeen: new Map(),
    anomalies: [],
    taps: [],
    /* The field panel is not windowed: it starts empty and fills as the reader
       scrolls, recording or not. */
    field: { layers: [], pass: 0, resolvedAt: -1000 },
    /** One row per long-task owner: the script or container the browser named. */
    longTaskOwners: new Map(),

  };

  /* The badge host exists from the first line of state so the detectors can ask
     "did the tap land on our own badge" without worrying about declaration order. */
  const host = document.createElement("div");

  let windowId = 0;
  let mutations = 0;
  let classChanges = 0;
  let lastFrame = 0;
  let sampleTimer = 0;
  let frameParity = 0;

  /** The field panel, the sparklines and the artifact all follow this flag. It is a
      module variable on purpose: a reload forgets it and a probe carries no storage. */
  let panelOn = true;

  /* The meter's own bill. One performance.now() pair per pass, never per watched
     node: the accounting must not materially change what it measures. */
  const M = {
    fieldPasses: 0,
    samples: 0,
    sparkDraws: 0,
    repaints: 0,
    costMs: 0,
    longestPassMs: 0,
    depth: 0,
  };

  /**
   * Time one self-scheduled pass. A pass that runs inside another pass (the field
   * pass paints its own text and its sparks) is measured once, at the outer span, so
   * no millisecond is billed twice. Only work inside the window is charged: the
   * panel is live before start() and after stop(), and that work never cost the
   * frames this window reports.
   */
  const meterPass = (fn) => {
    if (M.depth > 0) return fn();
    const t0 = performance.now();
    M.depth = 1;
    try {
      return fn();
    } finally {
      M.depth = 0;
      const ms = performance.now() - t0;
      if (S.state === "recording" && ms > 0) {
        M.costMs += ms;
        if (ms > M.longestPassMs) M.longestPassMs = ms;
      }
    }
  };

  const pct = (values, q) => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))].toFixed(1);
  };

  const query = (selector) => {
    try {
      return [...document.querySelectorAll(selector)];
    } catch {
      return [];
    }
  };

  /* --------------------------------------------------------------- observers */

  const observe = (type, handler) => {
    try {
      new PerformanceObserver((list) => {
        try {
          handler(list.getEntries());
        } catch {
          /* a bad entry must not take the meter down with it */
        }
      }).observe({ type, buffered: true });
    } catch {
      /* the browser may not know the type; the report shows absence as absence */
    }
  };

  /* Long tasks and layout shifts are windowed: a shift that happened while the page
     was still loading belongs to the load, not to the gesture being measured. */
  observe("longtask", (entries) => {
    if (S.state !== "recording") return;
    for (const e of entries) {
      S.longtasks.push(+e.duration.toFixed(1));
      /* Who blocked the thread, not only for how long. A duration alone cannot be
         acted on: `long tasks 31 · 2644 ms` says the phone stuttered, while
         `setTimeout@chunk.js 11 × 1.2 s` says what to open. The attribution the
         browser offers is coarse — a container type plus the script URL it came
         from, and often neither — so the unlabelled remainder is kept as its own
         row instead of being dropped. */
      const at = (e.attribution && e.attribution[0]) || {};
      const src = String(at.containerSrc || "");
      const name = String(at.containerName || "");
      const type = String(at.containerType || "");
      const key = src || name || (type ? `${type} (unnamed)` : "unattributed");
      const row = S.longTaskOwners.get(key) || { key, type, count: 0, ms: 0 };
      row.count += 1;
      row.ms += +e.duration.toFixed(1);
      S.longTaskOwners.set(key, row);
    }
  });
  /* A long task says the thread blocked; it does not say what the frame did with the
     time. `long-animation-frame` splits one frame into the phases the reader can feel
     — script, forced style/layout inside that script, and the render itself — and names
     the script by URL and function. On a phone with no cable this is the only way to
     find out who eats 400 ms: a `rAF` callback from our own chunk and a listener on
     `window` are indistinguishable in the task attribution above. */
  observe("long-animation-frame", (entries) => {
    if (S.state !== "recording") return;
    for (const e of entries) {
      const scripts = e.scripts || [];
      const js = scripts.reduce((a, sc) => a + (sc.duration || 0), 0);
      const forced = scripts.reduce((a, sc) => a + (sc.forcedStyleAndLayoutDuration || 0), 0);
      const render = e.renderStart ? Math.max(0, e.startTime + e.duration - e.renderStart) : 0;
      S.loaf.push({
        duration: +e.duration.toFixed(1),
        blocking: +(e.blockingDuration || 0).toFixed(1),
        js: +js.toFixed(1),
        forced: +forced.toFixed(1),
        render: +render.toFixed(1),
        scripts: scripts.map((sc) => ({
          url: String(sc.sourceURL || ""),
          fn: String(sc.sourceFunctionName || ""),
          how: String(sc.invokerType || ""),
          ms: +(sc.duration || 0).toFixed(1),
        })),
      });
    }
  });
  observe("layout-shift", (entries) => {
    if (S.state !== "recording") return;
    for (const e of entries) if (!e.hadRecentInput) S.cls += e.value;
  });
  /* Paint and LCP are load metrics; they keep their page-level value. */
  observe("paint", (entries) => {
    for (const e of entries) if (e.name === "first-contentful-paint") S.fcp = +e.startTime.toFixed(0);
  });
  observe("largest-contentful-paint", (entries) => {
    for (const e of entries) S.lcp = +e.startTime.toFixed(0);
  });

  const tick = (t) => {
    if (S.state === "recording" && lastFrame) S.frames.push(+(t - lastFrame).toFixed(1));
    lastFrame = t;
    /* One frame in FIELD_FRAME_STRIDE the field panel takes a sample — ~20 Hz on a
       fine pointer, ~5 Hz on a phone. It is a forced layout read of nine nodes and it
       is deliberate either way: a jump is a one-frame event, and a 100 ms sampler
       would miss exactly the thing being looked for. It is the meter's own cost, it is
       charged to the report's `meter` block, and the panel toggle switches it off. */
    if (panelOn && frameParity % FIELD_FRAME_STRIDE === 0) sampleField();
    frameParity += 1;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  /* A single observer feeds both the "the page mutated" signal that decides a dead
     tap and the per-node class counter that decides classThrash. */
  try {
    new MutationObserver((records) => {
      if (S.state !== "recording") return;
      for (const record of records) {
        mutations += 1;
        if (record.type !== "attributes" || record.attributeName !== "class") continue;
        classChanges += 1;
        const i = S.index.get(record.target);
        if (i === undefined) continue;
        S.classHits.set(i, (S.classHits.get(i) || 0) + 1);
        /* The values, not only the count: "site-header" turning into
           "site-header is-scrolled" is a scroll handler, while eight different
           strings is a loop rewriting the whole attribute. Three distinct values
           are enough to tell those apart, so the list stops there. */
        try {
          const raw = record.target.getAttribute("class");
          const value = String(raw === null ? "(no class)" : raw).slice(0, 60);
          let seen = S.classSeen.get(i);
          if (!seen) {
            seen = [];
            S.classSeen.set(i, seen);
          }
          if (seen.length < 3 && !seen.includes(value)) seen.push(value);
        } catch {
          /* an element that refuses the read still counts its changes */
        }
      }
    }).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
  } catch {
    /* no observer means no classThrash and no deadTap; the rest still measures */
  }

  /* --------------------------------------------------------------- watchlist */

  const watch = (node, flag) => {
    try {
      if (!node || node.nodeType !== 1) return;
      const known = S.index.get(node);
      if (known !== undefined) {
        S.flags[known] |= flag;
        return;
      }
      if (S.nodes.length >= NODE_CAP) return;
      const i = S.nodes.length;
      S.nodes.push(node);
      S.flags.push(flag);
      S.index.set(node, i);
      S.series.set(i, []);
    } catch {
      /* a node that refuses to be indexed is simply not watched */
    }
  };

  const buildWatchlist = () => {
    for (const node of query(INTERACTIVE)) watch(node, F_INTERACTIVE);
    for (const node of query(REVEAL)) watch(node, F_REVEAL);
    for (const node of query(SURFACE)) watch(node, F_SURFACE);

    /* will-change is not a queryable value, so the only way to find the promoted
       layers is to ask the style engine once. Bounded, and done before the window
       opens so its cost never lands in a measured frame. */
    try {
      const all = document.querySelectorAll("*");
      const cap = Math.min(all.length, SCAN_CAP);
      for (let i = 0; i < cap; i += 1) {
        const css = getComputedStyle(all[i]);
        if (css.willChange && css.willChange !== "auto") watch(all[i], F_SURFACE);
      }
    } catch {
      /* a partial watchlist still answers more than no watchlist */
    }
  };

  /* ------------------------------------------------------------------- field */

  const pluralCaps = (n) => `${n} ${n === 1 ? "capa" : "capas"}`;

  /**
   * The translate part of a layer, in px, as [x, y].
   *
   * The field layers use the individual `translate` property (`calc(var(--p) *
   * -30vh)`), which is the number the report wants: it is how much the motion
   * script moved the layer to compensate the scroll. `transform` is the fallback
   * for a layer that only has a matrix.
   */
  const translateOf = (css) => {
    try {
      const raw = css.translate;
      if (raw && raw !== "none") {
        const parts = raw.split(/\s+/).map((v) => parseFloat(v));
        return [Number.isFinite(parts[0]) ? parts[0] : 0, Number.isFinite(parts[1]) ? parts[1] : 0];
      }
      const transform = css.transform;
      if (transform && transform !== "none") {
        const match = /matrix(3d)?\(([^)]+)\)/.exec(transform);
        if (match) {
          const v = match[2].split(",").map((n) => parseFloat(n));
          if (match[1]) return [v[12] || 0, v[13] || 0];
          return [v[4] || 0, v[5] || 0];
        }
      }
    } catch {
      /* a layer without a readable transform is a zero, not a failure */
    }
    return [0, 0];
  };

  /** Resolve the layers by selector, keeping the history of a layer that survived. */
  const resolveFieldLayers = () => {
    const previous = new Map(S.field.layers.map((layer) => [layer.name, layer]));
    const next = [];
    for (const [selector, name] of FIELD_SELECTORS) {
      let node = null;
      try {
        node = document.querySelector(selector);
      } catch {
        node = null;
      }
      if (!node) continue;
      const old = previous.get(name);
      next.push(
        old && old.node === node
          ? old
          : { name, node, hist: [], verdict: "ok", position: "", documentTop: null, row: null },
      );
    }
    S.field.layers = next;
  };

  /**
   * The field mounts after hydration and the canvas after its own chunk, so a short
   * list is retried on a slow clock instead of with a query on every frame.
   */
  const ensureFieldLayers = (pass) => {
    const layers = S.field.layers;
    let vanished = false;
    for (const layer of layers) {
      if (!layer.node.isConnected) {
        vanished = true;
        break;
      }
    }
    if (!vanished && layers.length) {
      if (layers.length >= FIELD_SELECTORS.length) return;
      if (pass - S.field.resolvedAt < 60) return;
    }
    resolveFieldLayers();
    S.field.resolvedAt = pass;
  };

  /** Pearson r between the layer's viewport top and the scroll offset. */
  const correlation = (hist) => {
    const n = hist.length;
    if (n < 2) return 0;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    for (const row of hist) {
      const x = row[L_SY];
      const y = row[L_TOP];
      sx += x;
      sy += y;
      sxx += x * x;
      syy += y * y;
      sxy += x * y;
    }
    const num = n * sxy - sx * sy;
    const den = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
    return den === 0 ? 0 : num / den;
  };

  const layerVisible = (row) => row[L_HIDDEN] === 0 && row[L_OP] >= 0.05 && row[L_H] > 0;

  /**
   * The verdict of one layer, from its own history. Ordered by severity: a layer
   * that stopped painting is not also "drifting", it is gone.
   */
  const verdictOf = (hist) => {
    if (hist.length < 2) return "ok";
    const last = hist[hist.length - 1];

    let minTop = Infinity;
    let maxTop = -Infinity;
    let wasVisible = false;
    for (const row of hist) {
      if (row[L_TOP] < minTop) minTop = row[L_TOP];
      if (row[L_TOP] > maxTop) maxTop = row[L_TOP];
      if (layerVisible(row)) wasVisible = true;
    }

    /* lost: it was painting and it is not any more. A layer that was never
       visible (the glow is display:none on a coarse pointer) is not lost. */
    if (wasVisible && !layerVisible(last)) return "lost";

    /* jumps: the layer moved more in one step than the scroll did, by more than
       the threshold. A pinned layer moves 0 and a document layer moves as much as
       the scroll, so only a snap survives this test. */
    for (let i = 1; i < hist.length; i += 1) {
      const dTop = hist[i][L_TOP] - hist[i - 1][L_TOP];
      const dScroll = hist[i][L_SY] - hist[i - 1][L_SY];
      if (Math.abs(dTop) > Math.abs(dScroll) + JUMP_PX) return "jumps";
    }

    /* flickers: opacity crossed up and down by more than 0.15 at least twice. */
    let ups = 0;
    let downs = 0;
    let anchor = hist[0][L_OP];
    for (const row of hist) {
      const delta = row[L_OP] - anchor;
      if (delta > FLICKER_STEP) {
        ups += 1;
        anchor = row[L_OP];
      } else if (delta < -FLICKER_STEP) {
        downs += 1;
        anchor = row[L_OP];
      }
    }
    if (ups >= 2 && downs >= 2) return "flickers";

    const range = maxTop - minTop;
    if (range < PINNED_PX) return "pinned";
    /* drifts: it travelled with the content, and the correlation says so instead
       of a coincidence of two big numbers. */
    if (range > DRIFT_PX && Math.abs(correlation(hist)) > DRIFT_R) return "drifts";
    return "ok";
  };

  const fieldCounts = () => {
    const counts = { jumps: 0, flickers: 0, drifts: 0 };
    for (const layer of S.field.layers) {
      const verdict = layer.verdict;
      if (!verdict || verdict === "pinned" || verdict === "ok") continue;
      if (verdict === "lost") counts.flickers += 1;
      else counts[verdict] += 1;
    }
    return counts;
  };

  const fieldVerdict = () => {
    const counts = fieldCounts();
    const kinds = ["jumps", "flickers", "drifts"].filter((kind) => counts[kind] > 0);
    if (!kinds.length) return "pinned";
    return kinds.length > 1 ? "mixed" : kinds[0];
  };

  /** The one line the person on the phone actually reads. Spanish on purpose. */
  const fieldHeader = () => {
    const counts = fieldCounts();
    if (!counts.jumps && !counts.flickers && !counts.drifts) return "FONDO  clavado ✓";
    if (counts.jumps) return `FONDO  salta · ${pluralCaps(counts.jumps)} ⚠`;
    if (counts.flickers) return "FONDO  cambia solo ⚠";
    return `FONDO  desliza · ${pluralCaps(counts.drifts)} ⚠`;
  };

  const buildFieldRows = () => {
    if (!ui.fieldRows) return;
    const signature = S.field.layers.map((layer) => layer.name).join(",");
    if (signature === ui.fieldSignature) return;
    ui.fieldSignature = signature;
    ui.fieldRows.textContent = "";
    for (const layer of S.field.layers) {
      const row = document.createElement("div");
      row.className = "fr";
      const name = document.createElement("span");
      name.className = "fn";
      name.textContent = layer.name;
      const value = document.createElement("span");
      value.className = "fv ok";
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(SPARK_W * SPARK_DPR);
      canvas.height = Math.round(SPARK_H * SPARK_DPR);
      row.append(name, value, canvas);
      ui.fieldRows.appendChild(row);
      layer.row = { value, canvas, text: "" };
    }
  };

  /**
   * X is the sample index, Y is `topViewport` normalised to the observed min/max:
   * a flat line reads as pinned, a diagonal as drifting, a step as a jump.
   */
  const drawSpark = (layer) => {
    const spark = layer.row;
    if (!spark || !spark.canvas || typeof spark.canvas.getContext !== "function") return;
    let ctx = null;
    try {
      ctx = spark.canvas.getContext("2d");
    } catch {
      ctx = null;
    }
    if (!ctx) return;
    const hist = layer.hist;
    ctx.setTransform(SPARK_DPR, 0, 0, SPARK_DPR, 0, 0);
    ctx.clearRect(0, 0, SPARK_W, SPARK_H);
    if (hist.length < 2) return;
    let min = Infinity;
    let max = -Infinity;
    for (const row of hist) {
      if (row[L_TOP] < min) min = row[L_TOP];
      if (row[L_TOP] > max) max = row[L_TOP];
    }
    const flat = max - min < 0.5;
    ctx.strokeStyle = layer.verdict === "pinned" || layer.verdict === "ok" ? LIVE_COLOR : BAD_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < hist.length; i += 1) {
      const x = (i / (FIELD_HISTORY - 1)) * (SPARK_W - 1) + 0.5;
      const y = flat ? SPARK_H / 2 : SPARK_H - 1.5 - ((hist[i][L_TOP] - min) / (max - min)) * (SPARK_H - 3);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  const signed = (n) => {
    const rounded = Math.abs(n) < 10 ? n.toFixed(1) : String(Math.round(n));
    return n > 0 ? `+${rounded}` : rounded;
  };

  /** Text is written only when it changed, so a still page writes nothing. */
  const paintField = () => {
    M.repaints += 1;
    meterPass(() => {
      try {
        if (!ui.fieldHead) return;
        /* Panel off: the readout is one line, and nothing is drawn, read or
           built behind it. */
        if (!panelOn) {
          if (ui.fieldHead.textContent !== "panel apagado") ui.fieldHead.textContent = "panel apagado";
          if (ui.fieldRows && ui.fieldRows.firstChild) {
            ui.fieldRows.textContent = "";
            ui.fieldSignature = "";
          }
          for (const layer of S.field.layers) layer.row = null;
          return;
        }
        if (!S.field.layers.length) {
          if (ui.fieldHead.textContent !== "FONDO  sin capas") ui.fieldHead.textContent = "FONDO  sin capas";
          if (ui.fieldRows && ui.fieldRows.firstChild) {
            ui.fieldRows.textContent = "";
            ui.fieldSignature = "";
          }
          return;
        }
        buildFieldRows();
        const header = fieldHeader();
        if (ui.fieldHead.textContent !== header) ui.fieldHead.textContent = header;
        for (const layer of S.field.layers) {
          const spark = layer.row;
          if (!spark) continue;
          const hist = layer.hist;
          const delta = hist.length > 1 ? hist[hist.length - 1][L_TOP] - hist[0][L_TOP] : 0;
          const parts = [];
          if (layer.name === "field" && layer.position) parts.push(layer.position);
          parts.push(`${layer.verdict} ${layer.verdict === "pinned" || layer.verdict === "ok" ? "✓" : "⚠"}`);
          parts.push(`Δview ${signed(delta)}px`);
          const text = parts.join(" · ");
          if (spark.text !== text) {
            spark.value.textContent = text;
            spark.value.className = `fv ${layer.verdict === "pinned" || layer.verdict === "ok" ? "ok" : "bad"}`;
            spark.text = text;
          }
          /* No sparkline while the window is open: a readout that spends frames
             inside the window it measures is a bad trade, so the draws wait for the
             done state, where they happen once (and any later repaint of the live
             panel is outside the window too). */
          if (S.state !== "recording") {
            M.sparkDraws += 1;
            meterPass(() => drawSpark(layer));
          }
        }
      } catch {
        /* the panel is a readout; it must never take the measurement down */
      }
    });
  };

  const sampleFieldOnce = () => {
    const pass = (S.field.pass += 1);
    ensureFieldLayers(pass);
    const layers = S.field.layers;
    if (!layers.length) {
      if (pass === 1 || pass % 4 === 0) paintField();
      return;
    }
    let scrollY = 0;
    try {
      scrollY = Math.round(window.scrollY);
    } catch {
      scrollY = 0;
    }
    for (const layer of layers) {
      try {
        /* Reads only, and nothing is written between them: the whole panel costs
           one layout flush per pass, not one per node. */
        const css = getComputedStyle(layer.node);
        const box = layer.node.getBoundingClientRect();
        const translate = translateOf(css);
        const opacity = parseFloat(css.opacity);
        layer.hist.push([
          scrollY,
          Math.round(box.top * 10) / 10,
          Math.round(box.height * 10) / 10,
          Number.isFinite(opacity) ? Math.round(opacity * 1000) / 1000 : 1,
          css.display === "none" || css.visibility === "hidden" ? 1 : 0,
          Math.round(translate[0] * 10) / 10,
          Math.round(translate[1] * 10) / 10,
        ]);
        if (layer.hist.length > FIELD_HISTORY) layer.hist.shift();
        layer.position = css.position;
        layer.documentTop = Math.round((box.top + scrollY) * 10) / 10;
        layer.verdict = verdictOf(layer.hist);
      } catch {
        /* one unreadable layer is skipped, the rest still answers */
      }
    }
    /* The panel is a readout, not a measurement: one field pass in four is enough to
       watch it while scrolling and cheap enough to leave running. */
    if (pass % 4 === 0) paintField();
  };

  const sampleField = () => {
    if (!panelOn) return;
    M.fieldPasses += 1;
    meterPass(sampleFieldOnce);
  };

  /** The POSTed field block, or null when the page has no field at all. */
  const fieldReport = () => {
    /* The panel was off, so the artifact says so instead of borrowing a verdict
       from a pass that never ran. */
    if (!panelOn) return { verdict: "disabled", layers: [] };
    const layers = S.field.layers;
    if (!layers.length) return null;
    let from = Infinity;
    let to = -Infinity;
    const out = [];
    for (const layer of layers) {
      const hist = layer.hist;
      let minOp = Infinity;
      let maxOp = -Infinity;
      for (const row of hist) {
        if (row[L_SY] < from) from = row[L_SY];
        if (row[L_SY] > to) to = row[L_SY];
        if (row[L_OP] < minOp) minOp = row[L_OP];
        if (row[L_OP] > maxOp) maxOp = row[L_OP];
      }
      const first = hist[0];
      const last = hist[hist.length - 1];
      out.push({
        name: layer.name,
        verdict: layer.verdict || "ok",
        position: layer.position || "",
        documentTop: layer.documentTop,
        deltaViewport: first && last ? +(last[L_TOP] - first[L_TOP]).toFixed(1) : 0,
        deltaTranslate:
          first && last ? +Math.hypot(last[L_TX] - first[L_TX], last[L_TY] - first[L_TY]).toFixed(1) : 0,
        opacityMin: Number.isFinite(minOp) ? +minOp.toFixed(3) : null,
        opacityMax: Number.isFinite(maxOp) ? +maxOp.toFixed(3) : null,
        samples: hist.length,
      });
    }
    if (!Number.isFinite(from)) {
      from = 0;
      to = 0;
    }
    return { verdict: fieldVerdict(), scrollRange: { from, to }, layers: out };
  };

  /* ---------------------------------------------------------------- sampling */

  const sampleOnce = () => {
    let sy = 0;
    try {
      sy = Math.round(window.scrollY);
    } catch {
      sy = 0;
    }
    const nodes = S.nodes;
    for (let i = 0; i < nodes.length; i += 1) {
      try {
        const el = nodes[i];
        const rows = S.series.get(i);
        if (!rows) continue;
        /* Nothing is written to the DOM in this pass, so one clean layout serves
           every read and the style call cannot force a re-layout per node. */
        const css = getComputedStyle(el);
        /* `sy` is read once for the pass, but this loop walks up to 160 nodes and a
           flick keeps moving the page between them: pairing one node's box with a
           `scrollY` sampled earlier in the pass is exactly the lag the jitter
           detector then reads as the element moving on its own. One scroll read
           per node costs the layout the `getBoundingClientRect` below forces
           anyway. */
        let syNode = sy;
        try {
          syNode = Math.round(window.scrollY);
        } catch {
          syNode = sy;
        }
        const box = el.getBoundingClientRect();
        const rawOpacity = parseFloat(css.opacity);
        rows.push([
          Number.isFinite(rawOpacity) ? Math.round(rawOpacity * 1000) / 1000 : 1,
          css.visibility === "hidden" ? 1 : 0,
          css.display === "none" ? 1 : 0,
          Math.round(box.x * 10) / 10,
          Math.round(box.y * 10) / 10,
          Math.round(box.width * 10) / 10,
          Math.round(box.height * 10) / 10,
          syNode,
        ]);
      } catch {
        /* one detached or hostile node must never stop the scan */
      }
    }
    S.samples += 1;
  };

  const sample = () => {
    if (S.state !== "recording") return;
    M.samples += 1;
    meterPass(sampleOnce);
  };

  /* --------------------------------------------------------------- reporting */

  const selectorOf = (node) => {
    try {
      if (!node || !node.tagName) return "unknown";
      const tag = node.tagName.toLowerCase();
      const cls = node.classList && node.classList.length ? `.${node.classList[0]}` : "";
      let nth = 1;
      let sib = node;
      while ((sib = sib.previousElementSibling)) if (sib.tagName === node.tagName) nth += 1;
      return `${tag}${cls}:nth-of-type(${nth})`;
    } catch {
      return "unknown";
    }
  };

  const labelOf = (node) => {
    try {
      const aria = node.getAttribute && node.getAttribute("aria-label");
      if (aria && aria.trim()) return aria.trim().slice(0, 40);
      const text = (node.textContent || "").replace(/\s+/g, " ").trim();
      if (text) return text.slice(0, 40);
      if (node.classList && node.classList.length) return [...node.classList].join(" ").slice(0, 40);
      return "";
    } catch {
      return "";
    }
  };

  const report = (kind, node, at, detail) => {
    S.anomalies.push({
      kind,
      selector: selectorOf(node),
      label: labelOf(node),
      at: Math.round(at),
      detail,
    });
  };

  const isVisible = (row) => row[GONE] === 0 && row[HIDDEN] === 0 && row[OP] > 0.1 && row[H] > 0;

  const inViewport = (row) => row[Y] < innerHeight && row[Y] + row[H] > 0;

  /** Settled once, by its own 400 ms timer or by the window closing first. */
  const settleTap = (tap) => {
    if (tap.settled) return;
    tap.settled = true;
    if (tap.windowId !== windowId) return;
    if (mutations !== tap.mutations) return;
    if (classChanges !== tap.classes) return;
    if (location.href !== tap.href) return;
    /* A tap that changed nothing is the signature of a control that looks live and
       is not: the handler is missing, or something else is on top of it. */
    report("deadTap", tap.node, tap.at - S.startedAtMs, "no DOM, class or URL change within 400 ms");
  };

  const noteTap = (event) => {
    if (S.state !== "recording") return;
    try {
      const target = event.target;
      const node = target && target.closest ? target.closest(INTERACTIVE) : null;
      if (!node) return;
      const tap = {
        node,
        at: performance.now(),
        mutations,
        classes: classChanges,
        href: String(location.href),
        windowId,
        settled: false,
      };
      S.taps.push(tap);
      setTimeout(() => settleTap(tap), TAP_SETTLE_MS);
    } catch {
      /* a weird event target is not a measurement failure */
    }
  };
  try {
    document.addEventListener("pointerdown", noteTap, true);
  } catch {
    /* no capture listener means no deadTap; everything else still runs */
  }

  const coveredDetail = (row, node) => {
    const cx = row[X] + row[W] / 2;
    const cy = row[Y] + row[H] / 2;
    if (typeof document.elementFromPoint !== "function") return null;
    const hit = document.elementFromPoint(cx, cy);
    if (!hit) return null;
    /* Our own badge is the one element allowed to sit on top of the site. */
    if (hit === host || host.contains(hit)) return null;
    /* The node is covered only when the tap resolves to something *else*: its own
       child, or a wrapper it lives in, still means the tap reaches it. */
    if (hit === node || node.contains(hit)) return null;
    return hit;
  };

  const offsetOf = (node) => {
    /* scrollWidth/clientWidth is read here, at the end, and never in the loop. */
    try {
      return { sw: node.scrollWidth, cw: node.clientWidth };
    } catch {
      return null;
    }
  };

  const analyse = () => {
    for (let i = 0; i < S.nodes.length; i += 1) {
      try {
        const rows = S.series.get(i);
        if (!rows || rows.length < 2) continue;
        const node = S.nodes[i];
        const flags = S.flags[i] || 0;
        const first = rows[0];
        const last = rows[rows.length - 1];

        /* flicker: opacity that keeps swinging is a looping animation the reader can
           see hovering, and it usually means a React state loop. */
        let ups = 0;
        let downs = 0;
        let anchor = first[OP];
        for (const row of rows) {
          const delta = row[OP] - anchor;
          if (delta > 0.15) {
            ups += 1;
            anchor = row[OP];
          } else if (delta < -0.15) {
            downs += 1;
            anchor = row[OP];
          }
        }
        if (ups >= 2 && downs >= 2) {
          report("flicker", node, S.durationMs, `opacity ${ups}x up, ${downs}x down`);
        }

        /* vanished: something the reader could see at the start is gone at the end,
           so a block unmounted or was hidden mid-gesture. */
        if (isVisible(first) && !isVisible(last)) {
          report("vanished", node, S.durationMs, `opacity ${last[OP]} at the last sample`);
        }

        /* jitter: the offset inside the document moved while the reader did not
           scroll. That is content moving on its own, not scrolling. A box that
           collapsed to zero is a removal, and `vanished` already says so. */
        for (let k = 1; k < rows.length; k += 1) {
          const a = rows[k - 1];
          const b = rows[k];
          if (a[SY] !== b[SY] || a[H] <= 0 || b[H] <= 0) continue;
          const moved = b[Y] - b[SY] - (a[Y] - a[SY]);
          if (Math.abs(moved) > 4) {
            report("jitter", node, k * SAMPLE_MS, `${Math.round(moved)} px with scrollY unchanged`);
            break;
          }
        }

        /* resized: a box that changes by a fifth between the ends of the window is a
           late layout shift, usually a font, an image or a measured height. A box
           that ends at zero was removed, which is `vanished`'s business. */
        const dw = first[W] > 0 ? Math.abs(last[W] - first[W]) / first[W] : 0;
        const dh = first[H] > 0 ? Math.abs(last[H] - first[H]) / first[H] : 0;
        if (last[W] > 0 && last[H] > 0 && (dw > 0.2 || dh > 0.2)) {
          report(
            "resized",
            node,
            S.durationMs,
            `${first[W]}x${first[H]} -> ${last[W]}x${last[H]} (${Math.round(dw * 100)}% / ${Math.round(dh * 100)}%)`,
          );
        }

        /* covered: the tap goes to whatever elementFromPoint returns, so if that is
           not this node, the reader is tapping something else. Only visible nodes:
           a control hidden with visibility/pointer-events is not "under something
           else", and the closed mobile drawer would otherwise fill this list. */
        if (flags & F_INTERACTIVE && isVisible(last) && inViewport(last) && last[W] > 0 && last[H] > 0) {
          const hit = coveredDetail(last, node);
          if (hit) {
            report("covered", node, S.durationMs, `centre hits ${selectorOf(hit)}`);
          }
        }

        /* overflow: a row whose content does not fit and cannot be scrolled to is
           clipped content, not a design choice. */
        if (inViewport(last) && last[W] > 0) {
          const box = offsetOf(node);
          if (box && box.sw - box.cw > 2) {
            report("overflow", node, S.durationMs, `scrollWidth ${box.sw} > clientWidth ${box.cw}`);
          }
        }

        /* outsider: reported, never judged. The marquee is supposed to be wider than
           the screen, so the classes are printed and the reader decides. */
        const right = last[X] + last[W];
        if (inViewport(last) && (right > innerWidth + 2 || last[X] < -2)) {
          const classes = String((node.getAttribute && node.getAttribute("class")) || "").slice(0, 120);
          report(
            "outsider",
            node,
            S.durationMs,
            `left ${Math.round(last[X])} right ${Math.round(right)} vs viewport ${innerWidth} · class="${classes}"`,
          );
        }

        /* classThrash: twenty class writes inside one gesture is a JS loop
           rendering the same node, which is a frame cost with no visual result.
           The floor was eight, and a live report proved it too low: the site
           header and its nav links legitimately rewrite `is-scrolled` and
           `is-nav-active` eight or nine times across a 30 s scroll, so every run
           reported a "thrash" that was the scroll handler doing its job. */
        const hits = S.classHits.get(i) || 0;
        if (hits >= 20) {
          /* With the values beside the count the reader can tell a scroll handler
             toggling one class from a loop rewriting the whole attribute. */
          const seen = S.classSeen.get(i) || [];
          const values = seen.length ? ` · class="${seen.join('" | "')}"` : "";
          report("classThrash", node, S.durationMs, `${hits} class changes${values}`);
        }
      } catch {
        /* one bad node must not cost the whole anomaly scan */
      }
    }

    /* Taps whose 400 ms did not fit in the window still count. */
    const now = performance.now();
    for (const tap of S.taps) {
      if (!tap.settled && now - tap.at >= TAP_SETTLE_MS) settleTap(tap);
    }
  };

  /**
   * The meter's own bill for this window — a first-class report line, because it
   * decides whether the frame numbers describe the site or the probe. Never throws:
   * a report built before any pass ran is zeros with null rates.
   */
  const meterBlock = () => {
    const windowMs = Number.isFinite(S.durationMs) ? S.durationMs : 0;
    const costMsTotal = +M.costMs.toFixed(1);
    return {
      windowMs,
      fieldPasses: M.fieldPasses,
      samples: M.samples,
      sparkDraws: M.sparkDraws,
      repaints: M.repaints,
      costMsTotal,
      costMsPerSecond: windowMs > 0 ? +(costMsTotal / (windowMs / 1000)).toFixed(1) : null,
      costPctOfWindow: windowMs > 0 ? +((100 * costMsTotal) / windowMs).toFixed(2) : null,
      longestPassMs: +M.longestPassMs.toFixed(1),
    };
  };

  const blurRadius = (value) => {
    const match = /blur\(\s*([\d.]+)px/.exec(value || "");
    return match ? Number(match[1]) : 0;
  };

  /** One pass at the end of the window: the compositing bill the phone pays. */
  const surfaceStats = () => {
    const out = { animations: 0, surfaceAnimations: 0, willChange: 0, blurred: 0, blurredMpx: 0 };
    try {
      const animations = typeof document.getAnimations === "function" ? document.getAnimations() : [];
      out.animations = animations.length;
      for (const animation of animations) {
        const target = animation.effect && animation.effect.target;
        if (!target) continue;
        const i = S.index.get(target);
        if (i !== undefined && S.flags[i] & F_SURFACE) out.surfaceAnimations += 1;
      }
    } catch {
      /* no animations API is a zero, not a crash */
    }
    try {
      const all = document.querySelectorAll("*");
      const cap = Math.min(all.length, SCAN_CAP);
      for (let i = 0; i < cap; i += 1) {
        const el = all[i];
        const css = getComputedStyle(el);
        /* A `display: none` node still answers getComputedStyle, and it is not
           composited at all. Counting it inflated the inventory by half: ten of the
           nineteen hints reported from a phone belonged to the blob layers the
           narrow layout hides behind one stacked background-image, and to a preview
           that is `display: none` on touch — a surface count nobody could act on. */
        if (css.display === "none") continue;
        const filter = css.filter && css.filter !== "none" ? css.filter : "";
        const backdrop = css.backdropFilter && css.backdropFilter !== "none" ? css.backdropFilter : "";
        if (!filter && !backdrop && (!css.willChange || css.willChange === "auto")) continue;
        /* One box read, only for a node that is actually drawn: a rendered element
           with no box (a bare container, a collapsed anchor) is not a surface. */
        const box = el.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) continue;
        if (css.willChange && css.willChange !== "auto") out.willChange += 1;
        if (!filter && !backdrop) continue;
        out.blurred += 1;
        /* The blurred region is the box grown by the radius: that is the area the
           compositor has to raster, and the field's blobs are the known suspect. */
        const radius = Math.max(blurRadius(filter), blurRadius(backdrop));
        out.blurredMpx += ((box.width + radius * 2) * (box.height + radius * 2)) / 1e6;
      }
    } catch {
      /* the scan is bounded and best-effort */
    }
    out.blurredMpx = Math.round(out.blurredMpx * 100) / 100;
    return out;
  };

  const buildReport = () => {
    const refreshMs = pct(S.frames.slice(0, 120), 0.5) || 16.7;
    const budget = +(refreshMs * 1.5).toFixed(1);
    const reveals = query(REVEAL);
    const inView = (node) => {
      try {
        const box = node.getBoundingClientRect();
        return box.top < innerHeight && box.bottom > 0;
      } catch {
        return false;
      }
    };
    const stuck = reveals.filter((node) => {
      try {
        return inView(node) && Number(getComputedStyle(node).opacity) < 0.5;
      } catch {
        return false;
      }
    }).length;
    const resources = performance.getEntriesByType("resource");
    const scripts = resources.filter((e) => e.initiatorType === "script");
    const kb = (list) => Math.round(list.reduce((a, b) => a + (b.transferSize || 0), 0) / 1024);

    const byKind = {};
    for (const item of S.anomalies) byKind[item.kind] = (byKind[item.kind] || 0) + 1;
    const items = [...S.anomalies]
      .sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : a.at - b.at))
      .slice(0, MAX_ITEMS);

    return {
      ts: new Date().toISOString(),
      url: location.pathname + location.search,
      ua: navigator.userAgent,
      screen: { w: screen.width, h: screen.height, dpr: devicePixelRatio },
      viewport: { w: innerWidth, h: innerHeight },
      cores: navigator.hardwareConcurrency || null,
      memoryGb: navigator.deviceMemory || null,
      refreshMs: +refreshMs.toFixed(1),
      refreshHz: Math.round(1000 / refreshMs),
      frames: {
        n: S.frames.length,
        p50: pct(S.frames, 0.5),
        p95: pct(S.frames, 0.95),
        p99: pct(S.frames, 0.99),
        max: pct(S.frames, 1),
        overBudget: S.frames.filter((d) => d > budget).length,
        over32: S.frames.filter((d) => d > 32).length,
        over50: S.frames.filter((d) => d > 50).length,
        budget,
      },
      longtasks: {
        count: S.longtasks.length,
        totalMs: +S.longtasks.reduce((a, b) => a + b, 0).toFixed(0),
        maxMs: S.longtasks.length ? +Math.max(...S.longtasks).toFixed(0) : 0,
        /* Sorted by the time they cost, so the first row is the one worth opening. */
        owners: [...S.longTaskOwners.values()]
          .sort((a, b) => b.ms - a.ms)
          .slice(0, 6)
          .map((row) => ({ owner: row.key, type: row.type || null, count: row.count, ms: +row.ms.toFixed(0) })),
      },
      /* Where the frame time went, and by whom. `rows` is grouped by script so the
         first row is the file to open; `phases` says whether the bill was script,
         forced style/layout inside that script, or the render that followed. */
      loaf: (() => {
        if (!S.loaf.length) return { count: 0 };
        const sum = (key) => +S.loaf.reduce((a, e) => a + e[key], 0).toFixed(0);
        const rows = new Map();
        for (const e of S.loaf) {
          for (const sc of e.scripts) {
            const key = `${sc.url || "(no url)"} ${sc.fn || ""} [${sc.how}]`.trim();
            const row = rows.get(key) || { key, count: 0, ms: 0 };
            row.count += 1;
            row.ms += sc.ms;
            rows.set(key, row);
          }
        }
        return {
          count: S.loaf.length,
          maxMs: Math.max(...S.loaf.map((e) => e.duration)),
          jsMs: sum("js"),
          forcedMs: sum("forced"),
          renderMs: sum("render"),
          blockingMs: sum("blocking"),
          rows: [...rows.values()]
            .sort((a, b) => b.ms - a.ms)
            .slice(0, 6)
            .map((row) => ({ script: row.key, count: row.count, ms: +row.ms.toFixed(0) })),
        };
      })(),
      vitals: { fcp: S.fcp, lcp: S.lcp, cls: +S.cls.toFixed(4) },
      reveals: {
        total: reveals.length,
        revealed: reveals.filter((node) => {
          try {
            return node.classList.contains("is-in");
          } catch {
            return false;
          }
        }).length,
        stuckInView: stuck,
      },
      resources: {
        count: resources.length,
        kb: kb(resources),
        jsKb: kb(scripts),
      },
      scroll: {
        y: Math.round(window.scrollY),
        docHeight: document.documentElement.scrollHeight,
      },
      canvas: query("canvas").length,
      anomalies: { total: S.anomalies.length, byKind, items },
      /* The meter's own cost, so a stored artifact can never be read as if the
         probe were free. */
      meter: meterBlock(),
      window: {
        startedAt: S.startedAtIso,
        durationMs: S.durationMs,
        taps: S.taps.length,
        samples: S.samples,
        /* Which layer was switched off while these frames were measured, if any. */
        ablate: ablate || null,
        /* A field block cannot be interpreted without it: `disabled` is not `pinned`. */
        panelOn,
      },
      surfaces: surfaceStats(),
      /* Always live, so it reports even when the window was never opened. */
      field: fieldReport(),
    };
  };

  /* ---------------------------------------------------------------- ablation */

  /**
   * Turn one layer of the page off — from the phone — and put it back.
   *
   * `pnpm perf --only ablate` already does this on the machine (`no-blur`,
   * `no-blobs`, `no-marquee`), and its deltas landed on one-frame quantisation, so it
   * could not say which layer is guilty. The device that stutters is the phone, and
   * a finger on it is the only input that reproduces the jank — so the switch lives
   * here, and the rules are injected by the meter instead of living in the sheet: an
   * ablation is a diagnostic and must never ship in a production stylesheet.
   *
   * The report records `window.ablate`, so an artifact always says which layer was
   * missing while those frames were measured.
   */
  const ABLATIONS = {
    field:
      ".bocanada-field, .field-blob, .bocanada-lattice, .bocanada-flares, .field-glow, .field-grain, .field-progress",
    marquee: ".marquee",
    flares: ".bocanada-flares",
  };
  const ABLATE_CSS = [
    ...Object.entries(ABLATIONS).map(([name, selectors]) =>
      selectors
        .split(",")
        .map((one) => `html[data-ablate="${name}"] ${one.trim()} { display: none !important; }`)
        .join("\n"),
    ),
    /* The reveal, left permanently on: this keeps the entrance out of the window. */
    'html[data-ablate="reveal"] [data-r], html[data-ablate="reveal"] [data-r] .w > span { opacity: 1 !important; transform: none !important; transition: none !important; animation: none !important; }',
    /* Every filter and every blend at once: the whole compositing bill, in one row. */
    'html[data-ablate="blur"] * { filter: none !important; backdrop-filter: none !important; mix-blend-mode: normal !important; }',
  ].join("\n");

  let ablate = "";
  let ablateStyle = null;

  /** `null` clears it. Anything unknown is treated as `null`, never as "leave it". */
  const setAblate = (name) => {
    const allowed = name === "reveal" || name === "blur" || Object.hasOwn(ABLATIONS, name);
    const next = typeof name === "string" && allowed ? name : "";
    try {
      if (next && !ablateStyle) {
        ablateStyle = document.createElement("style");
        ablateStyle.id = "__perf-ablate";
        ablateStyle.textContent = ABLATE_CSS;
        document.head.appendChild(ablateStyle);
      }
      ablate = next;
      if (next) document.documentElement.setAttribute("data-ablate", next);
      else document.documentElement.removeAttribute("data-ablate");
      /* Hiding a layer changes what the instance scan should sample. */
      S.field.resolvedAt = -1000;
      paintAblate();
      paintField();
    } catch {
      /* a document that refuses the attribute still measures */
    }
    return ablate || null;
  };

  /* ------------------------------------------------------------------ badge */

  /**
   * The meter is a visitor on a page it does not own, so its interface is a
   * bubble and nothing else.
   *
   * Closed — which is how it starts — it is one 52 px circle in the bottom-right
   * corner: 52 px because that is the smallest circle a thumb still hits, and
   * because the panel it opens used to be `left:10px; right:10px`, which on a
   * phone is the bottom third of the site. The bubble carries the state by
   * itself (`PERF` at rest, the live refresh rate while recording, `✓` when the
   * window closed), so a person who never opens the panel still sees whether the
   * meter is running.
   *
   * Open, the panel is at most 344 px wide and `min(68vh, 560px)` tall with its
   * own scroll, and its readouts are three `<details>` sections — Fondo, Ventana,
   * Anomalías. Folding one costs no JS and its state survives every paint,
   * because the paints write text into rows that already exist instead of
   * rebuilding the panel. Nothing at all is written into the panel while it is
   * closed: the only DOM work a closed meter does is the bubble's own label.
   */
  let root = null;
  const ui = {};

  let open = false;
  /** The last verdict, kept because the panel may be closed when it is produced. */
  let verdictText = "";
  /** The anomalies are rebuilt only when the scan actually added something. */
  let anomaliesSignature = "";
  const BUBBLE_IDLE = "PERF";

  try {
    root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `
      <style>
        :host { all: initial; }
        .b {
          position: fixed; right: 16px; bottom: 16px; z-index: 2147483000;
          width: 52px; height: 52px; padding: 0; border-radius: 50%;
          display: grid; place-items: center;
          font: 600 9.5px/1 ui-monospace, monospace; letter-spacing: .08em;
          color: #c2cde4; background: rgba(6,11,26,.9);
          border: 1px solid rgba(143,203,255,.4); cursor: pointer;
          box-shadow: 0 8px 24px rgba(0,0,0,.45);
          backdrop-filter: blur(10px) saturate(140%);
          -webkit-backdrop-filter: blur(10px) saturate(140%);
          transition: color .22s ease, border-color .22s ease, transform .22s ease;
        }
        .b:hover { transform: translateY(-1px); color: #eef2ff; }
        .b.rec { color: #8fcbff; border-color: rgba(143,203,255,.85); }
        .b.done { color: #4ade80; border-color: rgba(74,222,128,.65); }
        .b:focus-visible { outline: 2px solid #8fcbff; outline-offset: 3px; }
        .p {
          position: fixed; right: 16px; bottom: 78px; z-index: 2147483000;
          width: min(344px, calc(100vw - 32px));
          max-height: min(68vh, 560px);
          display: grid; grid-template-rows: auto auto minmax(0, 1fr) auto;
          font: 12px/1.35 ui-monospace, monospace; color: #eef2ff;
          background: rgba(6,11,26,.96); border: 1px solid rgba(255,255,255,.16);
          border-radius: 14px; overflow: hidden;
          box-shadow: 0 18px 48px rgba(0,0,0,.6);
          backdrop-filter: blur(16px) saturate(150%);
          -webkit-backdrop-filter: blur(16px) saturate(150%);
        }
        .p[hidden] { display: none; }
        .hd {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding: 9px 12px; border-bottom: 1px solid rgba(255,255,255,.1);
        }
        .hdt { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: #8fcbff; }
        .x {
          font: inherit; font-size: 14px; line-height: 1; padding: 2px 7px; cursor: pointer;
          color: #c2cde4; background: transparent; border: 0; border-radius: 6px;
        }
        .x:hover { color: #eef2ff; background: rgba(255,255,255,.08); }
        .st { display: grid; gap: 3px; padding: 8px 12px 0; }
        .s { font-size: 11px; color: #c2cde4; }
        .bd { display: grid; gap: 7px; padding: 8px 12px; overflow-y: auto; overscroll-behavior: contain; }
        details { border-top: 1px solid rgba(255,255,255,.08); padding-top: 6px; }
        details:first-of-type { border-top: 0; padding-top: 0; }
        summary {
          cursor: pointer; list-style: none; display: flex; gap: 8px;
          align-items: baseline; justify-content: space-between;
          font-size: 10.5px; letter-spacing: .07em; color: #c2cde4;
        }
        summary::-webkit-details-marker { display: none; }
        summary::after { content: "+"; color: #8fcbff; font-size: 12px; }
        details[open] > summary::after { content: "\\2013"; }
        .rows { display: grid; gap: 4px; padding-top: 6px; }
        .fl { display: grid; gap: 2px; max-height: 26vh; overflow: auto; }
        /* 44 + 56 + 12 of gaps leaves ~200px for the verdict: at 10px monospace that
           is the whole "pinned check · dview 0.0px" line, and the sparkline still has
           a box of its own instead of squeezing the text into an ellipsis. */
        .fr { display: grid; grid-template-columns: 44px minmax(0, 1fr) 56px; gap: 6px; align-items: center; }
        .fr canvas { width: 56px; height: 18px; display: block; }
        .fn { font-size: 10px; color: #8fcbff; white-space: nowrap; }
        .fv { font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fv.ok { color: #4ade80; }
        .fv.bad { color: #e2727f; }
        .kv { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; font-size: 10.5px; }
        .kv i { font-style: normal; color: #9eabc4; }
        .kv b { font-weight: 600; color: #eef2ff; }
        .an { display: grid; gap: 1px; font-size: 10.5px; padding: 1px 0; }
        .an .k { color: #e2727f; }
        .an .w { color: #9eabc4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        /* Layer ablation, on the device that stutters: one button per layer. */
        .abl { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; }
        .abl button {
          font: inherit; font-size: 10px; padding: 6px 4px; border-radius: 7px; cursor: pointer;
          color: #c2cde4; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.16);
        }
        .abl button.on { color: #07102a; background: #8fcbff; border-color: #8fcbff; font-weight: 600; }
        .ft {
          display: grid; grid-template-columns: 1fr auto auto; gap: 8px;
          padding: 9px 12px; border-top: 1px solid rgba(255,255,255,.1);
        }
        button.pri, button.sec {
          font: inherit; font-size: 11.5px; padding: 8px 10px; border-radius: 9px; cursor: pointer;
        }
        button.pri { background: #8fcbff; color: #07102a; border: 1px solid #8fcbff; font-weight: 600; }
        button.sec { background: rgba(255,255,255,.07); color: #eef2ff; border: 1px solid rgba(255,255,255,.18); }
        button.sec[hidden] { display: none; }
      </style>
      <button class="b" id="bub" type="button" aria-expanded="false" aria-controls="pnl"
        title="Medidor de rendimiento" aria-label="Medidor de rendimiento">${BUBBLE_IDLE}</button>
      <section class="p" id="pnl" hidden aria-label="Medidor de rendimiento">
        <div class="hd">
          <span class="hdt">perf · esta página</span>
          <button class="x" id="close" type="button" title="Cerrar el panel" aria-label="Cerrar el panel">×</button>
        </div>
        <div class="st">
          <div class="s" id="live">sin medir</div>
          <div class="s" id="hint">Tocá Empezar y después scrolleá el sitio.</div>
          <div class="s" id="verdict" hidden></div>
        </div>
        <div class="bd">
          <details open>
            <summary id="fhead">FONDO  sin capas</summary>
            <div class="rows"><div class="fl" id="frows"></div></div>
          </details>
          <details>
            <summary>VENTANA</summary>
            <div class="rows"><div class="kv" id="win"></div></div>
          </details>
          <details>
            <summary id="anomhead">ANOMALÍAS</summary>
            <div class="rows" id="anoms"></div>
          </details>
          <details>
            <summary id="ablhead">CAPAS  todas</summary>
            <div class="rows abl" id="ablrows"></div>
          </details>
        </div>
        <div class="ft">
          <button class="pri" id="go" type="button">Empezar</button>
          <button class="sec" id="phases" type="button" title="Mide todas las capas seguidas">Fases</button>
          <button class="sec" id="panel" type="button">Fondo: ON</button>
        </div>
      </section>`;
    ui.bub = root.getElementById("bub");
    ui.panelBox = root.getElementById("pnl");
    ui.close = root.getElementById("close");
    ui.live = root.getElementById("live");
    ui.hint = root.getElementById("hint");
    ui.verdict = root.getElementById("verdict");
    ui.go = root.getElementById("go");
    ui.panel = root.getElementById("panel");
    ui.phases = root.getElementById("phases");
    ui.fieldHead = root.getElementById("fhead");
    ui.fieldRows = root.getElementById("frows");
    ui.win = root.getElementById("win");
    ui.anomHead = root.getElementById("anomhead");
    ui.anoms = root.getElementById("anoms");
    ui.ablHead = root.getElementById("ablhead");
    ui.ablRows = root.getElementById("ablrows");
    ui.fieldSignature = "";
    /* One button per layer, plus `todas`. Built once, and the click is the ablation:
       on a phone there is no console to call `__perfAblate` from. */
    ui.ablButtons = new Map();
    for (const [value, label] of [
      ["", "todas"],
      ["marquee", "marquee"],
      ["field", "fondo"],
      ["flares", "destellos"],
      ["reveal", "reveal"],
      ["blur", "filtros"],
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => setAblate(value));
      ui.ablRows.appendChild(button);
      ui.ablButtons.set(value, button);
    }
    paintAblate();
    /* The numbers of the window, in one fixed order, built once: the passes then
       write a value into a span that already exists. */
    ui.kv = {};
    for (const [key, label] of [
      ["frames", "frames"],
      ["p95", "p95"],
      ["over", "sobre presupuesto"],
      ["tasks", "long tasks"],
      ["lcp", "LCP"],
      ["cls", "CLS"],
      ["cost", "medidor"],
    ]) {
      const name = document.createElement("i");
      name.textContent = label;
      const value = document.createElement("b");
      value.textContent = "—";
      ui.win.append(name, value);
      ui.kv[key] = { value, text: "—" };
    }
  } catch {
    /* no shadow DOM means no badge; the API below still measures */
  }

  const mount = () => {
    try {
      if (!document.body || document.body.contains(host)) return;
      document.body.appendChild(host);
    } catch {
      /* the page may be mid-navigation */
    }
  };
  mount();
  try {
    new MutationObserver(mount).observe(document.documentElement, { childList: true, subtree: true });
  } catch {
    /* the badge is mounted once; a page that drops it loses the button */
  }

  /** The current layer choice, on the buttons and on the section header. */
  const paintAblate = () => {
    for (const [value, button] of ui.ablButtons || []) {
      button.classList.toggle("on", value === ablate);
    }
    if (ui.ablHead) {
      const header = ablate ? `CAPAS  falta ${ablate}` : "CAPAS  todas";
      if (ui.ablHead.textContent !== header) ui.ablHead.textContent = header;
    }
  };

  /** One value of the window panel, written only when it changed. */
  const setKv = (key, text) => {
    const row = ui.kv && ui.kv[key];
    if (!row || row.text === text) return;
    row.text = text;
    row.value.textContent = text;
  };

  const paintWindow = () => {
    if (!open || !ui.win) return;
    try {
      const refreshMs = pct(S.frames.slice(0, 120), 0.5);
      const budget = refreshMs ? +(refreshMs * 1.5).toFixed(1) : null;
      const over = budget ? S.frames.filter((d) => d > budget).length : 0;
      const longest = S.longtasks.length ? Math.max(...S.longtasks) : 0;
      setKv("frames", refreshMs ? `${S.frames.length} · ~${Math.round(1000 / refreshMs)} Hz` : "—");
      setKv("p95", S.frames.length ? `${pct(S.frames, 0.95)} ms` : "—");
      setKv("over", budget ? `${over} / ${S.frames.length}` : "—");
      setKv("tasks", S.longtasks.length ? `${S.longtasks.length} · max ${Math.round(longest)} ms` : "0");
      setKv("lcp", S.lcp ? `${Math.round(S.lcp)} ms` : "—");
      setKv("cls", Number.isFinite(S.cls) ? S.cls.toFixed(4) : "—");
      const cost = meterBlock();
      setKv(
        "cost",
        cost.costMsPerSecond === null ? "—" : `${cost.costMsPerSecond} ms/s · ${cost.longestPassMs} max`,
      );
    } catch {
      /* a readout that fails is not worth a frame */
    }
  };

  /** The top four anomalies, rebuilt only when the scan added one. */
  const paintAnomalies = () => {
    if (!open || !ui.anoms) return;
    try {
      const total = S.anomalies.length;
      const last = total ? S.anomalies[total - 1].at : 0;
      const signature = `${total}:${last}`;
      if (ui.anomHead) {
        const header = total ? `ANOMALÍAS  ${total}` : "ANOMALÍAS  ninguna ✓";
        if (ui.anomHead.textContent !== header) ui.anomHead.textContent = header;
      }
      if (signature === anomaliesSignature) return;
      anomaliesSignature = signature;
      ui.anoms.textContent = "";
      const shown = S.anomalies.slice(-4).reverse();
      for (const item of shown) {
        const row = document.createElement("div");
        row.className = "an";
        const kind = document.createElement("span");
        kind.className = "k";
        kind.textContent = item.kind;
        const where = document.createElement("span");
        where.className = "w";
        where.textContent = `${item.selector}${item.label ? ` · ${item.label}` : ""}`;
        const detail = document.createElement("span");
        detail.className = "w";
        detail.textContent = item.detail || "";
        row.append(kind, where, detail);
        ui.anoms.appendChild(row);
      }
    } catch {
      /* same rule as the rest of the panel */
    }
  };

  /**
   * The state of the meter, in both places it shows: the bubble carries it when
   * the panel is closed, the panel repeats it when it is open. Nothing is written
   * into the closed panel.
   */
  const paint = (verdict) => {
    if (verdict !== undefined) verdictText = verdict || "";
    try {
      if (!ui.bub) return;
      ui.bub.classList.toggle("rec", S.state === "recording");
      ui.bub.classList.toggle("done", S.state === "done");
      if (S.state === "idle" && ui.bub.textContent !== BUBBLE_IDLE) ui.bub.textContent = BUBBLE_IDLE;
      if (S.state === "done" && ui.bub.textContent !== "✓") ui.bub.textContent = "✓";
      /* The field-pass toggle is offered in idle and done only: flipping it inside
         an open window would make the artifact describe two different meters. */
      if (ui.panel) {
        ui.panel.hidden = S.state === "recording";
        const label = `Fondo: ${panelOn ? "ON" : "OFF"}`;
        if (ui.panel.textContent !== label) ui.panel.textContent = label;
      }
      if (!open) return;
      const live = S.state === "recording" ? `${S.frames.length} frames · ${S.longtasks.length} long tasks` : S.state === "done" ? "" : "sin medir";
      if (ui.live && ui.live.textContent !== live) ui.live.textContent = live;
      if (ui.hint) ui.hint.hidden = S.state !== "idle";
      if (ui.verdict) {
        ui.verdict.hidden = !verdictText;
        if (ui.verdict.textContent !== verdictText) ui.verdict.textContent = verdictText;
      }
      if (ui.go) {
        const label = S.state === "recording" ? "Terminar y enviar" : S.state === "done" ? "Medir otra vez" : "Empezar";
        if (ui.go.textContent !== label) ui.go.textContent = label;
      }
    } catch {
      /* the badge is cosmetic; never let it break the measurement */
    }
  };

  /** Bubble label and the window numbers; runs on a timer, so it writes little. */
  const paintLive = () => {
    M.repaints += 1;
    meterPass(() => {
      try {
        if (ui.bub && S.state === "recording") {
          const refreshMs = pct(S.frames.slice(0, 120), 0.5);
          const label = refreshMs ? `${Math.round(1000 / refreshMs)}Hz` : "···";
          if (ui.bub.textContent !== label) ui.bub.textContent = label;
        }
        paintWindow();
      } catch {
        /* a text write that fails is not worth a frame */
      }
    });
  };

  /**
   * The field-pass toggle. It is refused while a window is open: the report carries
   * one `window.panelOn` for one window, and a mid-window flip would make the
   * artifact describe two different meters.
   */
  const setPanel = (on) => {
    if (S.state === "recording" || panelOn === on) return panelOn;
    panelOn = on;
    /* The layers are resolved on the pass that samples them, so a panel turned back
       on asks for a fresh resolve instead of trusting a stale watchlist. */
    if (panelOn) S.field.resolvedAt = -1000;
    paint();
    paintField();
    return panelOn;
  };

  /**
   * Open or close the panel. Opening is the only moment the readout is built:
   * while it was closed the meter wrote nothing but the bubble's label, so the
   * rows, the numbers, the anomalies and the sparklines are painted here and then
   * kept current by the passes that were already running.
   */
  const setOpen = (next) => {
    open = next;
    try {
      if (ui.panelBox) ui.panelBox.hidden = !open;
      if (ui.bub) ui.bub.setAttribute("aria-expanded", open ? "true" : "false");
      if (!open) return;
      S.field.resolvedAt = -1000;
      paint(verdictText);
      paintWindow();
      paintAnomalies();
      paintField();
    } catch {
      /* a panel that refuses to open is still a meter that measures */
    }
  };

  try {
    if (ui.bub) ui.bub.addEventListener("click", () => setOpen(!open));
    if (ui.close) ui.close.addEventListener("click", () => setOpen(false));
  } catch {
    /* the shadow root is closed; without listeners the API below is the way in */
  }
  setInterval(paintLive, 250);

  /* ---------------------------------------------------------------- lifecycle */

  const resetWindow = () => {
    windowId += 1;
    /* The meter's own bill is per window: what the probe cost while it measured. */
    M.fieldPasses = 0;
    M.samples = 0;
    M.sparkDraws = 0;
    M.repaints = 0;
    M.costMs = 0;
    M.longestPassMs = 0;
    M.depth = 0;
    mutations = 0;
    classChanges = 0;
    S.frames.length = 0;
    S.longtasks.length = 0;
    S.longTaskOwners.clear();
    S.cls = 0;
    S.samples = 0;
    S.durationMs = 0;
    S.nodes.length = 0;
    S.flags.length = 0;
    S.index = new WeakMap();
    S.series = new Map();
    S.classHits = new Map();
    S.classSeen = new Map();
    S.anomalies.length = 0;
    S.taps.length = 0;
  };

  const start = () => {
    if (S.state === "recording") return S.state;
    resetWindow();
    /* The watchlist scan is the most expensive thing here and it happens before the
       window opens, so its cost is never charged to the frames it reports. */
    buildWatchlist();
    S.state = "recording";
    S.startedAtIso = new Date().toISOString();
    S.startedAtMs = performance.now();
    lastFrame = 0;
    if (sampleTimer) clearInterval(sampleTimer);
    sampleTimer = setInterval(sample, SAMPLE_MS);
    sample();
    paint();
    paintLive();
    return S.state;
  };

  const postReport = async (payload) => {
    try {
      /* Two ways in. The phone proxy that injects this file receives the report at
         `/__perf/report`; inside `next dev` there is no proxy, so the overlay that
         mounts the meter points `__perfReportEndpoint` at the dev-only API route
         (`/api/perf-report`). The proxy path stays the default, so an injected
         meter behaves exactly as it did before. */
      const endpoint = window.__perfReportEndpoint || "/__perf/report";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const stop = async (options) => {
    const post = !options || options.post !== false;
    if (S.state !== "recording") return null;
    S.state = "done";
    if (sampleTimer) {
      clearInterval(sampleTimer);
      sampleTimer = 0;
    }
    S.durationMs = Math.round(performance.now() - S.startedAtMs);
    analyse();
    let payload = null;
    try {
      payload = buildReport();
    } catch {
      payload = null;
    }
    /* The sparklines were deferred for the whole window; this is their paint, and
       the meter block above was already built, so it is not charged to the window. */
    paintField();
    const frames = payload && payload.frames ? payload.frames : { n: 0, p95: null, overBudget: 0 };
    const verdict = `${frames.n} frames · p95 ${frames.p95} ms · ${frames.overBudget} frames fuera de presupuesto`;
    paint(verdict);
    if (!payload) {
      if (ui.verdict) ui.verdict.textContent = `${verdict} · no se pudo armar el reporte`;
      return null;
    }
    if (!post) return payload;
    const ok = await postReport(payload);
    if (!ok && ui.verdict) ui.verdict.textContent = `${verdict} · no se pudo enviar, medí otra vez`;
    return payload;
  };

  /* ------------------------------------------------------------------ phases */

  /**
   * One automatic pass over every layer.
   *
   * The ablation switches exist so nobody has to guess which layer costs the frames,
   * but tapping five buttons and repeating the same scroll five times is a
   * measurement nobody finishes. So the meter does the tapping: it opens one window
   * per layer, switches that layer off between windows, and posts a single artifact
   * that holds every phase side by side. The finger keeps doing the one part a
   * machine cannot fake — scrolling the real page on the real phone.
   *
   * Every phase is the same length, so one phase's `frames` block is comparable with
   * the next, and each row records its own `ablate`, so no row can be read as if it
   * were the baseline.
   */
  /* Long enough for one full pass down the page and back, because a phase that only
     sees the footer measures the footer: 7 s could be spent entirely in a section
     with no field and no flares, and the table would blame the layer that was off. */
  const PHASE_MS = 11000;
  /**
   * Interleaved, not a sweep.
   *
   * The first two real runs disagreed with themselves: the baseline came back at 117 ms
   * in one and 33.5 ms in the next, and `blur` at 192.6 against 33.5 — the phone's own
   * state (thermal, background apps) moves further than any layer does. A sweep measures
   * that drift and files it under whichever layer happened to be off.
   *
   * So each layer is measured between two baselines: `baseline, flares, baseline, flares,
   * baseline, flares`. The comparison that counts is a pair — the same device state, the
   * same scroll, one layer apart — and the drift shows up as the spread between pairs
   * instead of hiding inside a row.
   */
  const PHASES = ["", "flares", "", "flares", "", "flares"];
  let phaseRun = null;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /** Progress on the bubble: `3/6`, or `PERF` again when the run is over. */
  const paintPhase = (index, total) => {
    try {
      if (!ui.bub) return;
      if (!total) {
        paint(verdictText);
        if (ui.phases) ui.phases.disabled = false;
        return;
      }
      const label = `${index}/${total}`;
      if (ui.bub.textContent !== label) ui.bub.textContent = label;
      if (ui.phases) ui.phases.disabled = true;
      if (ui.hint) {
        ui.hint.hidden = false;
        const hint = `Recorrido completo: de arriba abajo y de vuelta (${index}/${total})`;
        if (ui.hint.textContent !== hint) ui.hint.textContent = hint;
      }
    } catch {
      /* the run must survive a stubborn badge */
    }
  };

  /** `collected` belongs to one run: no window can inherit somebody else's rows. */
  const postPhases = async (collected) => {
    let base = null;
    try {
      base = buildReport();
    } catch {
      base = null;
    }
    if (!base) return null;
    const ordered = [...collected].sort((a, b) => (b.frames.p95 || 0) - (a.frames.p95 || 0));
    const worst = ordered[0];
    const best = ordered[ordered.length - 1];
    const payload = { ...base, phases: collected };
    const ok = await postReport(payload);
    const label = `fases · mejor ${(best && (best.ablate || "todas")) || "?"} · peor ${(worst && (worst.ablate || "todas")) || "?"}`;
    paint(ok ? label : `${label} · no se pudo enviar`);
    return ok ? payload : null;
  };

  const runPhases = async () => {
    if (phaseRun) return null;
    phaseRun = true;
    /* The rows live here and nowhere else: `start()` resets the window between
       phases, and a shared array would both lose them and leak them into the next
       ordinary measurement. */
    const collected = [];
    try {
      for (let i = 0; i < PHASES.length; i += 1) {
        setAblate(PHASES[i]);
        paintPhase(i + 1, PHASES.length);
        /* The layer settles before the window opens, so its absence is never charged
           to the frames of the phase that follows it. */
        await sleep(700);
        start();
        await sleep(PHASE_MS);
        const report = await stop({ post: false });
        if (report) {
          collected.push({
            ablate: PHASES[i] || null,
            frames: report.frames,
            longtasks: report.longtasks,
            meter: report.meter,
          });
        }
      }
      setAblate("");
      return await postPhases(collected);
    } finally {
      phaseRun = null;
      S.state = "done";
      paintPhase(0, 0);
    }
  };

  try {
    if (ui.go) {
      ui.go.addEventListener("click", () => {
        if (S.state === "recording") stop();
        else start();
      });
    }
    if (ui.phases) ui.phases.addEventListener("click", () => runPhases());
    if (ui.panel) ui.panel.addEventListener("click", () => setPanel(!panelOn));
    /* The shadow root is closed, so automation reaches the meter through this API
       instead of through the button. */
    Object.defineProperty(window, "__perfMeterState", {
      get: () => S.state,
      configurable: true,
    });
    window.__perfMeterStart = () => start();
    window.__perfMeterStop = () => stop();
    /* The panel toggle lives in the closed shadow root too, so automation flips it
       and reads the meter's live counters through these instead of the DOM. */
    window.__perfMeterPanel = (on) => (typeof on === "boolean" ? setPanel(on) : panelOn);
    /* Layer ablation from the device that stutters: `__perfAblate("marquee")`,
       `__perfAblate("field")`, `("flares")`, `("reveal")`, `("blur")`, or
       `__perfAblate(null)` to put everything back. */
    window.__perfAblate = (name) => setAblate(name);
    /* The whole automatic run, for automation and for a phone without a console. */
    window.__perfPhases = () => runPhases();
    window.__perfMeterCost = () => meterBlock();
    /* The field panel lives in the closed shadow root, so this is how automation
       reads the same verdict the person on the phone is looking at — including
       whether each sparkline actually painted. */
    window.__perfMeterField = () => {
      const sparks = [];
      for (const layer of S.field.layers) {
        const canvas = layer.row && layer.row.canvas;
        if (!canvas) continue;
        let blank = null;
        try {
          const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
          blank = true;
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 0) {
              blank = false;
              break;
            }
          }
        } catch {
          blank = null;
        }
        sparks.push({ name: layer.name, width: canvas.width, height: canvas.height, blank });
      }
      return {
        header: ui.fieldHead ? ui.fieldHead.textContent : null,
        report: fieldReport(),
        sparks,
      };
    };
  } catch {
    /* if the page froze its own window object the button is all that is left */
  }

  paint();
})();
