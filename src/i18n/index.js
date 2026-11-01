/**
 * Copy lookup, for the server and for the client.
 *
 * The dictionaries are plain objects (`src/i18n/messages/*.js`), so nothing
 * about reading them needs React — and that is the whole reason this module
 * exists: a Server Component cannot read a context, but it can ask the same
 * dictionary the client asks, with the same fallback to English for a missing
 * key. One translator, two callers, no second copy of the copy.
 *
 * Nothing here imports React, touches the DOM or holds state, so it is safe in
 * either graph. `LocaleProvider` adds the *context* (and the `<html lang>`
 * region refinement) on top of this.
 */
import { getMessages, lookupMessage } from "./messages/index.js";
import { DEFAULT_LOCALE, normalizeLocale } from "./locale.js";

/** Replace `{name}` placeholders with the values the caller passes in. */
export function interpolate(text, values) {
  if (!values) return text;

  return text.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : match,
  );
}

/**
 * Translator for one locale.
 *
 * @param {unknown} locale
 * @returns {{ locale: string, messages: object, t: (key: string, values?: Record<string, unknown>) => any }}
 */
export function translator(locale) {
  const resolved = normalizeLocale(locale)?.locale ?? DEFAULT_LOCALE;
  const messages = getMessages(resolved);

  const t = (key, values) => {
    const message = lookupMessage(messages, key);
    if (typeof message === "string") return interpolate(message, values);
    return message === undefined ? key : message;
  };

  return { locale: resolved, messages, t };
}
