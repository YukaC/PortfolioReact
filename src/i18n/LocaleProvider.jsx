import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { getMessages, lookupMessage } from "./messages/index.js";
import {
  COOKIE_NAME,
  DEFAULT_LOCALE,
  normalizeLocale,
  toHtmlLang,
} from "./locale.js";

const LocaleContext = createContext(null);

/** Replace `{name}` placeholders with the values the caller passes in. */
function interpolate(text, values) {
  if (!values) return text;

  return text.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : match,
  );
}

/** Value of a cookie by name, or null. Browser only. */
function readCookie(name) {
  if (typeof document === "undefined") return null;

  for (const chunk of document.cookie.split(";")) {
    const [key, ...rest] = chunk.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }

  return null;
}

/**
 * Locale context for the whole tree.
 *
 * The locale arrives as a page prop from the prerendered page, so the first
 * client render uses exactly the strings the server sent — no `navigator` read
 * during render and therefore no hydration mismatch, and no flash of English.
 *
 * The only thing refined after mount is the `lang` attribute's region: a static
 * HTML file cannot know the visitor's region, so the document ships the base
 * language and this effect upgrades it to the detected tag (`es` → `es-AR`)
 * without touching any visible text.
 *
 * @param {{ locale?: string, children: React.ReactNode }} props
 */
export function LocaleProvider({ locale, children }) {
  const resolved = normalizeLocale(locale)?.locale ?? DEFAULT_LOCALE;

  const value = useMemo(() => {
    const messages = getMessages(resolved);

    const t = (key, values) => {
      const message = lookupMessage(messages, key);
      if (typeof message === "string") return interpolate(message, values);
      return message === undefined ? key : message;
    };

    return { locale: resolved, messages, t };
  }, [resolved]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    // `pf_locale` holds the detected/selected tag (`es-AR`); it only refines the
    // current document when it belongs to the page's own language.
    const detected = normalizeLocale(readCookie(COOKIE_NAME));
    if (!detected || detected.locale !== resolved) return;

    const htmlLang = toHtmlLang(detected.locale, detected.region);
    if (document.documentElement.lang !== htmlLang) {
      document.documentElement.lang = htmlLang;
    }
  }, [resolved]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

/**
 * Translation access for client and server components.
 *
 * @returns {{ locale: string, messages: object, t: (key: string, values?: Record<string, unknown>) => any }}
 */
export function useT() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useT() must be used inside <LocaleProvider>");
  }

  return context;
}

export { interpolate, readCookie };
