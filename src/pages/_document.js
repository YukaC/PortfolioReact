import NextDocument, { Html, Head, Main, NextScript } from "next/document";
import { DEFAULT_LOCALE, htmlLangFromPath } from "@/i18n/locale";

/**
 * Document shell.
 *
 * `<html lang>` has to be right in the served HTML, before any JavaScript runs,
 * so the language is resolved here and not in a client effect:
 *
 *   1. `x-pf-html-lang`, the full tag the middleware detected (`es-AR`);
 *   2. otherwise the language of the prerendered route (`/es` → `es`), because a
 *      static HTML file cannot know a visitor's region — the client refines the
 *      attribute to the regional tag after mount, without touching any text.
 */
export default function Document({ htmlLang = DEFAULT_LOCALE }) {
  return (
    <Html lang={htmlLang} dir="ltr" className="dark">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

Document.getInitialProps = async (ctx) => {
  const initialProps = await NextDocument.getInitialProps(ctx);

  const header = ctx.req?.headers?.["x-pf-html-lang"];
  const pathname =
    typeof ctx.pathname === "string" && ctx.pathname
      ? ctx.pathname
      : (() => {
          try {
            return new URL(ctx.req?.url ?? "/", "http://localhost").pathname;
          } catch {
            return "/";
          }
        })();

  return {
    ...initialProps,
    htmlLang: typeof header === "string" && header ? header : htmlLangFromPath(pathname),
  };
};
