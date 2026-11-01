import "lenis/dist/lenis.css";
import "@/styles/globals.css";
import { Fraunces, Manrope, Space_Grotesk } from "next/font/google";
import { DEFAULT_LOCALE, normalizeLocale } from "@/i18n/locale";
import { PERSON_LOCALITY, PERSON_REGION, SITE_URL } from "@/data/constants";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["500", "600"],
  display: "swap",
});

/** Display serif: the surname wordmark in the footer, and nothing else.
 *
 * Not preloaded. It is a variable italic and the single most expensive font on
 * the page (45 KB), and it is only needed once the reader reaches the footer —
 * preloading it put it ahead of the field on every cold load, which on 3G is
 * almost a second spent on a glyph nobody has scrolled to yet. */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["italic"],
  display: "swap",
  preload: false,
});

/**
 * Marks `html.js` before the content below it is parsed.
 *
 * Every reveal in CSS hangs off that class, so the served HTML is legible on its
 * own and the animation is something JS opts into — the reverse (hiding by
 * default and letting hydration reveal) is what left three headings blank
 * without JS (audit.md §10 P0-1). It sits at the top of `<body>` instead of in
 * `<head>` because the App Router owns the head: a synchronous inline script is
 * still parsed and executed before any markup after it exists, so no reveal can
 * ever match the hidden state in a paint. It is a one-liner with no `eval`, so a
 * future enforcing CSP only needs a hash for it.
 *
 * The script writes a class onto `<html>`, which the server rendered without it:
 * React sees an attribute its own markup does not have and logs a hydration
 * mismatch on every page. `suppressHydrationWarning` on `<html>` is the standard
 * answer (next-themes does the same) — the class is applied before hydration, it
 * is the same class on the server and on the client after it, and there is
 * nothing to reconcile. Suppressing it on that one element silences the warning
 * for `<html>`'s attributes only; the rest of the tree is still diffed.
 */
const MARK_JS = 'document.documentElement.classList.add("js")';

/**
 * Site-wide metadata, in the root layout because it does not depend on the
 * language: whoever reads a page, the author, the coordinates, the icons and the
 * manifest are the same. Everything that changes with the copy (title,
 * description, canonical, hreflang, Open Graph) lives in `generateMetadata` on
 * the route, which is where the locale is known — see `localeMetadata` in
 * `src/components/PageFrame.jsx`.
 *
 * `metadataBase` is what turns the relative icon paths into the absolute URLs
 * today's `next/head` block spelled out by hand.
 */
export const rootMetadata = {
  metadataBase: new URL(SITE_URL),
  authors: [{ name: "Agustín Ciucani" }],
  other: {
    "geo.region": PERSON_REGION,
    "geo.placename": PERSON_LOCALITY,
    "geo.position": "-34.6037;-58.3816",
    ICBM: "-34.6037, -58.3816",
  },
  icons: {
    icon: [
      { url: "/favicon.svg?v=2", type: "image/svg+xml" },
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/favicon-96x96.png?v=2", type: "image/png", sizes: "96x96" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=2", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

/**
 * `theme-color` is the one colour that cannot come from the stylesheet: a meta
 * attribute cannot resolve `var()`, so the hex stays here as the single copy of
 * `--color-ink` outside globals.css. It is a `viewport` export, not `metadata`:
 * Next 16 moved it there.
 */
export const rootViewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#060b1a",
};

/**
 * Document shell: `<html>`, `<body>`, the three font faces and the reveal gate.
 *
 * It is a plain Server Component rather than a layout because the site has two
 * root layouts — `(en)` and `(intl)/[lang]` — and the only thing that differs
 * between them is `<html lang>`. That is the App Router's own answer to "one
 * document, three languages": `lang` belongs to the route, so the prerendered
 * HTML of `/es` already says `es` in its first byte, with no header read and no
 * client correction of the base language.
 *
 * Reading `x-pf-html-lang` here (the header the proxy still sets) would be the
 * one way to make this wrong: `headers()` is a request-time API, and one call in
 * a root layout turns every prerendered route into a per-request render
 * (measured: `ƒ /` in the build output, no `/es`/`/pt` HTML at all, and no ISR
 * window for the snapshot). The region (`es-AR`) is what a static document
 * cannot know, and `LocaleProvider` still refines it on the client without
 * touching a single word.
 */
export default function RootShell({ lang = DEFAULT_LOCALE, children }) {
  const htmlLang = normalizeLocale(lang)?.locale ?? DEFAULT_LOCALE;

  return (
    // `suppressHydrationWarning` is a property of this element's attributes, not
    // of its children: the `js` class the inline script adds above is the one
    // difference React would otherwise report (see MARK_JS).
    <html lang={htmlLang} dir="ltr" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: MARK_JS }} />
        <div
          className={`${manrope.variable} ${spaceGrotesk.variable} ${fraunces.variable} root-layout`}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
