import "@/styles/globals.css";
import { Fraunces, Manrope, Space_Grotesk } from "next/font/google";

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

export const metadata = {
  title: "Page not found — Agustín Ciucani",
  description: "The page you asked for does not exist.",
};

/**
 * 404 for the whole site.
 *
 * `pages/404.jsx` never existed: the Pages Router used its own grey page and the
 * audit's map only recorded the gap. The App Router's plain `not-found.jsx` is
 * not an option here for one reason: this site has two root layouts (`(en)` and
 * `(intl)/[lang]`, because `<html lang>` belongs to the route) and a not-found is
 * rendered *inside* a root layout, so there is no single tree to hang it from.
 * `global-not-found.jsx` is the documented answer for that case — it bypasses
 * the layouts, which is why it renders the whole document and imports the
 * stylesheet and the fonts itself.
 *
 * It is deliberately the smallest page in the site: no island, no field, no
 * script. The ink background, the type scale and one action are the house
 * vocabulary; the work, the about section and the contact address are one click
 * away, which is what a 404 is for.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en" dir="ltr">
      <body>
        <div
          className={`${manrope.variable} ${spaceGrotesk.variable} ${fraunces.variable} root-layout`}
        >
          <main
            id="main-content"
            className="flex min-h-svh w-full flex-col items-center justify-center"
          >
            <section className="relative flex min-h-svh items-center pt-[8.125rem] pb-[4.375rem]">
              <div className="site-shell">
                <span className="eyebrow">404</span>
                <h1 className="hero-title">Page not found</h1>
                <p className="lead">
                  The address you followed does not exist — or it moved. The
                  work, the about section and the contact address are all one
                  page away.
                </p>
                <div className="relative mt-10">
                  <div>
                    <div className="mt-[2.375rem] flex flex-wrap gap-3">
                      {/* A plain anchor, not `next/link`: this document is
                          rendered *outside* the app tree (`global-not-found`
                          bypasses the root layouts), so there is no router
                          context to navigate with, and a 404 has nothing to
                          prefetch. */}
                      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                      <a href="/" className="btn btn-solid focus-ring">
                        Back to the start
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </body>
    </html>
  );
}
