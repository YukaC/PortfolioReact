#!/usr/bin/env node
/**
 * browser-verify — verificación de browser declarativa, agnóstica de stack.
 *
 * Un proyecto adopta esta herramienta con un `browser-verify.json` en su raíz y
 * las reglas viven ahí, revisables en PR. El servidor es un comando arbitrario
 * (`pnpm dev`, `python3 -m http.server`, `go run .`, `make serve`), así que no
 * asume framework, puerto ni layout.
 *
 * Cada regla puede declarar `spec: "S3"`; el resumen final da veredicto por spec,
 * que es lo que `verify` cita como evidencia. Un check que pasa en vacío es un
 * bug: toda regla que inspecciona el documento falla si no encontró qué mirar.
 *
 * Uso:
 *   browser-verify                        usa ./browser-verify.json
 *   browser-verify --root <dir>           resuelve config desde ese proyecto
 *   browser-verify --base-url <url>       usa un servidor ya levantado, no spawnea
 *   browser-verify --only h1,console      corre solo esas reglas
 *   browser-verify --json                 salida JSON a stdout
 *   browser-verify --report <file>        escribe el reporte JSON en un archivo
 *   browser-verify --headed               muestra el browser
 *
 * Estados: OK / FALLA / SALTADO. Códigos de salida: 0 todo OK, 1 alguna FALLA,
 * 2 config o uso inválido, 3 falta playwright o no hay servidor.
 *
 * Env: BROWSER_VERIFY_PLAYWRIGHT (ruta al paquete playwright),
 *      BROWSER_VERIFY_BASE_URL, BROWSER_VERIFY_TIMEOUT_MS.
 */
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const HOME = process.env.HOME || "";
const CONFIG_NAME = "browser-verify.json";
const ARTIFACT_DIR = ".browser-verify";
const TIMEOUT_MS = Number(process.env.BROWSER_VERIFY_TIMEOUT_MS || 60_000);
const SERVER_TIMEOUT_MS = Number(process.env.BROWSER_VERIFY_TIMEOUT_MS || 120_000);

const OK = "OK";
const FAIL = "FALLA";
const SKIP = "SALTADO";

const log = (line = "") => process.stdout.write(`${line}\n`);

function die(message, code = 2) {
  process.stderr.write(`browser-verify: ${message}\n`);
  process.exit(code);
}

/* ------------------------------------------------------------------- argumentos */

function parseArgs(argv) {
  const options = {
    root: null,
    config: null,
    baseUrl: process.env.BROWSER_VERIFY_BASE_URL || null,
    json: false,
    report: null,
    only: null,
    headed: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    // pnpm reenvía el separador `--` literal; npm lo consume.
    if (arg === "--") continue;
    const value = () => argv[++i] || die(`${arg} necesita un valor`);

    if (arg === "--root") options.root = value();
    else if (arg === "--config") options.config = value();
    else if (arg === "--base-url") options.baseUrl = value();
    else if (arg === "--report") options.report = value();
    else if (arg === "--only") options.only = value().split(",").map((s) => s.trim()).filter(Boolean);
    else if (arg === "--json") options.json = true;
    else if (arg === "--headed") options.headed = true;
    else if (arg === "-h" || arg === "--help") {
      log("browser-verify [--root <dir>] [--config <file>] [--base-url <url>] [--only a,b] [--json] [--report <file>] [--headed]");
      log("Reglas: " + Object.keys(RULES).join(", "));
      process.exit(0);
    } else die(`argumento desconocido: ${arg}`);
  }

  return options;
}

function resolveRoot(explicit) {
  if (explicit) return path.resolve(explicit);
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  } catch {
    return process.cwd();
  }
}

function loadConfig(root, explicitPath) {
  const file = explicitPath ? path.resolve(explicitPath) : path.join(root, CONFIG_NAME);
  if (!existsSync(file)) {
    if (explicitPath) die(`no existe el config: ${file}`);
    log(`browser-verify: ${SKIP} (sin ${CONFIG_NAME} en ${root})`);
    process.exit(0);
  }

  let config;
  try {
    config = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    die(`${file} no es JSON válido: ${error.message}`);
  }

  if (!Array.isArray(config.pages) || !config.pages.length) {
    die(`${file}: "pages" debe ser un array con al menos una página`);
  }

  return { file, config };
}

/* ------------------------------------------------------------------- servidor */

async function probe(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    return res.status;
  } catch {
    return null;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer(url, child) {
  const deadline = Date.now() + SERVER_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await probe(url);
    if (status !== null && status < 500) return true;
    if (child && child.exitCode !== null) return false;
    await sleep(250);
  }
  return false;
}

/**
 * Levanta el servidor declarado en el config, o reusa el que ya escucha en el
 * puerto: reusar es el camino barato cuando el humano tiene su dev server vivo,
 * y evita pelearse con lockfiles de cualquier herramienta.
 */
async function startServer(root, server, explicitBaseUrl) {
  const https = Boolean(server.https);
  const scheme = https ? "https" : "http";
  const port = server.port;
  if (!server.command) die('el config necesita "server.command" o pasá --base-url');
  if (!port && !explicitBaseUrl) die('el config necesita "server.port" o pasá --base-url');

  const url = explicitBaseUrl || server.baseUrl || `${scheme}://127.0.0.1:${port}`;
  const probePath = server.path || "/";
  const readyUrl = new URL(probePath, `${url.replace(/\/+$/, "")}/`).toString();

  if (server.reuse !== false) {
    const status = await probe(readyUrl);
    if (status !== null && status < 500) {
      log(`[browser-verify] reusando servidor en ${url} (HTTP ${status})`);
      return { url, stop: () => {} };
    }
  }

  log(`[browser-verify] arrancando servidor: ${server.command}`);
  const child = spawn("sh", ["-c", server.command], {
    cwd: server.cwd ? path.resolve(root, server.cwd) : root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });

  let output = "";
  const collect = (chunk) => {
    output = (output + chunk.toString()).slice(-20_000);
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);

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

  if (await waitForServer(readyUrl, child)) return { url, stop };

  stop();
  const tail = output.trim().split("\n").slice(-8).join("\n");
  throw Object.assign(
    new Error(`el servidor no respondió en ${readyUrl}\n--- salida del servidor ---\n${tail}`),
    { exitCode: 3 },
  );
}

/* ------------------------------------------------------------------ playwright */

function loadPlaywright(root) {
  const candidates = [
    process.env.BROWSER_VERIFY_PLAYWRIGHT,
    path.join(HOME, ".agents", "vendor", "node_modules", "playwright"),
    "/usr/lib/node_modules/playwright",
    "/usr/local/lib/node_modules/playwright",
  ].filter(Boolean);

  const attempts = [path.join(root, "package.json"), ...candidates.map((dir) => path.join(dir, "index.js"))];
  for (const anchor of attempts) {
    try {
      return createRequire(anchor)("playwright");
    } catch {
      /* siguiente candidato */
    }
  }

  die(
    [
      "no encontré el paquete playwright.",
      "  · instalación central:  cd ~/.agents/vendor && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install",
      "  · en un proyecto Node:  pnpm add -D playwright && pnpm exec playwright install chromium",
      "  · override puntual:     BROWSER_VERIFY_PLAYWRIGHT=/ruta/a/node_modules/playwright",
    ].join("\n"),
    3,
  );
}

/* -------------------------------------------------------------------- helpers */

const norm = (text) => (text || "").replace(/\s+/g, " ").trim();

/** Espera a que la página termine de asentarse sin colgarse en websockets. */
async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
}

async function navigate(page, url) {
  const response = await page.goto(url, { waitUntil: "load", timeout: TIMEOUT_MS });
  await settle(page);
  return response;
}

/** Ancho de documento desbordado respecto del viewport. */
const overflowExpression = `(() => {
  const el = document.documentElement;
  return el.scrollWidth - el.clientWidth;
})()`;

/* ------------------------------------------------------------- catálogo reglas */

const RULES = {
  /** Contrato del documento: HTTP 200, `lang`, `title`. */
  document: async ({ page, url, rule }) => {
    const response = await navigate(page, url);
    if (!response) throw new Error("sin respuesta del servidor");
    if (response.status() !== 200) throw new Error(`HTTP ${response.status()} en ${url}`);
    const meta = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      title: document.title.trim(),
    }));
    if (rule.lang !== undefined && meta.lang !== rule.lang) {
      throw new Error(`<html lang> es ${JSON.stringify(meta.lang)}, esperaba ${JSON.stringify(rule.lang)}`);
    }
    if (rule.title !== false && !meta.title) throw new Error("document.title vacío");
    return `HTTP 200 · lang=${meta.lang || "(vacío)"} · ${meta.title.slice(0, 48) || "(sin title)"}`;
  },

  /** Cantidad exacta de `h1` (default 1) y ninguno vacío. */
  h1: async ({ page, url, rule }) => {
    await navigate(page, url);
    const headings = await page.evaluate(() =>
      [...document.querySelectorAll("h1")].map((n) => n.textContent.replace(/\s+/g, " ").trim()),
    );
    const expected = rule.count ?? 1;
    if (headings.length !== expected) {
      throw new Error(`encontré ${headings.length} <h1>, esperaba ${expected}: ${JSON.stringify(headings)}`);
    }
    const empty = headings.filter((h) => !h).length;
    if (empty) throw new Error(`${empty} <h1> vacío`);
    return headings[0] ? headings[0].slice(0, 56) : "sin h1 (esperado 0)";
  },

  /** Toda `img` declara `alt`; `alt=""` es decorativa y se informa. */
  "img-alt": async ({ page, url }) => {
    await navigate(page, url);
    const images = await page.evaluate(() =>
      [...document.querySelectorAll("img")].map((n) => ({
        alt: n.getAttribute("alt"),
        src: (n.getAttribute("src") || "(sin src)").slice(0, 64),
      })),
    );
    const missing = images.filter((i) => i.alt === null);
    if (missing.length) {
      throw new Error(`${missing.length}/${images.length} <img> sin alt: ${missing.map((i) => i.src).join(", ")}`);
    }
    const decorative = images.filter((i) => i.alt === "").length;
    return `${images.length} imágenes, ${decorative} decorativas`;
  },

  /** Anclas in-page resuelven a un `id` real; rutas internas responden < 400. */
  anchors: async ({ page, url, rule, context, baseUrl }) => {
    await navigate(page, url);
    const origin = new URL(baseUrl).origin;
    const links = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")));
    if (!links.length) throw new Error("no hay anclas en la página (nada renderizado que revisar)");
    const ids = new Set(await page.evaluate(() => [...document.querySelectorAll("[id]")].map((n) => n.id)));

    const broken = [];
    const routes = new Set();
    for (const href of links) {
      if (!href || /^(mailto|tel|javascript|data):/i.test(href)) continue;
      const resolved = new URL(href, url);
      if (resolved.origin === origin && resolved.hash) {
        const target = resolved.hash.slice(1);
        if (target && !ids.has(target)) broken.push(`${href} → #${target} no existe en la página`);
        continue;
      }
      if (resolved.origin === origin) routes.add(resolved.pathname);
    }

    if (rule.routes !== false) {
      for (const route of [...routes].slice(0, rule.maxRoutes ?? 20)) {
        const response = await context.request.get(new URL(route, baseUrl).toString(), { timeout: TIMEOUT_MS });
        if (response.status() >= 400) broken.push(`${route} → HTTP ${response.status()}`);
      }
    }

    if (broken.length) throw new Error(broken.join("; "));
    return `${links.length} anclas, ${ids.size} ids, ${routes.size} rutas internas`;
  },

  /** Cero console.error y cero excepciones sin capturar durante la carga. */
  console: async ({ page, url, rule, errors }) => {
    await navigate(page, url);
    await page.waitForTimeout(rule.settleMs ?? 1_500);
    const allow = (rule.allow || []).map((pattern) => new RegExp(pattern));
    const real = errors.filter((error) => !allow.some((pattern) => pattern.test(error)));
    if (real.length) throw new Error(real.join("; "));
    return "sin errores en consola";
  },

  /** El primer Tab cae en un foco con nombre accesible (skip link sano). */
  "first-tab": async ({ page, url }) => {
    await navigate(page, url);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return { tag: el ? el.tagName : "none", name: "" };
      const name =
        el.getAttribute("aria-label") ||
        (el.textContent || "").replace(/\s+/g, " ").trim() ||
        el.getAttribute("title") ||
        "";
      return { tag: el.tagName, name: name.slice(0, 48) };
    });
    if (stop.tag === "BODY" || stop.tag === "none") throw new Error("Tab no movió el foco dentro de la página");
    if (!stop.name) throw new Error(`el primer Tab cayó en <${stop.tag.toLowerCase()}> sin nombre accesible`);
    return `<${stop.tag.toLowerCase()}> "${stop.name}"`;
  },

  /** Toda interacción visible tiene nombre accesible. */
  "a11y-labels": async ({ page, url, rule }) => {
    await navigate(page, url);
    const unnamed = await page.evaluate((selector) => {
      const visible = (el) => {
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      };
      const labelOf = (el) => {
        const aria = el.getAttribute("aria-label");
        if (aria && aria.trim()) return aria.trim();
        const labelledBy = el.getAttribute("aria-labelledby");
        if (labelledBy) {
          const text = labelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent || "")
            .join(" ")
            .trim();
          if (text) return text;
        }
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (text) return text;
        const title = el.getAttribute("title");
        if (title && title.trim()) return title.trim();
        const alt = el.getAttribute("alt");
        if (alt && alt.trim()) return alt.trim();
        if (el.id) {
          const label = document.querySelector(`label[for="${el.id}"]`);
          if (label) {
            const text2 = (label.textContent || "").replace(/\s+/g, " ").trim();
            if (text2) return text2;
          }
        }
        const wrapping = el.closest("label");
        if (wrapping) {
          const text3 = (wrapping.textContent || "").replace(/\s+/g, " ").trim();
          if (text3) return text3;
        }
        return "";
      };
      return [...document.querySelectorAll(selector)]
        .filter((el) => visible(el) && !labelOf(el))
        .map((el) => `<${el.tagName.toLowerCase()}> ${el.outerHTML.slice(0, 90)}`);
    }, rule.selector || "a[href], button, input:not([type=hidden]), select, textarea");
    if (unnamed.length) throw new Error(`${unnamed.length} controles sin nombre: ${unnamed.slice(0, 3).join(" | ")}`);
    return "todos los controles tienen nombre";
  },

  /** El elemento existe y es visible. */
  visible: async ({ page, url, rule }) => {
    await navigate(page, url);
    const state = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (!el) return { found: false };
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        found: true,
        width: Math.round(box.width),
        height: Math.round(box.height),
        visibility: style.visibility,
        display: style.display,
        opacity: Number(style.opacity),
      };
    }, rule.selector);
    if (!state.found) throw new Error(`no encontré ${rule.selector}`);
    if (state.height <= 0 || state.width <= 0) throw new Error(`${rule.selector} sin caja (${state.width}x${state.height})`);
    if (state.visibility === "hidden" || state.display === "none") {
      throw new Error(`${rule.selector} oculto (visibility=${state.visibility}, display=${state.display})`);
    }
    if (state.opacity < 0.99) throw new Error(`${rule.selector} con opacidad ${state.opacity}`);
    return `${rule.selector} visible ${state.width}x${state.height}`;
  },

  /** El texto del elemento contiene / matchea lo pedido. */
  text: async ({ page, url, rule }) => {
    if (!rule.selector || (!rule.contains && !rule.matches && rule.exact === undefined)) {
      throw new Error('"text" necesita selector y contains|matches|exact');
    }
    await navigate(page, url);
    const text = norm(await page.textContent(rule.selector, { timeout: 5_000 }).catch(() => null));
    if (text === "") throw new Error(`no encontré texto en ${rule.selector}`);
    if (rule.contains && !text.includes(rule.contains)) {
      throw new Error(`${rule.selector} no contiene ${JSON.stringify(rule.contains)} · leí: ${JSON.stringify(text.slice(0, 120))}`);
    }
    if (rule.matches && !new RegExp(rule.matches).test(text)) {
      throw new Error(`${rule.selector} no matchea /${rule.matches}/ · leí: ${JSON.stringify(text.slice(0, 120))}`);
    }
    if (rule.exact !== undefined && text !== norm(rule.exact)) {
      throw new Error(`${rule.selector} esperaba ${JSON.stringify(rule.exact)} · leí: ${JSON.stringify(text.slice(0, 120))}`);
    }
    return JSON.stringify(text.slice(0, 56));
  },

  /** Cantidad de matches dentro de [min, max]. */
  count: async ({ page, url, rule }) => {
    if (!rule.selector) throw new Error('"count" necesita selector');
    await navigate(page, url);
    const total = await page.evaluate((selector) => document.querySelectorAll(selector).length, rule.selector);
    if (rule.min !== undefined && total < rule.min) {
      throw new Error(`${rule.selector}: ${total} < mínimo ${rule.min}`);
    }
    if (rule.max !== undefined && total > rule.max) {
      throw new Error(`${rule.selector}: ${total} > máximo ${rule.max}`);
    }
    return `${total} × ${rule.selector}`;
  },

  /** Sin overflow horizontal del documento. */
  "no-overflow": async ({ page, url, rule }) => {
    await navigate(page, url);
    if (rule.selector) {
      const width = await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        return el ? Math.round(el.scrollWidth - el.clientWidth) : 0;
      }, rule.selector);
      if (width > (rule.tolerance ?? 1)) throw new Error(`${rule.selector} desborda ${width}px`);
      return `${rule.selector} sin overflow`;
    }
    const overflow = await page.evaluate(overflowExpression);
    if (overflow > (rule.tolerance ?? 1)) throw new Error(`el documento desborda ${overflow}px en horizontal`);
    return "sin overflow horizontal";
  },

  /** Bajo `prefers-reduced-motion: reduce` el selector sigue visible. */
  "reduced-motion": async ({ page, url, rule }) => {
    const selector = rule.selector || "h1";
    await page.emulateMedia({ reducedMotion: "reduce" });
    await navigate(page, url);
    const state = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const style = getComputedStyle(el);
      return { opacity: Number(style.opacity), visibility: style.visibility, height: Math.round(el.getBoundingClientRect().height) };
    }, selector);
    if (!state) throw new Error(`no encontré ${selector} con motion reducido`);
    if (state.visibility !== "visible") throw new Error(`${selector} visibility=${state.visibility}`);
    if (state.opacity < 0.99) throw new Error(`${selector} opacidad ${state.opacity}`);
    if (state.height <= 0) throw new Error(`${selector} con altura 0 (contenido escondido)`);
    return `${selector} visible, ${state.height}px`;
  },

  /** Guarda un artefacto visual. */
  screenshot: async ({ page, url, rule, artifacts, label }) => {
    await navigate(page, url);
    if (!artifacts) return "sin directorio de artefactos";
    const file = path.join(artifacts, `${rule.name || label}.png`);
    await page.screenshot({ path: file, fullPage: rule.fullPage !== false });
    return path.relative(process.cwd(), file);
  },
};

/* --------------------------------------------------------------------- reporte */

function summarize(results) {
  const counts = { [OK]: 0, [FAIL]: 0, [SKIP]: 0 };
  for (const result of results) counts[result.status] += 1;

  const specs = {};
  for (const result of results.filter((r) => r.spec)) {
    for (const spec of [].concat(result.spec)) {
      specs[spec] ??= { status: OK, passed: 0, failed: 0, rules: [] };
      if (result.status === FAIL) {
        specs[spec].status = FAIL;
        specs[spec].failed += 1;
      } else {
        specs[spec].passed += 1;
      }
      specs[spec].rules.push(`${result.rule}${result.detail ? ` (${result.detail.slice(0, 80)})` : ""}`);
    }
  }

  return { counts, specs, ok: counts[FAIL] === 0 };
}

function printHuman({ root, configPath, baseUrl, results, summary, artifacts }) {
  log(`=== browser-verify (${root}) ===`);
  log(`config: ${path.relative(process.cwd(), configPath)} · ${baseUrl}`);
  log("");

  for (const result of results) {
    const where = `${result.path}${result.viewport ? ` @${result.viewport}` : ""}`;
    const mark = result.status === OK ? "✔" : result.status === FAIL ? "✘" : "·";
    const spec = result.spec ? ` [${[].concat(result.spec).join(",")}]` : "";
    log(`${mark} ${result.rule.padEnd(14)} ${where}${spec} — ${result.detail || result.status}`);
  }

  const specs = Object.entries(summary.specs);
  if (specs.length) {
    log("");
    log("=== veredicto por spec ===");
    for (const [spec, data] of specs) {
      log(`${spec.padEnd(8)} ${data.status.padEnd(6)} ${data.passed} OK · ${data.failed} FALLA`);
    }
  }

  log("");
  if (artifacts) log(`artefactos: ${path.relative(process.cwd(), artifacts)}`);
  log(`RESUMEN: ${summary.counts[OK]} ${OK} · ${summary.counts[FAIL]} ${FAIL} · ${summary.counts[SKIP]} ${SKIP}`);
}

/* ------------------------------------------------------------------------ main */

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = resolveRoot(options.root);
  const { file: configPath, config } = loadConfig(root, options.config);

  const viewports = config.viewports?.length
    ? config.viewports
    : [{ name: "desktop", width: 1280, height: 900 }];
  const viewportByName = new Map(viewports.map((viewport) => [viewport.name, viewport]));

  const server = await startServer(root, config.server || {}, options.baseUrl);
  const baseUrl = server.url;

  const playwright = loadPlaywright(root);
  const browser = await playwright.chromium.launch({
    headless: !options.headed,
    ...(process.env.BROWSER_VERIFY_CHROMIUM ? { executablePath: process.env.BROWSER_VERIFY_CHROMIUM } : {}),
  });

  const artifacts = config.artifacts === false ? null : path.join(root, ARTIFACT_DIR);
  if (artifacts) mkdirSync(artifacts, { recursive: true });

  const results = [];
  try {
    for (const pageConfig of config.pages) {
      const pagePath = pageConfig.path || "/";
      const url = new URL(pagePath, `${baseUrl.replace(/\/+$/, "")}/`).toString();
      const pageRules = pageConfig.rules || [];

      if (!Array.isArray(pageRules) || !pageRules.length) die(`la página ${pagePath} no declara "rules"`);

      for (const ruleConfig of pageRules) {
        const rule = typeof ruleConfig === "string" ? { rule: ruleConfig } : ruleConfig;
        const name = rule.rule;
        if (!RULES[name]) die(`regla desconocida: ${name}. Válidas: ${Object.keys(RULES).join(", ")}`);
        if (options.only && !options.only.includes(name)) continue;

        const viewportNames =
          rule.viewport === "all" ? [...viewportByName.keys()] : [rule.viewport || viewports[0].name];
        const targets = viewportNames.map((nameOrDefault) => viewportByName.get(nameOrDefault) || viewports[0]);

        for (const viewport of targets) {
          const context = await browser.newContext({
            viewport: { width: viewport.width, height: viewport.height },
            reducedMotion: "no-preference",
          });
          const page = await context.newPage();
          const errors = [];
          page.on("console", (message) => {
            if (message.type() === "error") errors.push(message.text().slice(0, 300));
          });
          page.on("pageerror", (error) => errors.push(`uncaught: ${String(error).slice(0, 300)}`));

          const started = Date.now();
          let status = OK;
          let detail = "";
          try {
            detail = (await RULES[name]({ page, url, rule, context, baseUrl, errors, artifacts, label: `${name}` })) || "";
          } catch (error) {
            status = FAIL;
            detail = error.message;
            if (artifacts) {
              const shot = path.join(artifacts, `fail-${name}-${viewport.name}-${results.length + 1}.png`);
              await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
            }
          } finally {
            await context.close();
          }

          results.push({
            path: pagePath,
            rule: name,
            viewport: viewports.length > 1 ? viewport.name : null,
            status,
            detail,
            spec: rule.spec || null,
            ms: Date.now() - started,
          });
        }
      }
    }
  } finally {
    await browser.close();
    server.stop();
  }

  if (!results.length) die("ninguna regla corrió (revisá pages/rules y --only)");

  const summary = summarize(results);
  const report = {
    tool: "browser-verify",
    root,
    config: configPath,
    baseUrl,
    ok: summary.ok,
    counts: summary.counts,
    specs: summary.specs,
    artifacts,
    results,
  };

  if (options.report) {
    mkdirSync(path.dirname(path.resolve(options.report)), { recursive: true });
    writeFileSync(path.resolve(options.report), `${JSON.stringify(report, null, 2)}\n`);
  }

  if (options.json) log(JSON.stringify(report, null, 2));
  else printHuman({ root, configPath, baseUrl, results, summary, artifacts });

  process.exit(summary.ok ? 0 : 1);
}

main().catch((error) => {
  process.stderr.write(`browser-verify: ${error.message}\n`);
  process.exit(error.exitCode || 2);
});
