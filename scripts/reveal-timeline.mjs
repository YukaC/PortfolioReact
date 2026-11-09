#!/usr/bin/env node
/**
 * ¿El reveal sigue siendo deficiente? — la sonda que contesta con números.
 *
 * `docs/audit.md` P1-3 ("el reveal esconde contenido ya pintado después de hidratar")
 * y P0-1 ("sin JS los títulos son invisibles") se arreglaron con un
 * IntersectionObserver de página y un default invertido en CSS (S1, L3/L4). Lo
 * que nunca se midió es **cuándo** cada sección recibe `.is-in`: si una sección
 * aparece recién después de hidratar y con un salto, el arreglo es de forma y no
 * de comportamiento.
 *
 * Esta sonda abre `/` en la GPU real y responde tres cosas:
 *
 *   1. frame pacing de los primeros N ms (default 3000) — cuántos frames pasan
 *      de 32 ms, que es el umbral donde el ojo ve el tirón;
 *   2. frame pacing de un scroll de página completa con input real (wheel), por
 *      si el coste aparece con el campo en movimiento;
 *   3. la línea de tiempo del reveal: por cada `[data-r]`, el `performance.now()`
 *      en que gana `.is-in`, agrupado por la sección que lo contiene, más las
 *      secciones que **nunca** lo ganaron.
 *
 * No afirma un presupuesto (los de §21.3 viven en `measure:scroll` /
 * `measure:idle`): imprime la evidencia para decidir si el reveal cumple.
 *
 *   node scripts/reveal-timeline.mjs                     # :4173, 3 s de carga
 *   node scripts/reveal-timeline.mjs --url http://…:4210 # el server que ya corre
 *   node scripts/reveal-timeline.mjs --duration 5000 --out /tmp/reveal.json
 *   node scripts/reveal-timeline.mjs --swiftshader       # el potato, para contrastar
 *
 * Salidas: 0 siempre que haya medido · 2 uso inválido · 3 no hay server.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

import {
  ensureServer,
  isSoftwareRenderer,
  launchChromium,
  rendererOf,
} from "./visual-baseline.mjs";

const VIEWPORT = { width: 1440, height: 900 };
/** 32 ms = 2 frames at 60 Hz: the point where the eye reads a stall. */
const SLOW_FRAME_MS = 32;

const fail = (code, message) => {
  console.error(`reveal-timeline — ${message}`);
  process.exit(code);
};

const parseArgs = (argv) => {
  const args = { url: "", port: 4173, duration: 3000, software: false, headed: false, out: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--url") args.url = argv[(i += 1)] ?? "";
    else if (arg === "--port") args.port = Number(argv[(i += 1)] ?? 4173);
    else if (arg === "--duration") args.duration = Number(argv[(i += 1)] ?? 3000);
    else if (arg === "--out") args.out = argv[(i += 1)] ?? "";
    else if (arg === "--swiftshader" || arg === "--software-gl") args.software = true;
    else if (arg === "--headed") args.headed = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "uso: reveal-timeline [--url <url>] [--port <n>] [--duration <ms>] [--out <file>] [--swiftshader] [--headed]",
      );
      process.exit(0);
    } else if (arg.startsWith("-")) fail(2, `argumento desconocido: ${arg}`);
  }
  if (!Number.isFinite(args.duration) || args.duration <= 0) fail(2, `--duration inválido: ${args.duration}`);
  return args;
};

/* ------------------------------------------------------- in-page instrumentation */

/**
 * Instalado antes de cualquier script de la página: un rAF que guarda cada
 * delta y un MutationObserver sobre el árbol que registra, con
 * `performance.now()`, el instante en que un `[data-r]` gana la clase `is-in`.
 * La sección de cada marca es la que la contiene: es lo que se puede leer del
 * DOM sin conocer el componente.
 */
const INSTRUMENT = () => {
  window.__reveal = { frames: [], marks: [], startedAt: performance.now() };

  let last = performance.now();
  const tick = (now) => {
    window.__reveal.frames.push(now - last);
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const label = (element) => {
    const section = element.closest("section[id], header[id], footer[id], [id]");
    return section?.id || element.tagName.toLowerCase();
  };

  const seen = new WeakSet();
  const note = (element) => {
    if (!element || element.nodeType !== 1) return;
    if (!element.matches?.("[data-r].is-in")) return;
    if (seen.has(element)) return;
    seen.add(element);
    window.__reveal.marks.push({
      t: performance.now(),
      section: label(element),
      tag: element.tagName.toLowerCase(),
      cls: String(element.className || "").slice(0, 60),
      text: String(element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 48),
    });
  };

  const scan = (root) => {
    if (root.nodeType === 1) note(root);
    root.querySelectorAll?.("[data-r].is-in").forEach(note);
  };

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes") note(record.target);
      else record.addedNodes.forEach(scan);
    }
  });
  observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
  document.addEventListener("DOMContentLoaded", () => scan(document));
};

/**
 * Cuenta los `[data-r]` que el observer tiene y nunca ganaron `.is-in`.
 *
 * `data-r="paint"` queda afuera a propósito, igual que en
 * `useRevealOnEnter` (`REVEAL_SELECTOR`): esos nodos llevan su propia entrada
 * por keyframe y el script no les agrega la clase, así que contarlos como
 * "sin revelar" sería un falso positivo — es lo que el hero hacía en la
 * primera corrida de esta sonda.
 */
const MISSING = () => {
  const owned = [...document.querySelectorAll('[data-r]:not([data-r="paint"])')];
  const paint = [...document.querySelectorAll('[data-r="paint"]')];
  const revealed = owned.filter((element) => element.classList.contains("is-in"));
  const section = (element) => {
    const owner = element.closest("section[id], header[id], footer[id], [id]");
    return owner?.id || element.tagName.toLowerCase();
  };
  const revealedSections = new Set(revealed.map(section));
  return {
    total: owned.length,
    revealed: revealed.length,
    paint: paint.length,
    sections: [...new Set(owned.map(section))],
    neverRevealed: [...new Set(owned.map(section))].filter((id) => !revealedSections.has(id)),
  };
};

const percentile = (values, share) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(share * sorted.length) - 1))];
};

const summarizeFrames = (frames) => {
  const clean = frames.filter((value) => value > 0);
  const slow = clean.filter((value) => value > SLOW_FRAME_MS);
  return {
    frames: clean.length,
    avg: Number((clean.reduce((total, value) => total + value, 0) / Math.max(1, clean.length)).toFixed(1)),
    p95: Number(percentile(clean, 0.95).toFixed(1)),
    max: Number(Math.max(0, ...clean).toFixed(1)),
    over32: slow.length,
    over32Percent: Number(((slow.length / Math.max(1, clean.length)) * 100).toFixed(1)),
  };
};

/* ------------------------------------------------------------------- the gestures */

/** Scroll real (wheel) hasta el final, para que Lenis y el scrub participen. */
async function scrollThrough(page) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  await page.evaluate(() => {
    window.__reveal.frames.length = 0;
    window.__reveal.scrollStart = performance.now();
  });

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

  return page.evaluate(() => ({
    frames: window.__reveal.frames,
    distance: Math.round(document.documentElement.scrollHeight - window.innerHeight),
    reached: Math.round(window.scrollY),
    elapsed: Math.round(performance.now() - window.__reveal.scrollStart),
    marks: window.__reveal.marks,
  }));
}

/** Una marca por sección: el primer `.is-in` y el último, en ms desde la navegación. */
const timelineOf = (marks) => {
  const bySection = new Map();
  for (const mark of marks) {
    const entry = bySection.get(mark.section) ?? {
      section: mark.section,
      first: mark.t,
      last: mark.t,
      count: 0,
      sample: mark.text,
    };
    entry.first = Math.min(entry.first, mark.t);
    entry.last = Math.max(entry.last, mark.t);
    entry.count += 1;
    bySection.set(mark.section, entry);
  }
  return [...bySection.values()].sort((a, b) => a.first - b.first);
};

const printTimeline = (title, timeline) => {
  console.log(`\n${title}`);
  for (const entry of timeline) {
    console.log(
      `  ${entry.section.padEnd(14)} first ${String(Math.round(entry.first)).padStart(6)} ms · last ${String(
        Math.round(entry.last),
      ).padStart(6)} ms · ${String(entry.count).padStart(3)} [data-r] · "${entry.sample}"`,
    );
  }
};

const printFrames = (title, summary) => {
  console.log(
    `\n${title}: ${summary.frames} frames · avg ${summary.avg} ms · p95 ${summary.p95} ms · max ${summary.max} ms · >${SLOW_FRAME_MS} ms: ${summary.over32} (${summary.over32Percent} %)`,
  );
};

/* --------------------------------------------------------------------------- main */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const server = await ensureServer(args);
  const report = { url: `${server.url}/`, viewport: VIEWPORT, duration: args.duration, renderer: "" };

  const browser = await launchChromium({ software: args.software, headed: args.headed });
  try {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, locale: "en-US" });
    const page = await context.newPage();
    page.on("pageerror", (error) => console.log(`  [pageerror] ${String(error).slice(0, 200)}`));
    await page.addInitScript(INSTRUMENT);

    report.renderer = await rendererOf(page);
    console.log(`[reveal-timeline] renderer: ${report.renderer}`);
    if (isSoftwareRenderer(report.renderer)) {
      console.log("[reveal-timeline] software renderer: los frames de acá no son los de la GPU real");
    }

    /* --- fase 1: carga --- */
    await page.goto(server.url, { waitUntil: "load", timeout: 60_000 });
    await page.waitForTimeout(args.duration);

    const load = await page.evaluate(() => ({
      frames: window.__reveal.frames,
      marks: window.__reveal.marks,
    }));
    report.loadFrames = summarizeFrames(load.frames);
    report.loadTimeline = timelineOf(load.marks);
    report.loadMissing = await page.evaluate(MISSING);

    printFrames(`load · primeros ${args.duration} ms`, report.loadFrames);
    printTimeline("reveal en la carga (ms desde el inicio de la navegación):", report.loadTimeline);
    console.log(
      `\n  [data-r] del observer: ${report.loadMissing.revealed}/${report.loadMissing.total} con .is-in tras la carga · ${report.loadMissing.paint} nodos \`data-r="paint"\` (keyframe propio, el observer no los toca)`,
    );
    if (report.loadMissing.neverRevealed.length > 0) {
      console.log(`  sin revelar tras la carga (normal: están bajo el fold): ${report.loadMissing.neverRevealed.join(", ")}`);
    }

    /* --- fase 2: scroll de página completa --- */
    const scroll = await scrollThrough(page);
    report.scrollFrames = summarizeFrames(scroll.frames);
    report.scroll = {
      distance: scroll.distance,
      reached: scroll.reached,
      elapsedMs: scroll.elapsed,
      complete: scroll.distance > 0 && scroll.reached >= scroll.distance - 2,
    };
    report.scrollTimeline = timelineOf(scroll.marks);
    report.scrollMissing = await page.evaluate(MISSING);

    printFrames(
      `scroll · ${scroll.reached}/${scroll.distance} px en ${scroll.elapsed} ms${report.scroll.complete ? "" : " (incompleto)"}`,
      report.scrollFrames,
    );
    printTimeline(
      "reveal durante el scroll (ms desde el inicio de la navegación; primera marca por sección):",
      report.scrollTimeline,
    );
    console.log(
      `\n  [data-r] del observer ${report.scrollMissing.total} · con .is-in ${report.scrollMissing.revealed} · \`data-r="paint"\` ${report.scrollMissing.paint} · secciones sin revelar: ${
        report.scrollMissing.neverRevealed.join(", ") || "ninguna"
      }`,
    );

    await context.close();
  } finally {
    await browser.close();
    server.stop();
  }

  if (args.out) {
    writeFileSync(path.resolve(args.out), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`\n[reveal-timeline] wrote ${args.out}`);
  }
}

main().catch((error) => {
  console.error(`reveal-timeline — ${error?.stack || error}`);
  process.exitCode = 1;
});
