#!/usr/bin/env node
/**
 * Baseline visual del protocolo §14.5 — 5 anchos × 3 posiciones × 3 idiomas.
 *
 * `audit.md` §14.5 pide 45 capturas del build actual, y §21.2 convierte eso en un
 * gate: cada paso del plan compara contra ese baseline con diff perceptual y
 * umbral **0.1 %**. Hasta T12 ese gate corría pero no comparaba (L13, L15: "no
 * hay baseline visual commiteado"), así que este módulo es el que sí compara:
 * captura, guarda `visual/baseline/<viewport>/<scroll>/<lang>.png` y escribe el
 * manifiesto que dice con qué build y con qué renderer se tomaron las tomas.
 *
 * **Este módulo es además el único lugar donde se lanza Chromium.** Un diff de
 * píxeles sólo significa algo si el que captura el baseline y el que captura la
 * comparación usan el mismo navegador y la misma GPU, así que la elección del
 * renderer vive acá y `measure-idle.mjs`, `measure-scroll-perf.mjs`,
 * `visual-diff.mjs` y `reveal-timeline.mjs` la importan en vez de repetirla.
 *
 * Lo que el renderer decide (§8, §21.3): sin flags, Chromium cae en SwiftShader
 * aunque el host tenga GPU, y entonces "desktop" y "software GL" miden lo mismo.
 * El único juego de flags que llega a la GPU real es
 * `--use-gl=angle --use-angle=gl`, que acá reporta
 * `ANGLE (AMD, AMD Radeon RX 570 Series (radeonsi polaris10 ACO), OpenGL ES 3.2)`.
 * El default es hardware; `--swiftshader` es la salida explícita al rasterizador
 * de CPU, para comparar contra el potato de §8.
 *
 * Las tomas son de **geometría y color**, no de movimiento: se capturan con
 * `prefers-reduced-motion: reduce` (el campo no monta el canvas y el reveal
 * está asentado) y con un stylesheet que fija toda animación en su estado final.
 * Así dos corridas del mismo build dan lo mismo, y un cambio de píxel es un
 * cambio de diseño y no la fase de un destello.
 *
 *   pnpm visual:baseline                      # capturar sobre :4173 (o arrancarlo)
 *   pnpm visual:baseline --url http://…:4210  # capturar el server que ya corre
 *   pnpm visual:baseline --out /tmp/shots     # otra carpeta (no commitea nada)
 *   pnpm visual:baseline --swiftshader        # el potato, como baseline aparte
 *   pnpm visual:baseline --vitals vitals.json # embeber measure:vitals en el manifiesto
 *
 * Salidas: 0 todo capturado · 2 uso inválido · 3 no hay server.
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PORT = 4173;
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

/* ------------------------------------------------------------------ the matrix */

/**
 * §14.5: 5 anchos × 3 posiciones de scroll × 3 idiomas = 45 capturas.
 *
 * La altura no la fija el protocolo, así que se usa la del dispositivo que cada
 * ancho representa; lo que importa para el diff es que baseline y comparación
 * usen exactamente la misma. `scroll` se resuelve en la página: `top` es 0,
 * `hero-out` un viewport exacto (el hero queda fuera de cuadro), `footer` el
 * final del documento.
 */
export const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 900, height: 1000 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

export const SCROLLS = ["top", "hero-out", "footer"];

export const LANGS = [
  { slug: "en", path: "/" },
  { slug: "es", path: "/es" },
  { slug: "pt", path: "/pt" },
];

/** Las 45 tomas, en el orden en que se capturan. */
export const SHOTS = VIEWPORTS.flatMap(({ width, height }) =>
  SCROLLS.flatMap((scroll) =>
    LANGS.map((lang) => ({ width, height, scroll, lang: lang.slug, url: lang.path })),
  ),
);

export const BASE_DIR = path.join(ROOT, "visual", "baseline");
export const MANIFEST_PATH = path.join(BASE_DIR, "manifest.json");

/* --------------------------------------------------------------- the one launch */

/**
 * El único juego de flags que llega a la GPU del host. Con `--use-gl=swiftshader`
 * o sin flags, Chromium responde `Angle (Google, Vulkan (SwiftShader Device…))`
 * y el perfil "desktop" mide un rasterizador de CPU.
 */
export const HARDWARE_ARGS = ["--use-gl=angle", "--use-angle=gl"];

/** El potato de §8: el perfil que obliga a que los tiers existan (§18.6). */
export const SWIFTSHADER_ARGS = [
  "--use-gl=angle",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
];

/** Argumentos de Chromium para el renderer pedido. */
export const launchArgs = ({ software = false } = {}) =>
  software ? [...SWIFTSHADER_ARGS] : [...HARDWARE_ARGS];

/**
 * Lanza Chromium con el renderer pedido y devuelve el navegador. `headed` se
 * pasa tal cual: Playwright ignora la GPU en el shell headless de algunas
 * plataformas, y verlo con los ojos del dueño es parte del pedido.
 */
export const launchChromium = (options = {}) =>
  chromium.launch({
    headless: !options.headed,
    args: launchArgs(options),
    /* Permite apuntar a un Chrome del sistema sin cambiar los flags. */
    ...(process.env.BROWSER_VERIFY_CHROMIUM ? { executablePath: process.env.BROWSER_VERIFY_CHROMIUM } : {}),
  });

/**
 * Qué renderer está usando la página, tal como lo reporta el driver. Todo script
 * lo imprime: un número de frame pacing sin el renderer al lado no dice nada
 * sobre el hardware (§8, L14).
 */
export const rendererOf = (page) =>
  page.evaluate(() => {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
    if (!gl) return "no webgl";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    return String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  });

/** `true` cuando el renderer es el rasterizador de software de Chromium. */
export const isSoftwareRenderer = (renderer) => /swiftshader|llvmpipe|software/i.test(String(renderer));

/* ------------------------------------------------------------------- the capture */

/**
 * Fija toda animación y transición en su estado final. Sin esto la captura
 * depende del instante en que se tomó: dos corridas del mismo build difieren en
 * la fase de un destello y el umbral de 0.1 % se vuelve ruido.
 */
const FREEZE_CSS = `
*, *::before, *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
  caret-color: transparent !important;
  scroll-behavior: auto !important;
}
html { scroll-behavior: auto !important; }
/* The identity layer is deliberately alive, and a WebGL frame depends on when
   it was taken: neither may reach a baseline, or the 0.1 % threshold becomes
   noise. The lattice stays (it is the identity); the canvas and the strikes are
   pinned to their at-rest state. */
canvas,
.field-glow { visibility: hidden !important; }
.flare { opacity: 0 !important; animation: none !important; }
`;

const FREEZE_SCRIPT = `(() => {
  const style = document.createElement("style");
  style.id = "visual-freeze";
  style.textContent = ${JSON.stringify(FREEZE_CSS)};
  document.documentElement.appendChild(style);
})();`;

/**
 * Lleva la ventana a la posición pedida y devuelve dónde quedó. Se pasa como
 * cuerpo de `evaluate`, así que tiene que ser autocontenido; y **tiene** que
 * hacer el scroll: la versión anterior calculaba el destino y lo devolvía sin
 * llamar a `scrollTo`, y las 45 tomas salían del hero (lo delató el diff de T12
 * contra `cfc094e`, que daba 0 % en la lista de proyectos).
 */
const scrollTo = (scroll) => {
  const target =
    scroll === "top"
      ? 0
      : scroll === "hero-out"
        ? window.innerHeight
        : Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  window.scrollTo(0, target);
  return {
    y: Math.round(window.scrollY),
    height: document.documentElement.scrollHeight,
    viewport: window.innerHeight,
  };
};

/** Espera dos frames y un asentamiento corto: lo último que cambia sin animación. */
const settle = async (page, ms = 350) => {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))),
      ),
  );
  await page.waitForTimeout(ms);
};

/**
 * Captura una toma. La página se navega de cero por toma: Lenis, el observer y
 * el campo guardan estado por sesión, y reusar la página haría que la toma 2
 * dependiera de la 1.
 */
async function captureShot(context, baseUrl, shot) {
  const page = await context.newPage();
  try {
    await page.addInitScript(FREEZE_SCRIPT);
    await page.goto(`${baseUrl}${shot.url}`, { waitUntil: "load", timeout: 60_000 });
    await page.evaluate(() => document.fonts?.ready ?? null);
    await page.waitForSelector("main, #contact", { timeout: 20_000 }).catch(() => {});
    await settle(page);
    const at = await page.evaluate(scrollTo, shot.scroll);
    await settle(page);
    const png = await page.screenshot({ type: "png" });
    /* La posición alcanzada se guarda en la toma y en el manifiesto: "footer" es
       el final del documento, así que un documento más alto mueve la toma, y eso
       es una propiedad que el revisor tiene que poder leer, no adivinar. */
    return { png, at };
  } finally {
    await page.close();
  }
}

/** Contexto determinista: un DPR, un locale, sin movimiento, sin service worker. */
const contextFor = (browser, shot) =>
  browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });

/**
 * Captura las 45 tomas. Devuelve `{ renderer, shots: [{ ...shot, png }] }`;
 * `onShot` recibe cada toma a medida que termina, para que el CLI imprima la
 * tabla mientras corre y no cinco minutos después.
 */
export async function captureSet({
  url,
  software = false,
  headed = false,
  shots = SHOTS,
  onShot = () => {},
  onRenderer = () => {},
}) {
  const browser = await launchChromium({ software, headed });
  try {
    const probe = await browser.newPage();
    const renderer = await rendererOf(probe);
    await probe.close();
    onRenderer(renderer);

    const captures = [];
    for (const shot of shots) {
      const context = await contextFor(browser, shot);
      try {
        const { png, at } = await captureShot(context, url, shot);
        const entry = { ...shot, png, at };
        captures.push(entry);
        onShot(entry);
      } finally {
        await context.close();
      }
    }
    return { renderer, shots: captures };
  } finally {
    await browser.close();
  }
}

/* ----------------------------------------------------------------- the artefacts */

export const shotPath = (shot) => path.join(String(shot.width), shot.scroll, `${shot.lang}.png`);

export const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

/** `git` en el repo, o cadena vacía: el manifiesto no puede romper la captura. */
const git = (...args) => {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  return result.status === 0 ? String(result.stdout).trim() : "";
};

/** Quién tomó las tomas: commit, rama y si el árbol tenía cambios sin commitear. */
export function describeCommit(override = "") {
  const sha = git("rev-parse", "--short=7", "HEAD");
  const subject = git("log", "-1", "--pretty=%s");
  const branch = git("rev-parse", "--abbrev-ref", "HEAD");
  const dirty = git("status", "--porcelain").length > 0;
  /* `--commit` existe por la comparación de T12: el build de referencia se sirve
     desde un worktree aparte, y el manifiesto tiene que decir qué commit produjo
     lo que se capturó, no cuál está en el árbol desde donde corre el script. */
  if (override) return { sha: override, subject: "", branch: "", dirty: false };
  return { sha, subject, branch, dirty };
}

/**
 * Escribe PNGs + manifiesto. El manifiesto es el artefacto que dice con qué
 * build, con qué renderer y con qué vitals se tomó el baseline: sin él, un PNG
 * huérfano no es evidencia de nada (§14.5 paso 1).
 */
export function writeBaseline({ dir, renderer, shots, vitals = null, commit = describeCommit() }) {
  mkdirSync(dir, { recursive: true });
  const entries = shots.map((shot) => {
    const relative = shotPath(shot);
    const target = path.join(dir, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, shot.png);
    return {
      id: `${shot.width}/${shot.scroll}/${shot.lang}`,
      viewport: { width: shot.width, height: shot.height },
      scroll: shot.scroll,
      scrollY: shot.at?.y ?? 0,
      documentHeight: shot.at?.height ?? 0,
      lang: shot.lang,
      url: shot.url,
      path: path.relative(ROOT, target),
      bytes: shot.png.length,
      sha256: sha256(shot.png),
    };
  });

  const manifest = {
    protocol: "audit.md §14.5 — 5 anchos × 3 posiciones de scroll × 3 idiomas, umbral 0.1 %",
    frozen: "prefers-reduced-motion: reduce + todas las animaciones en su estado final",
    generatedAt: new Date().toISOString(),
    commit,
    renderer,
    vitals,
    shots: entries,
  };
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

/* ------------------------------------------------------------------------ helpers */

const fail = (code, message) => {
  console.error(`visual:baseline — ${message}`);
  process.exit(code);
};

export const parseArgs = (argv) => {
  const args = {
    url: "",
    port: DEFAULT_PORT,
    out: BASE_DIR,
    software: false,
    headed: false,
    vitals: "",
    commit: "",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--url") args.url = argv[(i += 1)] ?? "";
    else if (arg === "--port") args.port = Number(argv[(i += 1)] ?? DEFAULT_PORT);
    else if (arg === "--out") args.out = path.resolve(argv[(i += 1)] ?? BASE_DIR);
    else if (arg === "--vitals") args.vitals = argv[(i += 1)] ?? "";
    else if (arg === "--commit") args.commit = argv[(i += 1)] ?? "";
    else if (arg === "--swiftshader" || arg === "--software-gl") args.software = true;
    else if (arg === "--headed") args.headed = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "uso: visual:baseline [--url <url>] [--port <n>] [--out <dir>] [--swiftshader] [--headed] [--vitals <json>] [--commit <sha>]",
      );
      process.exit(0);
    } else if (arg.startsWith("-")) fail(2, `argumento desconocido: ${arg}`);
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

export async function ensureServer(args) {
  const url = args.url || `http://127.0.0.1:${args.port}`;
  if (await isListening(url)) {
    console.log(`[visual] reusing the server on ${url}`);
    return { url, stop: () => {} };
  }
  if (args.url) fail(3, `no server answering at ${args.url}`);
  if (!existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
    fail(3, "no production build in .next — run `pnpm build` first, or pass --url");
  }
  console.log(`[visual] starting: next start -p ${args.port}`);
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
  if (!(await waitForServer(url))) {
    stop();
    fail(3, `the server never answered at ${url}`);
  }
  return { url, stop };
}

/* ---------------------------------------------------------------------------- CLI */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const server = await ensureServer(args);
  const started = Date.now();

  try {
    const { renderer, shots } = await captureSet({
      url: server.url,
      software: args.software,
      headed: args.headed,
      onRenderer: (value) => console.log(`[visual] renderer: ${value}`),
      onShot: (shot) =>
        console.log(
          `  ${`${shot.width}/${shot.scroll}/${shot.lang}`.padEnd(24)} y=${String(shot.at?.y ?? 0).padStart(5)} · ${String(
            Math.round(shot.png.length / 1024),
          ).padStart(5)} KB`,
        ),
    });

    const vitals = args.vitals && existsSync(args.vitals) ? JSON.parse(readFileSync(args.vitals, "utf8")) : null;
    if (args.vitals && !vitals) console.log(`[visual] vitals not found at ${args.vitals} — the manifest will say null`);

    const manifest = writeBaseline({
      dir: args.out,
      renderer,
      shots,
      vitals,
      ...(args.commit ? { commit: describeCommit(args.commit) } : {}),
    });
    const seconds = Math.round((Date.now() - started) / 1000);
    console.log(
      `\n[visual:baseline] ${manifest.shots.length} tomas en ${args.out} · ${seconds} s · renderer=${manifest.renderer}`,
    );
    console.log(`[visual:baseline] commit ${manifest.commit.sha}${manifest.commit.dirty ? " (árbol sucio)" : ""} · manifiesto ${path.relative(ROOT, path.join(args.out, "manifest.json"))}`);
  } finally {
    server.stop();
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    console.error(`visual:baseline — ${error?.stack || error}`);
    process.exitCode = 1;
  });
}
