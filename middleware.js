import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  DEFAULT_LOCALE,
  QUERY_PARAM,
  pickLocale,
  toHtmlLang,
} from "./src/i18n/locale.js";

/**
 * Language resolution at the edge.
 *
 * The site is prerendered once per language (`/`, `/es`, `/pt`), so the visitor
 * gets translated HTML on the first byte — no client-side swap and no flash.
 * This middleware only decides *which* prerendered page answers `/`:
 *
 *   1. `?lang=` (the switcher's hard navigation) wins, so the choice always applies;
 *   2. then the remembered cookie;
 *   3. then the browser's `Accept-Language`;
 *   4. then English.
 *
 * A non-English answer is an internal rewrite to `/${locale}`: the URL bar keeps
 * `/` and the language is never part of the public address. The decision also
 * travels to the server as `x-pf-locale` / `x-pf-html-lang`, which is what
 * `_document` reads for `<html lang>`.
 */

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // one year
const LOCALE_ROUTES = new Set(["es", "pt"]);

function serializeLocaleCookie(tag) {
  return `${COOKIE_NAME}=${encodeURIComponent(tag)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** Forward the decision to the page render as request headers. */
function requestHeadersWithLocale(request, locale, htmlLang) {
  const headers = new Headers(request.headers);
  headers.set("x-pf-locale", locale);
  headers.set("x-pf-html-lang", htmlLang);

  return headers;
}

/** `/es` and `/pt` already declare their language in the path. */
function localeFromPath(pathname) {
  const [segment] = pathname.split("/").filter(Boolean);
  return LOCALE_ROUTES.has(segment) ? segment : null;
}

/**
 * Resolve the language for this request.
 *
 * A direct visit to `/es` keeps Spanish and only borrows the region, so the
 * cookie never contradicts the page the visitor is actually on.
 */
function resolveLocale(pathname, searchParams, request) {
  const cookieLocale = request.cookies.get(COOKIE_NAME)?.value;
  const acceptLanguage = request.headers.get("accept-language");
  const pathLocale = localeFromPath(pathname);

  if (pathLocale) {
    const borrowed = pickLocale({ cookieLocale, acceptLanguage });
    const region = borrowed.locale === pathLocale ? borrowed.region : null;

    return { locale: pathLocale, region, tag: toHtmlLang(pathLocale, region) };
  }

  return pickLocale({
    // Only `/` can be rewritten, so `?lang=` is read there and nowhere else.
    queryLocale: pathname === "/" ? searchParams.get(QUERY_PARAM) : null,
    cookieLocale,
    acceptLanguage,
  });
}

export function middleware(request) {
  const { pathname, searchParams } = request.nextUrl;
  const chosen = resolveLocale(pathname, searchParams, request);

  const { locale } = chosen;
  const htmlLang = toHtmlLang(chosen.locale, chosen.region);
  const shouldRewrite = pathname === "/" && locale !== DEFAULT_LOCALE;

  const url = request.nextUrl.clone();
  if (shouldRewrite) url.pathname = `/${locale}`;
  // The rewrite target must be the clean prerendered page, so a one-off
  // `?lang=` never leaks into the rendered URL.
  url.searchParams.delete(QUERY_PARAM);

  const headers = requestHeadersWithLocale(request, locale, htmlLang);
  const response = shouldRewrite
    ? NextResponse.rewrite(url, { request: { headers } })
    : NextResponse.next({ request: { headers } });

  // Persist the detected or selected tag (`es-AR`) so the next visit skips
  // detection and the client can refine `<html lang>` to the region.
  response.headers.append("Set-Cookie", serializeLocaleCookie(htmlLang));
  // The answer depends on these two inputs; keep caches honest.
  response.headers.append("Vary", "Accept-Language, Cookie");
  response.headers.set("Content-Language", locale);

  return response;
}

export const config = {
  // Skip framework internals, the API, SEO files and anything with an extension
  // (images, fonts, the manifest) — none of them carry a language.
  matcher: ["/((?!_next/|api/|robots\\.txt|sitemap\\.xml|.*\\.[^/]+$).*)"],
};
