#!/usr/bin/env node
/**
 * Runtime contract checks the a11y runner cannot see.
 *
 * Two defects shipped in the same night with every gate green, because
 * `browser-verify` only opens `/` in English on a `127.0.0.1` origin:
 *
 *   1. The locale proxy stopped running in `next dev` (Next 16 moved the file
 *      convention from `middleware.js` to `proxy.js`, which has to sit beside
 *      `pages`). Detection and the switcher silently did nothing — invisible to
 *      a check that only reads the English home page.
 *   2. The copy button used `navigator.clipboard`, which does not exist outside
 *      a secure context: correct on `localhost`, dead on the LAN address a
 *      phone actually uses.
 *
 * So this script asserts the two contracts directly:
 *   - `/` answers in the visitor's language, and `?lang=` beats the header;
 *   - the contact button puts the address on the clipboard even when the Async
 *     Clipboard API is missing.
 *
 *   pnpm e2e:runtime                      # reuse the server on :3000
 *   pnpm e2e:runtime --url http://…:3100  # or measure a specific one
 *
 * It prefers an already-running server (the dev one, which is the case that
 * broke) and boots `next dev` itself when the port is empty, so it exercises the
 * same code path a developer sees.
 */
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import es from "../src/i18n/messages/es.js";
import pt from "../src/i18n/messages/pt.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_URL = "http://127.0.0.1:3000";

/** The visible text of the document, with markup and whitespace flattened. */
const plainText = (html) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

/** A dictionary string in the same flattened shape, so copy edits cannot break the check. */
const sentence = (value) => String(value).replace(/\s+/g, " ").trim();

const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "OK  " : "FAIL"}  ${name} — ${detail}`);
};

const parseArgs = (argv) => {
  const args = { url: DEFAULT_URL };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--url") args.url = argv[(i += 1)] ?? DEFAULT_URL;
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

/* ------------------------------------------------------------------ checks */

/** The proxy answered in the requested language, header and document alike. */
async function checkRequestLocale(baseUrl) {
  const response = await fetch(`${baseUrl}/`, {
    headers: { "accept-language": "es-AR,es;q=0.9" },
    redirect: "manual",
  });
  const html = await response.text();
  const contentLanguage = response.headers.get("content-language");
  const cookie = response.headers.get("set-cookie") ?? "";
  const lang = /<html[^>]*lang="([^"]+)"/.exec(html)?.[1] ?? "";
  const text = plainText(html);

  record(
    "proxy answers / in the browser's language",
    contentLanguage === "es" &&
      lang.startsWith("es") &&
      // The heading is split into word spans, so compare against the document
      // text rather than the raw markup: a dictated line break or a markup
      // change must not be able to fail this.
      text.includes(sentence(es.hero.title)) &&
      text.includes(sentence(es.hero.lead)),
    `content-language=${contentLanguage} · html lang=${lang} · copy=${text.includes(sentence(es.hero.lead)) ? "es" : "not-es"}`,
  );

  record(
    "proxy persists the detected tag",
    /pf_locale=es/i.test(cookie),
    cookie ? cookie.split(";")[0] : "no set-cookie header",
  );

  await checkSharedCaching(baseUrl);
}

/**
 * A shared cache has to be able to hand the same bytes to every visitor: the
 * document cannot be `private`/`no-store`, and `Vary` cannot list `Cookie` —
 * that fragments every shared cache for a header only `/` reads, which is
 * exactly what §24 S3 rejects.
 *
 * This check used to require `Accept-Language` in `Vary`. It can no longer: on
 * Next 16 the App Router response overwrites the `Vary` the proxy appends
 * (`node_modules/next/dist/build/templates/app-page-runtime.js:458`), so the
 * header never reaches the client and the assertion demanded something this
 * repo cannot own — `pnpm e2e:runtime` failed one check for that reason alone.
 * What the repo *does* own is the absence of `Cookie` in `Vary`, which the
 * proxy guarantees on all three homes, so that is what is asserted, and the
 * cacheability half stays as strict as it was.
 */
async function checkSharedCaching(baseUrl) {
  const homes = ["/", "/es", "/pt"];
  const evidence = [];

  for (const home of homes) {
    const response = await fetch(`${baseUrl}${home}`, {
      headers: { "accept-language": "es-AR,es;q=0.9", cookie: "pf_locale=es-AR" },
      redirect: "manual",
    });
    await response.text();
    const vary = (response.headers.get("vary") ?? "").toLowerCase();
    const cacheControl = (response.headers.get("cache-control") ?? "").toLowerCase();
    const varied = vary
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);
    evidence.push({
      home,
      vary: vary || "none",
      cacheControl: cacheControl || "none",
      cookieInVary: varied.includes("cookie"),
      perVisitor: /\b(private|no-store)\b/.test(cacheControl),
    });
  }

  const bad = evidence.filter((entry) => entry.cookieInVary || entry.perVisitor);

  record(
    "proxy keeps caches honest",
    bad.length === 0,
    evidence
      .map((entry) => `${entry.home} vary=[${entry.vary}] cache-control=[${entry.cacheControl}]`)
      .join(" · "),
  );
}

/** `?lang=` is the switcher's hard navigation: it has to beat the header. */
async function checkSwitcherWins(baseUrl) {
  const response = await fetch(`${baseUrl}/?lang=pt`, {
    headers: { "accept-language": "en-US,en;q=0.9" },
    redirect: "manual",
  });
  const html = await response.text();
  const lang = /<html[^>]*lang="([^"]+)"/.exec(html)?.[1] ?? "";
  const text = plainText(html);

  record(
    "the switcher beats the request header",
    lang.startsWith("pt") &&
      text.includes(sentence(pt.hero.title)) &&
      text.includes(sentence(pt.hero.lead)),
    `html lang=${lang} · copy=${text.includes(sentence(pt.hero.lead)) ? "pt" : "not-pt"}`,
  );
}

/**
 * The copy button works with no Async Clipboard API in sight — the insecure
 * origin a phone hits. Deleting the API before any page script runs reproduces
 * that environment inside a secure context.
 */
async function checkCopyWithoutClipboardApi(browser, baseUrl) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    window.__copied = [];
    document.addEventListener(
      "copy",
      () => {
        window.__copied.push(String(document.getSelection?.() ?? ""));
      },
      true,
    );
  });

  await page.goto(`${baseUrl}/es`, { waitUntil: "load" });
  await page.waitForSelector("#copy-address");

  const email = (await page.textContent("#contact .bigmail"))?.trim() ?? "";
  await page.click("#copy-address");
  await page.waitForTimeout(300);

  const state = await page.evaluate(() => ({
    copied: window.__copied,
    label: document.querySelector("#copy-address")?.textContent?.trim() ?? "",
    announcement:
      document.querySelector('#contact [role="status"]')?.textContent?.trim() ?? "",
    strayTextareas: document.querySelectorAll("textarea").length,
  }));

  record(
    "copy button still has no Async Clipboard API in this run",
    await page.evaluate(() => !navigator.clipboard),
    "navigator.clipboard undefined",
  );

  record(
    "copy button puts the address on the clipboard",
    email.length > 0 && state.copied.length === 1 && state.copied[0] === email,
    state.copied.length === 0
      ? "no copy event fired"
      : `copied "${state.copied[0]}" (expected "${email}")`,
  );

  record(
    "copy button confirms with the copied copy, not the manual fallback",
    state.label === es.contact.copied &&
      state.announcement === es.contact.copiedAnnouncement &&
      state.strayTextareas === 0,
    `label="${state.label}" · status="${state.announcement}" · stray textareas=${state.strayTextareas}`,
  );

  await context.close();
}

/* -------------------------------------------------------------------- main */

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  let server = null;

  if (!(await isListening(args.url))) {
    console.log(`[e2e:runtime] no server on ${args.url} — starting next dev\n`);
    server = spawn(
      process.execPath,
      [
        path.join(ROOT, "node_modules", "next", "dist", "bin", "next"),
        "dev",
        "-p",
        String(new URL(args.url).port || 3000),
      ],
      { cwd: ROOT, stdio: "ignore" },
    );
    if (!(await waitForServer(args.url))) {
      throw new Error(`the dev server never answered at ${args.url}`);
    }
  } else {
    console.log(`[e2e:runtime] reusing the server on ${args.url}\n`);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    await checkRequestLocale(args.url);
    await checkSwitcherWins(args.url);
    await checkCopyWithoutClipboardApi(browser, args.url);
  } finally {
    await browser.close();
    if (server) server.kill("SIGTERM");
  }

  const failed = results.filter((result) => !result.ok);
  console.log(
    `\nRESUMEN: ${results.length - failed.length} OK · ${failed.length} FALLA · 0 SALTADO`,
  );
  if (failed.length > 0) process.exitCode = 1;
};

main().catch((error) => {
  console.error(`e2e:runtime — ${error.message}`);
  process.exitCode = 1;
});
