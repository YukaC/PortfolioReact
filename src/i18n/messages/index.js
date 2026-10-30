/**
 * Dictionary resolution.
 *
 * The English dictionary is the base of every locale, so a key that a
 * translation does not define yet returns English instead of an empty string or
 * the raw key. That fallback is deliberate and visible here, not something each
 * component improvises.
 */
import en from "./en.js";
import es from "./es.js";
import pt from "./pt.js";
import { DEFAULT_LOCALE, normalizeLocale } from "../locale.js";

const DICTIONARIES = { en, es, pt };

const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Deep merge where arrays and scalars are replaced wholesale. */
function mergeMessages(base, override) {
  if (!isPlainObject(override)) return override === undefined ? base : override;

  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    merged[key] =
      isPlainObject(value) && isPlainObject(base?.[key])
        ? mergeMessages(base[key], value)
        : value;
  }

  return merged;
}

const cache = new Map();

/**
 * Messages for a locale, merged over English.
 *
 * @param {unknown} locale
 * @returns {object}
 */
export function getMessages(locale) {
  const base = normalizeLocale(locale)?.locale ?? DEFAULT_LOCALE;
  if (base === DEFAULT_LOCALE) return en;

  if (!cache.has(base)) {
    cache.set(base, mergeMessages(en, DICTIONARIES[base]));
  }

  return cache.get(base);
}

/**
 * Read a dotted key (`work.filters.all`) out of a dictionary.
 *
 * @param {object} messages
 * @param {string} key
 * @returns {unknown}
 */
export function lookupMessage(messages, key) {
  if (!isPlainObject(messages) && typeof messages !== "object") return undefined;
  if (typeof key !== "string" || !key) return undefined;

  let current = messages;
  for (const segment of key.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = current[segment];
  }

  return current;
}

export { DICTIONARIES };
