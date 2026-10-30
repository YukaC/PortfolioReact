/**
 * Locale detection, in one pure place.
 *
 * The middleware, the document shell and the client all need the same answer to
 * "which language is this visitor reading in?", so the decision is a set of pure
 * functions here instead of duplicated logic in the edge runtime and in React.
 * Nothing in this file touches `window`, cookies or headers directly.
 */

/** Languages the site is translated into, in switcher order. */
export const SUPPORTED_LOCALES = ["en", "es", "pt"];

/** English is the source language: every missing translation falls back to it. */
export const DEFAULT_LOCALE = "en";

/** Human-readable names, used by the switcher for `lang`/`aria-label` values. */
export const LOCALE_LABELS = { en: "English", es: "Español", pt: "Português" };

/** Tags suggested by the visitor's own browser configuration. */
export const QUERY_PARAM = "lang";
export const COOKIE_NAME = "pf_locale";

const REGION_PATTERN = /^[a-z]{2}$/i;

/**
 * Normalize a language tag (`es-AR`, `ES_ar`, `es`) to a supported locale.
 *
 * The region survives only when it is a two-letter subtag: `es-AR` keeps `AR`,
 * while a numeric UN M49 code like `es-419` keeps the language and drops the
 * region, because there is no exact HTML tag for it.
 *
 * @param {unknown} value
 * @returns {{ locale: string, region: string|null, tag: string } | null}
 */
export function normalizeLocale(value) {
  if (typeof value !== "string") return null;

  const cleaned = value.trim().replace(/_/g, "-");
  if (!cleaned) return null;

  const [languagePart, regionPart] = cleaned.split("-");
  const locale = languagePart.toLowerCase();
  if (!SUPPORTED_LOCALES.includes(locale)) return null;

  const region =
    regionPart && REGION_PATTERN.test(regionPart)
      ? regionPart.toUpperCase()
      : null;

  return { locale, region, tag: region ? `${locale}-${region}` : locale };
}

/**
 * Parse an `Accept-Language` header into supported candidates, best first.
 *
 * Entries are ranked by quality (a missing `q` means 1), keeping the header
 * order on ties. Wildcards, `q=0` and unsupported languages are dropped because
 * none of them can choose a translation.
 *
 * @param {string|null|undefined} header
 * @returns {Array<{ locale: string, region: string|null, tag: string, quality: number }>}
 */
export function parseAcceptLanguage(header) {
  if (typeof header !== "string" || !header.trim()) return [];

  const candidates = [];

  for (const part of header.split(",")) {
    const [rawTag, ...parameters] = part.split(";").map((token) => token.trim());
    if (!rawTag || rawTag === "*") continue;

    let quality = 1;
    for (const parameter of parameters) {
      const [name, rawValue] = parameter.split("=").map((token) => token.trim());
      if (name?.toLowerCase() !== "q") continue;
      const parsed = Number.parseFloat(rawValue);
      quality = Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0;
    }
    if (quality <= 0) continue;

    const normalized = normalizeLocale(rawTag);
    if (!normalized) continue;

    candidates.push({ ...normalized, quality });
  }

  // Array.prototype.sort is stable, so equal weights keep the header order.
  return candidates.sort((a, b) => b.quality - a.quality);
}

/**
 * Decide the locale for one request.
 *
 * An explicit `?lang=` is the visitor's freshest intent (the switcher navigates
 * with it, so it has to beat a cookie written earlier), then the remembered
 * choice, then the browser header, then English.
 *
 * @param {{ cookieLocale?: unknown, queryLocale?: unknown, acceptLanguage?: unknown }} [sources]
 * @returns {{ locale: string, region: string|null, tag: string, source: "query"|"cookie"|"header"|"default" }}
 */
export function pickLocale({ cookieLocale, queryLocale, acceptLanguage } = {}) {
  const fromQuery = normalizeLocale(queryLocale);
  if (fromQuery) return { ...fromQuery, source: "query" };

  const fromCookie = normalizeLocale(cookieLocale);
  if (fromCookie) return { ...fromCookie, source: "cookie" };

  const [fromHeader] = parseAcceptLanguage(acceptLanguage);
  if (fromHeader) return { ...fromHeader, source: "header" };

  return { locale: DEFAULT_LOCALE, region: null, tag: DEFAULT_LOCALE, source: "default" };
}

/**
 * The `lang` attribute value: the full tag when a region is known.
 *
 * @param {unknown} locale
 * @param {unknown} region
 * @returns {string}
 */
export function toHtmlLang(locale, region) {
  const normalized = normalizeLocale(
    typeof region === "string" && region ? `${locale}-${region}` : locale,
  );

  return normalized ? normalized.tag : DEFAULT_LOCALE;
}

/**
 * Base language of a prerendered route (`/`, `/es`, `/pt`).
 *
 * A pre-built HTML file cannot know the visitor's region, so the served document
 * carries the base tag and the region is refined on the client.
 *
 * @param {unknown} pathname
 * @returns {string}
 */
export function htmlLangFromPath(pathname) {
  if (typeof pathname !== "string") return DEFAULT_LOCALE;

  const [, firstSegment] = pathname.split("?")[0].split("/");
  const normalized = normalizeLocale(firstSegment);

  return normalized ? normalized.tag : DEFAULT_LOCALE;
}
