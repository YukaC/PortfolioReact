import test from "node:test";
import assert from "node:assert/strict";

import en from "../i18n/messages/en.js";
import es from "../i18n/messages/es.js";
import pt from "../i18n/messages/pt.js";
import { DICTIONARIES, lookupMessage } from "../i18n/messages/index.js";
import { headingWords } from "./heading-accent.js";

/**
 * What this protects: a translation that loses a key looks fine in review and
 * then silently renders English (the documented per-key fallback) inside a
 * Spanish page. These tests are the only place that notices.
 *
 * `footer.tagline` is the one documented exception: it is a quote from the
 * series and stays English in every language, so it is deliberately absent from
 * the translated dictionaries.
 */
const INTENTIONALLY_ENGLISH = ["footer.tagline"];

const flatten = (value, prefix = "", out = []) => {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === "object" && !Array.isArray(child)) {
      flatten(child, path, out);
    } else {
      out.push(path);
    }
  }
  return out;
};

const englishKeys = flatten(en);
const translatedKeys = (dictionary) =>
  flatten(dictionary).filter((key) => !INTENTIONALLY_ENGLISH.includes(key));

const accentSections = ["hero", "work", "about", "contact"];

test("every locale defines exactly the English key set", () => {
  for (const [locale, dictionary] of Object.entries({ es, pt })) {
    const expected = englishKeys.filter(
      (key) => !INTENTIONALLY_ENGLISH.includes(key),
    );
    const actual = translatedKeys(dictionary);

    const missing = expected.filter((key) => !actual.includes(key));
    const extra = actual.filter((key) => !expected.includes(key));

    assert.deepEqual(
      missing,
      [],
      `${locale} is missing these keys and would fall back to English`,
    );
    assert.deepEqual(extra, [], `${locale} defines keys English does not have`);
  }
});

test("every translated string is filled in", () => {
  for (const [locale, dictionary] of Object.entries(DICTIONARIES)) {
    for (const key of flatten(dictionary)) {
      const value = lookupMessage(dictionary, key);
      if (Array.isArray(value)) {
        assert.ok(value.length > 0, `${locale}.${key} is an empty list`);
        for (const item of value) {
          if (typeof item === "string") {
            assert.notEqual(item.trim(), "", `${locale}.${key} has a blank item`);
          }
        }
        continue;
      }
      assert.equal(typeof value, "string", `${locale}.${key} is not a string`);
      assert.notEqual(value.trim(), "", `${locale}.${key} is blank`);
    }
  }
});

test("an emphasised word is a word of its own heading", () => {
  // SplitHeading only emphasises a word it can find in the title, so an accent
  // that drifts from the heading disappears without any build error.
  for (const [locale, dictionary] of Object.entries(DICTIONARIES)) {
    for (const section of accentSections) {
      const title = lookupMessage(dictionary, `${section}.title`);
      const accent = lookupMessage(dictionary, `${section}.accent`);
      assert.equal(
        typeof title,
        "string",
        `${locale}.${section}.title is missing`,
      );
      assert.equal(
        typeof accent,
        "string",
        `${locale}.${section}.accent is missing`,
      );
      const titleWords = headingWords(title);
      for (const word of headingWords(accent)) {
        assert.ok(
          titleWords.includes(word),
          `${locale}.${section}.accent "${word}" does not appear in "${title}"`,
        );
      }
    }
  }
});

test("placeholders survive translation", () => {
  const placeholders = (text) =>
    [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

  for (const key of englishKeys) {
    const source = lookupMessage(en, key);
    if (typeof source !== "string") continue;

    const expected = placeholders(source);
    if (expected.length === 0) continue;

    for (const [locale, dictionary] of Object.entries({ es, pt })) {
      const translated = lookupMessage(dictionary, key);
      if (typeof translated !== "string") continue;
      assert.deepEqual(
        placeholders(translated),
        expected,
        `${locale}.${key} lost a placeholder`,
      );
    }
  }
});

test("punctuation does not hide an emphasised word", () => {
  // The whole point of the shared normaliser: copy carries commas and periods,
  // and an accent that misses them silently loses the emphasis.
  const cases = [
    ["Desarrollo tu software, de punta a punta", "software"],
    ["Contame el problema. Te devuelvo el plan.", "plan."],
    ["Cómo trabajo: una persona, el ciclo completo", "completo"],
  ];

  for (const [title, accent] of cases) {
    assert.ok(
      headingWords(title).includes(headingWords(accent)[0]),
      `"${accent}" should match a word of "${title}"`,
    );
  }
});
