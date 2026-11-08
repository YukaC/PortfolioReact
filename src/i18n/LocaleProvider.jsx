"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { translator } from "./index.js";
import { COOKIE_NAME, toHtmlLang, normalizeLocale } from "./locale.js";

/**
 * Locale context: the smallest possible island.
 *
 * The strings themselves are not a client concern any more — `src/i18n/index.js`
 * gives the server the same dictionary, and the sections are Server Components
 * now (audit.md §16.2). What is left here is what only a browser can do:
 *
 *   1. hand a Client Component the same strings the server rendered with, so a
 *      drawer, a filter row or a copy button can be translated without a prop
 *      for every label;
 *   2. refine `<html lang>` to the detected *region* (`es` → `es-AR`). A
 *      prerendered document cannot know the visitor's region, so it ships the
 *      base tag and this effect upgrades it without touching a single word.
 *
 * The locale arrives as a prop from the prerendered page, so the first client
 * render uses exactly the strings the server sent: no `navigator` read during
 * render, therefore no hydration mismatch and no flash of English.
 */

const LocaleContext = createContext(null);

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
 * @param {{ locale?: string, children: React.ReactNode }} props
 */
export function LocaleProvider({ locale, children }) {
  const value = useMemo(() => translator(locale), [locale]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    // `pf_locale` holds the detected/selected tag (`es-AR`); it only refines the
    // current document when it belongs to the page's own language.
    const detected = normalizeLocale(readCookie(COOKIE_NAME));
    if (!detected || detected.locale !== value.locale) return;

    const htmlLang = toHtmlLang(detected.locale, detected.region);
    if (document.documentElement.lang !== htmlLang) {
      document.documentElement.lang = htmlLang;
    }
  }, [value.locale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

/**
 * Translation access for Client Components.
 *
 * Server Components use `translator(locale)` from `@/i18n/index.js` instead:
 * a context is not readable across the server/client boundary.
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

export { interpolate } from "./index.js";
export { readCookie };
