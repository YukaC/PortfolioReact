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

  const SAMPLE_MS = 100;
  /** The phone has to survive this scan, so the watchlist is bounded on purpose. */
  const NODE_CAP = 400;
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
  /** 90 samples at 20 Hz is the last four and a half seconds of scroll: long enough
      to see a drift, short enough that the verdict follows the finger. */
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
  /** The field pass runs on every third frame — ~20 Hz at 60 Hz. A drift still
      resolves over the 90-sample history, and one pass in three costs a third less
      than the 30 Hz it used to run at, which matters on the phone being measured. */
  const FIELD_FRAME_STRIDE = 3;

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
    for (const e of entries) S.longtasks.push(+e.duration.toFixed(1));
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
    /* Every third frame the field panel takes a sample — ~20 Hz at 60 Hz. That is
       still a forced layout read of nine nodes, and it is deliberate: a jump is a
       one-frame event, and a 100 ms sampler would miss exactly the thing being
       looked for. It is the meter's own cost, it is charged to the report's `meter`
       block, and the panel toggle switches it off entirely. */
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
    /* The panel is a readout, not a measurement: four passes (≈5 Hz) is enough to
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
          sy,
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
        if (css.willChange && css.willChange !== "auto") out.willChange += 1;
        const filter = css.filter && css.filter !== "none" ? css.filter : "";
        const backdrop = css.backdropFilter && css.backdropFilter !== "none" ? css.backdropFilter : "";
        if (!filter && !backdrop) continue;
        out.blurred += 1;
        /* The blurred region is the box grown by the radius: that is the area the
           compositor has to raster, and the field's blobs are the known suspect. */
        const radius = Math.max(blurRadius(filter), blurRadius(backdrop));
        const box = el.getBoundingClientRect();
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
      },
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
        /* A field block cannot be interpreted without it: `disabled` is not `pinned`. */
        panelOn,
      },
      surfaces: surfaceStats(),
      /* Always live, so it reports even when the window was never opened. */
      field: fieldReport(),
    };
  };

  /* ------------------------------------------------------------------ badge */

  let root = null;
  const ui = {};

  try {
    root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `
      <style>
        :host { all: initial; }
        .p {
          position: fixed; left: 10px; right: 10px; bottom: 10px; z-index: 2147483000;
          font: 12px/1.35 ui-monospace, monospace; color: #eef2ff;
          background: rgba(6,11,26,.94); border: 1px solid rgba(255,255,255,.18);
          border-radius: 12px; padding: 10px 12px; display: grid; gap: 8px;
          box-shadow: 0 12px 40px rgba(0,0,0,.55);
        }
        .r { display: flex; gap: 8px; align-items: center; justify-content: space-between; }
        b { font-size: 13px; letter-spacing: .06em; color: #8fcbff; }
        .s { color: #c2cde4; }
        button {
          font: inherit; padding: 8px 12px; border-radius: 9px; cursor: pointer;
          background: rgba(255,255,255,.1); color: #fff; border: 1px solid rgba(255,255,255,.22);
        }
        button.pri { background: #8fcbff; color: #07102a; border-color: #8fcbff; font-weight: 600; }
        /* The live field panel. It is a readout, so it sits under the badge's own
           rows and never replaces them. */
        .f { display: grid; gap: 4px; border-top: 1px solid rgba(255,255,255,.14); padding-top: 7px; }
        .fh { font-size: 11px; letter-spacing: .07em; color: #c2cde4; }
        .fl { display: grid; gap: 2px; max-height: 34vh; overflow: auto; }
        .fr { display: grid; grid-template-columns: 52px 1fr auto; gap: 6px; align-items: center; }
        .fr canvas { width: 96px; height: 22px; display: block; }
        .fn { font-size: 10.5px; color: #8fcbff; }
        .fv { font-size: 10.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fv.ok { color: #4ade80; }
        .fv.bad { color: #e2727f; }
      </style>
      <div class="p">
        <div class="r" id="head"><b>PERF · this phone</b><span class="s" id="live"></span></div>
        <div class="r s" id="hint"></div>
        <div class="r s" id="verdict" hidden></div>
        <div class="f">
          <div class="fh" id="fhead">FONDO  sin capas</div>
          <div class="fl" id="frows"></div>
        </div>
        <div class="r">
          <button class="pri" id="go">Empezar</button>
          <button id="panel">Panel fondo: ON</button>
        </div>
      </div>`;
    ui.head = root.getElementById("head");
    ui.live = root.getElementById("live");
    ui.hint = root.getElementById("hint");
    ui.verdict = root.getElementById("verdict");
    ui.go = root.getElementById("go");
    ui.panel = root.getElementById("panel");
    ui.fieldHead = root.getElementById("fhead");
    ui.fieldRows = root.getElementById("frows");
    ui.fieldSignature = "";
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

  const paint = (verdict) => {
    try {
      if (!ui.go) return;
      /* The panel toggle is offered in idle and done only: flipping it inside an
         open window would make the artifact describe two different meters. */
      if (ui.panel) {
        ui.panel.hidden = S.state === "recording";
        const label = `Panel fondo: ${panelOn ? "ON" : "OFF"}`;
        if (ui.panel.textContent !== label) ui.panel.textContent = label;
      }
      if (S.state === "idle") {
        ui.head.hidden = false;
        ui.hint.hidden = false;
        ui.hint.textContent = "Tocá Empezar y después scrolleá el sitio.";
        ui.live.textContent = "sin medir";
        ui.verdict.hidden = true;
        ui.go.textContent = "Empezar";
      } else if (S.state === "recording") {
        ui.head.hidden = false;
        ui.hint.hidden = true;
        ui.verdict.hidden = true;
        ui.go.textContent = "Terminar y enviar";
      } else {
        /* Done shows the verdict and the way back to measuring, and nothing else. */
        ui.head.hidden = true;
        ui.hint.hidden = true;
        ui.verdict.hidden = false;
        ui.verdict.textContent = verdict || "";
        ui.go.textContent = "Medir otra vez";
      }
    } catch {
      /* the badge is cosmetic; never let it break the measurement */
    }
  };

  /**
   * The panel toggle. It is refused while a window is open: the report carries one
   * `window.panelOn` for one window, and a mid-window flip would make the artifact
   * describe two different meters.
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

  const paintLive = () => {
    if (S.state !== "recording" || !ui.live) return;
    M.repaints += 1;
    meterPass(() => {
      try {
        const refreshMs = pct(S.frames.slice(0, 120), 0.5);
        const hz = refreshMs ? Math.round(1000 / refreshMs) : null;
        ui.live.textContent = `${hz ? `~${hz} Hz · ` : ""}${S.frames.length} frames · ${S.longtasks.length} long tasks`;
      } catch {
        /* a text write that fails is not worth a frame */
      }
    });
  };
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

  const post = async (payload) => {
    try {
      const res = await fetch("/__perf/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const stop = async () => {
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
    const ok = await post(payload);
    if (!ok && ui.verdict) ui.verdict.textContent = `${verdict} · no se pudo enviar, medí otra vez`;
    return payload;
  };

  try {
    if (ui.go) {
      ui.go.addEventListener("click", () => {
        if (S.state === "recording") stop();
        else start();
      });
    }
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
