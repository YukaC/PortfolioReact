import "lenis/dist/lenis.css";
import "@/styles/globals.css";
import { Fraunces, Manrope, Space_Grotesk } from "next/font/google";
import { LocaleProvider } from "@/i18n/LocaleProvider";

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
 * The locale comes from the page's own `getStaticProps`, so the provider never
 * guesses on the client: the first render after hydration uses the same
 * dictionary the server used, which is what keeps the HTML and the client in
 * sync and the page flicker-free.
 */
function MyApp({ Component, pageProps }) {
  return (
    <LocaleProvider locale={pageProps.locale}>
      <div
        className={`${manrope.variable} ${spaceGrotesk.variable} ${fraunces.variable} root-layout`}
      >
        <Component {...pageProps} />
      </div>
    </LocaleProvider>
  );
}

export default MyApp;
