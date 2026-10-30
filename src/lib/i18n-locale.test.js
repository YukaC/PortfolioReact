import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LOCALE,
  htmlLangFromPath,
  parseAcceptLanguage,
  pickLocale,
  toHtmlLang,
} from "../i18n/locale.js";
import { getMessages, lookupMessage } from "../i18n/messages/index.js";

test("the Accept-Language header is ranked by q-value, not by position", () => {
  const ranked = parseAcceptLanguage("en;q=0.4, es-AR, pt-BR;q=0.8");

  assert.deepEqual(
    ranked.map((entry) => [entry.tag, entry.locale, entry.region, entry.quality]),
    [
      ["es-AR", "es", "AR", 1],
      ["pt-BR", "pt", "BR", 0.8],
      ["en", "en", null, 0.4],
    ],
  );
});

test("a missing q-value means 1 and equal weights keep the header order", () => {
  const ranked = parseAcceptLanguage("pt, es");

  assert.deepEqual(
    ranked.map((entry) => [entry.locale, entry.quality]),
    [
      ["pt", 1],
      ["es", 1],
    ],
  );
});

test("the header is case-insensitive and tolerates whitespace around every token", () => {
  const ranked = parseAcceptLanguage("  ES-ar ,  pt-br;q=0.9 ");

  assert.deepEqual(
    ranked.map((entry) => entry.tag),
    ["es-AR", "pt-BR"],
  );
});

test("zero quality, wildcards and unsupported languages are dropped", () => {
  assert.deepEqual(parseAcceptLanguage("de-DE, *;q=0.5, es;q=0"), []);
});

test("an empty or missing header yields no candidates", () => {
  for (const header of [undefined, null, "", "   "]) {
    assert.deepEqual(parseAcceptLanguage(header), [], `header ${JSON.stringify(header)}`);
  }
});

test("a numeric region subtag (UN M49) keeps the language and drops the region", () => {
  const [entry] = parseAcceptLanguage("es-419");

  assert.deepEqual([entry.locale, entry.region, entry.tag], ["es", null, "es"]);
});

test("explicit ?lang= wins, then the cookie, then the header, then English", () => {
  const header = "es-AR,es;q=0.9,en;q=0.8";

  assert.equal(
    pickLocale({ queryLocale: "pt", cookieLocale: "es", acceptLanguage: header }).locale,
    "pt",
  );
  assert.equal(
    pickLocale({ cookieLocale: "es", acceptLanguage: header }).locale,
    "es",
  );
  assert.equal(pickLocale({ acceptLanguage: header }).tag, "es-AR");
  assert.equal(pickLocale({}).locale, DEFAULT_LOCALE);
});

test("the query candidate must be a supported locale to win", () => {
  const picked = pickLocale({
    queryLocale: "de",
    cookieLocale: "pt-BR",
    acceptLanguage: "en-US",
  });

  assert.deepEqual([picked.locale, picked.region, picked.source], ["pt", "BR", "cookie"]);
});

test("an unknown Accept-Language falls back to English", () => {
  for (const acceptLanguage of ["de-DE,de;q=0.9", "xx", ""]) {
    const picked = pickLocale({ acceptLanguage });
    assert.deepEqual([picked.locale, picked.tag], ["en", "en"]);
  }
});

test("toHtmlLang keeps the region only when there is a real one", () => {
  assert.equal(toHtmlLang("es", "AR"), "es-AR");
  assert.equal(toHtmlLang("pt", "br"), "pt-BR");
  assert.equal(toHtmlLang("es", null), "es");
  assert.equal(toHtmlLang("es", undefined), "es");
  assert.equal(toHtmlLang("de", "DE"), "en");
});

test("the path decides the base language of a prerendered page", () => {
  assert.equal(htmlLangFromPath("/"), "en");
  assert.equal(htmlLangFromPath("/es"), "es");
  assert.equal(htmlLangFromPath("/pt/"), "pt");
  assert.equal(htmlLangFromPath("/es-AR"), "es-AR");
  assert.equal(htmlLangFromPath(undefined), "en");
});

test("messages fall back to English key by key", () => {
  assert.equal(lookupMessage(getMessages("es"), "work.viewDemo"), "Ver demo");
  assert.equal(lookupMessage(getMessages("pt"), "work.viewDemo"), "Ver demo");
  assert.equal(lookupMessage(getMessages("en"), "work.viewDemo"), "View demo");
  // An unknown locale still resolves to the English dictionary.
  assert.equal(lookupMessage(getMessages("de"), "work.viewDemo"), "View demo");
  assert.equal(lookupMessage(getMessages("es"), "work.missing"), undefined);
});

test("every key of the English dictionary exists in Spanish and Portuguese", () => {
  const keys = (value, prefix = "") =>
    Object.entries(value).flatMap(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return child && typeof child === "object" && !Array.isArray(child)
        ? keys(child, path)
        : [path];
    });

  const en = keys(getMessages("en"));

  for (const locale of ["es", "pt"]) {
    const messages = getMessages(locale);
    const missing = en.filter((key) => lookupMessage(messages, key) === undefined);
    assert.deepEqual(missing, [], `${locale} is missing ${missing.join(", ")}`);
  }
});
