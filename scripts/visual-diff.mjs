#!/usr/bin/env node
/**
 * Diff perceptual contra el baseline de §14.5 — el gate que faltaba (L13, L15).
 *
 * Vuelve a capturar las mismas 45 tomas con el mismo contexto determinista que
 * `visual-baseline.mjs` (mismo DPR, mismo locale, movimiento reducido, toda
 * animación en su estado final) y compara cada una contra
 * `visual/baseline/<viewport>/<scroll>/<lang>.png`. **Umbral 0.1 %** (§14.5 paso
 * 2): un píxel cuenta como distinto cuando su delta YIQ supera el de
 * `pixelmatch` con `threshold 0.1`, que pesa el canal verde y el azul según la
 * sensibilidad del ojo; el porcentaje es "cuántos píxeles de la toma se ven
 * distintos", no "cuánto bajó el hash".
 *
 * La decodificación y la comparación ocurren **dentro de Chromium** (bitmap →
 * ImageData → YIQ): la suite no agrega una dependencia de imagen al repo, y la
 * misma máquina que captura es la que mide. Cuando algo supera el umbral y
 * `--out` está puesto, se escribe también una tomas de diff (base con los
 * píxeles distintos en magenta) para que el revisor vea dónde.
 *
 *   pnpm visual:diff                              # comparar el build servido en :4173
 *   pnpm visual:diff --url http://…:4210          # contra un server que ya corre
 *   pnpm visual:diff --baseline /tmp/base-shots   # baseline de otro build (sin tocar el commiteado)
 *   pnpm visual:diff --update                     # aceptar la estética actual como nuevo baseline
 *
 * Salidas: 0 ≤ 0.1 % en las 45 tomas · 1 alguna superó el umbral o faltó ·
 *          2 uso inválido · 3 no hay server.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BASE_DIR,
  SHOTS,
  captureSet,
  ensureServer,
  launchChromium,
  shotPath,
  writeBaseline,
} from "./visual-baseline.mjs";

const THRESHOLD = 0.1;

const fail = (code, message) => {
  console.error(`visual:diff — ${message}`);
  process.exit(code);
};

const parseArgs = (argv) => {
  const args = {
    url: "",
    port: 4173,
    baseline: BASE_DIR,
    threshold: THRESHOLD,
    update: false,
    software: false,
    headed: false,
    out: "",
    only: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--url") args.url = argv[(i += 1)] ?? "";
    else if (arg === "--port") args.port = Number(argv[(i += 1)] ?? 4173);
    else if (arg === "--baseline") args.baseline = path.resolve(argv[(i += 1)] ?? BASE_DIR);
    else if (arg === "--threshold") args.threshold = Number(argv[(i += 1)] ?? THRESHOLD);
    else if (arg === "--out") args.out = path.resolve(argv[(i += 1)] ?? "");
    else if (arg === "--only") args.only = (argv[(i += 1)] ?? "").split(",").map((id) => id.trim());
    else if (arg === "--update") args.update = true;
    else if (arg === "--swiftshader" || arg === "--software-gl") args.software = true;
    else if (arg === "--headed") args.headed = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "uso: visual:diff [--url <url>] [--port <n>] [--baseline <dir>] [--threshold <%>] [--only <id,…>] [--out <dir>] [--update] [--swiftshader] [--headed]",
      );
      process.exit(0);
    } else if (arg.startsWith("-")) fail(2, `argumento desconocido: ${arg}`);
  }
  return args;
};

/* ------------------------------------------------------------------ the comparison */

/**
 * Compara dos PNG en la página. Devuelve `{ total, different, percent }`; con
 * `withDiff` agrega un dataURL con la toma base y los píxeles distintos en
 * magenta, que es lo único que hace legible un 0.4 %.
 */
const COMPARE = async ({ a, b, threshold, withDiff }) => {
  const decode = async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    return createImageBitmap(new Blob([bytes], { type: "image/png" }));
  };

  const [left, right] = await Promise.all([decode(a), decode(b)]);
  if (left.width !== right.width || left.height !== right.height) {
    return {
      total: left.width * left.height,
      different: left.width * left.height,
      percent: 100,
      mismatch: `size ${left.width}×${left.height} vs ${right.width}×${right.height}`,
    };
  }

  const paint = (bitmap) => {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    return { canvas, ctx, data: ctx.getImageData(0, 0, bitmap.width, bitmap.height) };
  };
  const base = paint(left);
  const other = paint(right);

  /* pixelmatch's YIQ delta: the eye's weighting, not a per-channel count. */
  const maxDelta = 35215 * threshold * threshold;
  const delta = (pixel, index) => {
    const r1 = base.data.data[index];
    const g1 = base.data.data[index + 1];
    const b1 = base.data.data[index + 2];
    const r2 = other.data.data[index];
    const g2 = other.data.data[index + 1];
    const b2 = other.data.data[index + 2];
    const y1 = 0.29889531 * r1 + 0.58662247 * g1 + 0.11448223 * b1;
    const y2 = 0.29889531 * r2 + 0.58662247 * g2 + 0.11448223 * b2;
    const i1 = 0.59597799 * r1 - 0.2741761 * g1 - 0.32180189 * b1;
    const i2 = 0.59597799 * r2 - 0.2741761 * g2 - 0.32180189 * b2;
    const q1 = 0.21147017 * r1 - 0.52261711 * g1 + 0.31114694 * b1;
    const q2 = 0.21147017 * r2 - 0.52261711 * g2 + 0.31114694 * b2;
    const dy = y1 - y2;
    const di = i1 - i2;
    const dq = q1 - q2;
    return 0.5053 * dy * dy + 0.299 * di * di + 0.1957 * dq * dq;
  };

  let different = 0;
  const diff = withDiff ? base.ctx.getImageData(0, 0, base.canvas.width, base.canvas.height) : null;
  for (let index = 0; index < base.data.data.length; index += 4) {
    if (Math.abs(delta(base.data.data, index)) > maxDelta) {
      different += 1;
      if (diff) {
        diff.data[index] = 255;
        diff.data[index + 1] = 0;
        diff.data[index + 2] = 255;
        diff.data[index + 3] = 255;
      }
    }
  }
  if (diff) base.ctx.putImageData(diff, 0, 0);

  const total = left.width * left.height;
  let diffPng = "";
  if (diff) {
    const blob = await base.canvas.convertToBlob({ type: "image/png" });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
    diffPng = btoa(binary);
  }
  return { total, different, percent: (different / total) * 100, diffPng };
};

/* ----------------------------------------------------------------------------- main */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!Number.isFinite(args.threshold) || args.threshold < 0) fail(2, `invalid --threshold: ${args.threshold}`);

  const shots = args.only
    ? SHOTS.filter((shot) => args.only.includes(`${shot.width}/${shot.scroll}/${shot.lang}`))
    : SHOTS;
  if (shots.length === 0) fail(2, `--only matched no shot: ${args.only.join(", ")}`);

  const server = await ensureServer({ url: args.url, port: args.port });

  try {
    let renderer = "";
    const captures = [];
    const { shots: captured } = await captureSet({
      url: server.url,
      software: args.software,
      headed: args.headed,
      shots,
      onRenderer: (value) => {
        renderer = value;
        console.log(`[visual:diff] renderer: ${value}`);
      },
      onShot: (shot) => captures.push(shot),
    });

    if (args.update) {
      const manifestPath = path.join(args.baseline, "manifest.json");
      const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;
      /* El renderer viene de `onRenderer` (la sonda del navegador), no del
         retorno de `captureSet`: `--update` escribía el manifiesto sin renderer
         porque ahí sólo se destructuraban las tomas. */
      const manifest = writeBaseline({
        dir: args.baseline,
        renderer,
        shots: captures,
        vitals: previous?.vitals ?? null,
      });
      console.log(
        `\n[visual:diff] baseline actualizado: ${manifest.shots.length} tomas en ${args.baseline} · renderer=${manifest.renderer} · commit ${manifest.commit.sha}`,
      );
      return;
    }

    const manifestPath = path.join(args.baseline, "manifest.json");
    if (!existsSync(manifestPath)) {
      fail(1, `no manifest at ${manifestPath} — run \`pnpm visual:baseline\` (or pass --update) first`);
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.renderer && manifest.renderer !== renderer) {
      console.log(
        `[visual:diff] OJO: el baseline se tomó con "${manifest.renderer}" y esta corrida usa "${renderer}"`,
      );
    }
    console.log(
      `[visual:diff] baseline de ${manifest.commit?.sha ?? "?"} · ${manifest.shots?.length ?? 0} tomas · umbral ${args.threshold} %\n`,
    );

    /* Una página en blanco para decodificar y comparar los dos PNG: la misma
       launch que captura, así la comparación no depende de otro Chromium. */
    const compareBrowser = await launchChromium();
    const comparePage = await compareBrowser.newPage();

    const rows = [];
    try {
      for (const shot of captures) {
        const id = `${shot.width}/${shot.scroll}/${shot.lang}`;
        const referenceFile = path.join(args.baseline, shotPath(shot));
        if (!existsSync(referenceFile)) {
          rows.push({ id, percent: Number.POSITIVE_INFINITY, different: 0, total: 0, missing: true });
          console.log(`  ${id.padEnd(24)} MISSING ${path.relative(process.cwd(), referenceFile)}`);
          continue;
        }
        const comparison = await comparePage.evaluate(COMPARE, {
          a: readFileSync(referenceFile).toString("base64"),
          b: shot.png.toString("base64"),
          threshold: 0.1,
          withDiff: Boolean(args.out),
        });
        /* Con `--out` se guarda la toma base + los píxeles distintos en magenta. */
        let diffFile = "";
        if (args.out && comparison.diffPng) {
          diffFile = path.join(args.out, shotPath(shot));
          mkdirSync(path.dirname(diffFile), { recursive: true });
          writeFileSync(diffFile, Buffer.from(comparison.diffPng, "base64"));
        }
        rows.push({ id, ...comparison, diffFile });
        console.log(
          `  ${id.padEnd(24)} ${comparison.percent.toFixed(4).padStart(9)} %  ${String(comparison.different).padStart(7)} px  ${
            comparison.percent > args.threshold ? "FAIL" : "ok"
          }${comparison.mismatch ? `  (${comparison.mismatch})` : ""}`,
        );
      }
    } finally {
      await comparePage.close();
      await compareBrowser.close();
    }

    const failed = rows.filter((row) => row.missing || row.percent > args.threshold);
    const worst = rows
      .filter((row) => !row.missing)
      .reduce((top, row) => (row.percent > (top?.percent ?? -1) ? row : top), null);
    console.log(
      `\n[visual:diff] ${rows.length - failed.length}/${rows.length} tomas ≤ ${args.threshold} % · peor: ${
        worst ? `${worst.id} ${worst.percent.toFixed(4)} %` : "—"
      }`,
    );
    if (failed.length > 0) {
      console.log(`[visual:diff] ${failed.length} toma(s) por encima del umbral o sin baseline`);
      process.exitCode = 1;
    }
  } finally {
    server.stop();
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    console.error(`visual:diff — ${error?.stack || error}`);
    process.exitCode = 1;
  });
}
