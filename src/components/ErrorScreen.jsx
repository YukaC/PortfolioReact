import "@/styles/globals.css";
import { Fraunces, Manrope, Space_Grotesk } from "next/font/google";
import FieldIdentity from "@/components/FieldIdentity";
import SplitHeading from "@/components/SplitHeading";

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

/** The footer wordmark's serif is not used here, but the CSS stack names it:
 * declaring the variable keeps the cascade identical to every other page. */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["italic"],
  display: "swap",
  preload: false,
});

/** The home of a locale, as the rest of the site spells it (`homePath`). */
export const homeHref = (locale) => (locale === "en" ? "/" : `/${locale}`);

/**
 * The whole document of an error screen: 404 (`global-not-found`) and 500
 * (`global-error`).
 *
 * Both bypass the root layouts — this site has two of them, because `<html lang>`
 * belongs to the route — so they render `<html>` themselves and import the
 * stylesheet and the fonts here.
 *
 * The field is the identity layer only: the cobalt gradient, the coral lattice
 * and its strikes, all CSS. No smoke, no island, no motion channel — an error
 * page has to paint even when the thing that failed is the script. The heading
 * is the hero's statement recipe, so the accent reads in sky like it does on
 * the home page.
 */
const ErrorScreen = ({ lang, code, title, accent, lead, children }) => (
  <html lang={lang} dir="ltr">
    <body>
      <div
        className={`${manrope.variable} ${spaceGrotesk.variable} ${fraunces.variable} root-layout`}
      >
        <div
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-ink"
          aria-hidden="true"
        >
          <div className="bocanada-field absolute inset-0" />
          <FieldIdentity />
          <div className="field-grain" />
        </div>

        <main
          id="main-content"
          className="relative z-main flex min-h-svh w-full items-center py-24"
        >
          <div className="site-shell hero-copy">
            <span className="eyebrow">{code}</span>
            <SplitHeading
              as="h1"
              className="mt-6 font-heading text-statement text-paper wide:text-hero-statement wide:leading-[1.08]"
              text={title}
              accent={accent}
            />
            <p className="lead mt-6">{lead}</p>
            <div className="mt-10 flex flex-wrap gap-3">{children}</div>
          </div>
        </main>
      </div>
    </body>
  </html>
);

export default ErrorScreen;
