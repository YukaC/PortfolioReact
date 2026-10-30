#!/usr/bin/env node
/**
 * Footer wordmark pointer motion — real-browser contract for the effect in
 * `src/components/Footer.jsx`.
 *
 * The declarative catalog (`browser-verify.json`) cannot express this check: it needs a
 * scrolled section, a sequence of real pointer moves, and the computed transform of every
 * letter. Its own rules send stateful multi-step flows to the project's runner, so this is
 * the project runner for that one contract.
 *
 * Checks:
 *   1. markup          the wordmark renders one span per surname letter
 *   2. brightness      the letter under the pointer receives a `--b` value
 *   3. scale           both axes reach `1 + --b * 0.1`, equal, and above 1
 *   4. lift            `translateY` reaches `--b * -34px`
 *   5. falloff         a letter out of reach stays at rest
 *   6. settle          after the pointer leaves, every letter returns to rest
 *   7. console         no "not eligible for reset" warning and no error during the run
 *   8. reduced motion  `prefers-reduced-motion: reduce` keeps the wordmark visible and still
 *   9. coarse pointer  a touch device never gets the pointer effect
 *
 * The magnitudes mirror `Footer.jsx`. Changing them there is a contract change and is meant
 * to fail here as well.
 *
 * Exit codes: 0 all OK · 1 FALLA · 2 bad usage/config · 3 playwright or server missing.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(ROOT, "browser-verify.json");
const MARK = ".footer-mark";
const LETTER = ".footer-mark-ch";
const LETTER_COUNT = 7; // "CIUCANI"

const LIFT_PX = 34; // Footer.jsx: tweens[index].y(-force * 34)
const SCALE_GAIN = 0.1; // Footer.jsx: const scale = 1 + force * 0.1
const BRIGHT_MIN = 0.3; // a letter under the pointer is clearly lit
const PROBE_RATIO = 0.05; // pointer over the first letter
const FAR_INDEX = LETTER_COUNT - 1; // last letter, out of the falloff radius

const EASE_SETTLE_MS = 750; // quickTo duration 0.5s + margin
const STILL_SETTLE_MS = 1100; // long enough for the tail to finish
const SCROLL_SETTLE_MS = 700; // IntersectionObserver + ScrollTrigger

const TOLERANCE = { scale: 0.02, axes: 0.002, lift: 2, rest: 0.001 };

const results = [];

const record = (id, ok, detail) => {
  results.push({ id, ok, detail });
  console.log(`  ${ok ? "OK   " : "FALLA"} ${id}${detail ? ` — ${detail}` : ""}`);
};

const skip = (id, detail) => {
  results.push({ id, ok: null, detail });
  console.log(`  SKIP  ${id} — ${detail}`);
};

function fail(code, message) {
  console.error(`e2e-footer-motion: ${message}`);
  process.exit(code);
}

function parseArgs(argv) {
  const options = { headed: false, baseUrl: process.env.BROWSER_VERIFY_BASE_URL || null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--headed") options.headed = true;
    else if (arg === "--base-url") {
      options.baseUrl = argv[i + 1];
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      console.log("uso: e2e-footer-motion [--base-url <url>] [--headed]");
      process.exit(0);
    } else {
      fail(2, `unknown argument: ${arg}`);
    }
  }
  return options;
}

function loadPlaywright() {
  const candidates = [process.env.BROWSER_VERIFY_PLAYWRIGHT, "playwright"].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return createRequire(import.meta.url)(candidate);
    } catch (error) {
      if (candidate === candidates[candidates.length - 1]) {
        fail(3, `playwright not available (${error.message})`);
      }
    }
  }
  return fail(3, "playwright not available");
}

function readServerConfig() {
  const fallback = {
    command: "pnpm dev",
    port: 3000,
    path: "/",
    timeoutMs: 180_000,
    reuse: true,
  };
  if (!existsSync(CONFIG_PATH)) return fallback;

  try {
    const parsed = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    return { ...fallback, ...(parsed.server || {}) };
  } catch (error) {
    return fail(2, `cannot read ${path.basename(CONFIG_PATH)}: ${error.message}`);
  }
}

async function probe(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.status;
  } catch {
    return null;
  }
}

/**
 * Reuse the server already listening on the port, or start the one declared in
 * `browser-verify.json`, exactly like the house verifier does.
 */
async function ensureServer(options) {
  const server = readServerConfig();

  if (options.baseUrl) {
    const status = await probe(options.baseUrl);
    if (status === null) fail(3, `no server answering at ${options.baseUrl}`);
    console.log(`[e2e-footer-motion] using ${options.baseUrl} (HTTP ${status})`);
    return { url: options.baseUrl, stop: () => {} };
  }

  if (!server.port) fail(2, `"server.port" is required in ${path.basename(CONFIG_PATH)}`);

  const url = `http://127.0.0.1:${server.port}`;
  const readyUrl = new URL(server.path || "/", `${url}/`).toString();

  if (server.reuse !== false && (await probe(readyUrl)) !== null) {
    console.log(`[e2e-footer-motion] reusing the dev server at ${url}`);
    return { url, stop: () => {} };
  }

  if (!server.command) fail(2, `"server.command" is required in ${path.basename(CONFIG_PATH)}`);

  console.log(`[e2e-footer-motion] starting server: ${server.command}`);
  const child = spawn("sh", ["-c", server.command], {
    cwd: ROOT,
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

  const deadline = Date.now() + (server.timeoutMs || 180_000);
  while (Date.now() < deadline) {
    if (child.exitCode !== null) break;
    if ((await probe(readyUrl)) !== null) return { url, stop };
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  stop();
  fail(3, `server did not answer on ${readyUrl}\n${output.slice(-2000)}`);
  return null; // unreachable
}

/** Computed transform of every wordmark letter, in the shape the assertions use. */
const READ_LETTERS = (selector) => {
  const mark = document.querySelector(selector.mark);
  if (!mark) return null;

  const number = (value) => (Number.isFinite(value) ? value : 0);
  const parse = (transform) => {
    if (!transform || transform === "none") return { scaleX: 1, scaleY: 1, ty: 0 };
    const parts = transform.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
    if (!parts) return { scaleX: 1, scaleY: 1, ty: 0 };
    const values = parts.map(Number);
    return transform.startsWith("matrix3d")
      ? { scaleX: number(values[0]), scaleY: number(values[5]), ty: number(values[13]) }
      : { scaleX: number(values[0]), scaleY: number(values[3]), ty: number(values[5]) };
  };

  return [...mark.querySelectorAll(selector.letter)].map((letter) => {
    const style = getComputedStyle(letter);
    return {
      brightness: Number(style.getPropertyValue("--b")) || 0,
      ...parse(style.transform),
    };
  });
};

async function readLetters(page) {
  return page.evaluate(READ_LETTERS, { mark: MARK, letter: LETTER });
}

async function openPage(browser, url, contextOptions) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    ...contextOptions,
  });
  const page = await context.newPage();
  const messages = [];
  page.on("console", (message) => messages.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => messages.push({ type: "pageerror", text: error.message }));

  await page.goto(url, { waitUntil: "load", timeout: 60_000 });
  await page.waitForSelector(MARK, { state: "attached", timeout: 30_000 });
  await page.locator(MARK).scrollIntoViewIfNeeded();
  await page.waitForTimeout(SCROLL_SETTLE_MS);

  return { context, page, messages };
}

/** Real input, at the vertical center of the wordmark, `ratio` across its width. */
async function pointerOver(page, ratio) {
  const box = await page.locator(MARK).boundingBox();
  await page.mouse.move(box.x + box.width * ratio, box.y + box.height / 2, { steps: 8 });
  await page.waitForTimeout(EASE_SETTLE_MS);
}

async function pointerAway(page) {
  await page.mouse.move(2, 2, { steps: 4 });
  await page.waitForTimeout(STILL_SETTLE_MS);
}

const fmt = (value, digits = 3) => value.toFixed(digits);

async function desktop(browser, url) {
  console.log("\ndesktop @1280x900");
  const { context, page, messages } = await openPage(browser, url, {});

  const finePointer = await page.evaluate(
    () => window.matchMedia("(pointer: fine)").matches,
  );
  if (!finePointer) {
    skip("pointer/fine", "this browser reports a coarse pointer");
    await context.close();
    return;
  }

  const rest = await readLetters(page);
  record(
    "markup",
    Boolean(rest) && rest.length === LETTER_COUNT,
    `${rest ? rest.length : 0} letters, expected ${LETTER_COUNT}`,
  );
  if (!rest || rest.length !== LETTER_COUNT) {
    await context.close();
    return;
  }

  const restClean = rest.every(
    (letter) =>
      letter.brightness === 0 &&
      Math.abs(letter.scaleX - 1) <= TOLERANCE.rest &&
      Math.abs(letter.scaleY - 1) <= TOLERANCE.rest &&
      Math.abs(letter.ty) <= TOLERANCE.rest,
  );
  record("motion/rest", restClean, restClean ? "idle mark is untransformed" : "mark already moved");

  await pointerOver(page, PROBE_RATIO);
  const active = await readLetters(page);
  const near = active[0];
  const expectedScale = 1 + near.brightness * SCALE_GAIN;
  const expectedLift = -near.brightness * LIFT_PX;

  record(
    "motion/brightness",
    near.brightness > BRIGHT_MIN,
    `--b ${fmt(near.brightness)} (needs > ${BRIGHT_MIN})`,
  );
  record(
    "motion/scale",
    Math.abs(near.scaleX - expectedScale) <= TOLERANCE.scale &&
      Math.abs(near.scaleY - expectedScale) <= TOLERANCE.scale &&
      near.scaleX > 1.02,
    `scaleX/Y ${fmt(near.scaleX)}/${fmt(near.scaleY)}, expected ${fmt(expectedScale)}`,
  );
  record(
    "motion/scale-axes",
    Math.abs(near.scaleX - near.scaleY) <= TOLERANCE.axes,
    `scaleX ${fmt(near.scaleX)} vs scaleY ${fmt(near.scaleY)}`,
  );
  record(
    "motion/lift",
    Math.abs(near.ty - expectedLift) <= TOLERANCE.lift,
    `translateY ${fmt(near.ty, 2)}px, expected ${fmt(expectedLift, 2)}px`,
  );

  const far = active[FAR_INDEX];
  const farAtRest =
    far.brightness === 0 &&
    Math.abs(far.scaleX - 1) <= TOLERANCE.rest &&
    Math.abs(far.ty) <= TOLERANCE.rest;
  record(
    "motion/falloff",
    farAtRest,
    `letter ${FAR_INDEX} — --b ${fmt(far.brightness)}, scaleX ${fmt(far.scaleX)}, translateY ${fmt(far.ty, 2)}px`,
  );

  await pointerAway(page);
  const settled = await readLetters(page);
  const settledClean = settled.every(
    (letter) =>
      letter.brightness === 0 &&
      Math.abs(letter.scaleX - 1) <= TOLERANCE.rest &&
      Math.abs(letter.scaleY - 1) <= TOLERANCE.rest &&
      Math.abs(letter.ty) <= TOLERANCE.rest,
  );
  record(
    "motion/settle",
    settledClean,
    settledClean
      ? "every letter returned to rest"
      : `stuck at scaleX ${fmt(settled[0].scaleX)}, translateY ${fmt(settled[0].ty, 2)}px`,
  );

  const resetWarnings = messages.filter((message) =>
    /not eligible for reset/i.test(message.text),
  );
  record(
    "console/reset-warning",
    resetWarnings.length === 0,
    resetWarnings.length === 0
      ? "no gsap reset warning"
      : `${resetWarnings.length}x "${resetWarnings[0].text}"`,
  );

  const errors = messages.filter(
    (message) => message.type === "error" || message.type === "pageerror",
  );
  record(
    "console/errors",
    errors.length === 0,
    errors.length === 0 ? "no console error" : `${errors.length}x ${errors[0].text}`,
  );

  await context.close();
}

async function reducedMotion(browser, url) {
  console.log("\nreduced motion @1280x900");
  const { context, page } = await openPage(browser, url, { reducedMotion: "reduce" });

  const visible = await page.locator(MARK).isVisible();
  record("reduced/visible", visible, visible ? "wordmark still visible" : "wordmark hidden");

  await pointerOver(page, PROBE_RATIO);
  const letters = await readLetters(page);
  const still = (letters || []).every(
    (letter) =>
      letter.brightness === 0 &&
      Math.abs(letter.scaleX - 1) <= TOLERANCE.rest &&
      Math.abs(letter.scaleY - 1) <= TOLERANCE.rest &&
      Math.abs(letter.ty) <= TOLERANCE.rest,
  );
  record(
    "reduced/still",
    Boolean(letters) && still,
    !letters
      ? "wordmark missing"
      : still
        ? "no pointer effect with reduced motion"
        : `letter moved: scaleX ${fmt(letters[0].scaleX)}, translateY ${fmt(letters[0].ty, 2)}px`,
  );

  await context.close();
}

async function coarsePointer(browser, url, playwright) {
  console.log("\ncoarse pointer @iPhone 13");
  const { context, page } = await openPage(browser, url, {
    ...playwright.devices["iPhone 13"],
  });

  const finePointer = await page.evaluate(
    () => window.matchMedia("(pointer: fine)").matches,
  );
  if (finePointer) {
    skip("coarse/no-effect", "cannot emulate a coarse pointer in this browser");
    await context.close();
    return;
  }

  await pointerOver(page, PROBE_RATIO);
  const letters = await readLetters(page);
  const atRest = (letters || []).every(
    (letter) =>
      letter.brightness === 0 &&
      Math.abs(letter.scaleX - 1) <= TOLERANCE.rest &&
      Math.abs(letter.ty) <= TOLERANCE.rest,
  );
  record(
    "coarse/no-effect",
    Boolean(letters) && atRest,
    !letters
      ? "wordmark missing"
      : atRest
        ? "touch device keeps the mark still"
        : `letter moved: scaleX ${fmt(letters[0].scaleX)}, translateY ${fmt(letters[0].ty, 2)}px`,
  );

  await context.close();
}

function summarize() {
  const ok = results.filter((result) => result.ok === true).length;
  const failed = results.filter((result) => result.ok === false).length;
  const skipped = results.filter((result) => result.ok === null).length;

  console.log("");
  if (failed > 0) {
    console.error("FALLA:");
    for (const result of results.filter((entry) => entry.ok === false)) {
      console.error(`  ${result.id} — ${result.detail}`);
    }
  }
  const line = `RESUMEN: ${ok} OK · ${failed} FALLA · ${skipped} SKIP`;
  if (failed > 0) console.error(line);
  else console.log(line);

  process.exit(failed > 0 ? 1 : 0);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const playwright = loadPlaywright();
  const server = await ensureServer(options);

  const browser = await playwright.chromium.launch({
    headless: !options.headed,
    ...(process.env.BROWSER_VERIFY_CHROMIUM
      ? { executablePath: process.env.BROWSER_VERIFY_CHROMIUM }
      : {}),
  });

  try {
    await desktop(browser, server.url);
    await reducedMotion(browser, server.url);
    await coarsePointer(browser, server.url, playwright);
  } finally {
    await browser.close();
    server.stop();
  }

  summarize();
}

main().catch((error) => {
  fail(1, error?.stack || String(error));
});
