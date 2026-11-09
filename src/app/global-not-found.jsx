import { headers } from "next/headers";
import ErrorScreen, { homeHref } from "@/components/ErrorScreen";
import { translator } from "@/i18n/index.js";

/** The proxy (`src/proxy.js`) runs on unknown paths too: it resolves the
 * language from the path prefix, the cookie or `Accept-Language` and hands it
 * over as `x-pf-locale`, so a reader who mistypes `/es/...` gets Spanish. */
async function requestLocale() {
  const { locale } = translator((await headers()).get("x-pf-locale"));
  return locale;
}

export async function generateMetadata() {
  const { t } = translator(await requestLocale());
  return {
    title: `404 — ${t("errors.notFound.title").replace(/\s+/g, " ")}`,
    description: t("errors.notFound.lead"),
    robots: { index: false },
  };
}

/**
 * 404 for the whole site.
 *
 * The App Router's plain `not-found.jsx` is not an option here: this site has
 * two root layouts (`(en)` and `(intl)/[lang]`, because `<html lang>` belongs to
 * the route) and a not-found renders *inside* a root layout, so there is no
 * single tree to hang it from. `global-not-found.jsx` is the documented answer
 * for that case — it bypasses the layouts, which is why `ErrorScreen` renders
 * the whole document.
 */
export default async function GlobalNotFound() {
  const locale = await requestLocale();
  const { t } = translator(locale);

  return (
    <ErrorScreen
      lang={locale}
      code="404"
      title={t("errors.notFound.title")}
      accent={t("errors.notFound.accent")}
      lead={t("errors.notFound.lead")}
    >
      {/* A plain anchor, not `next/link`: this document is rendered outside the
          app tree, so there is no router context to navigate with. */}
      <a href={homeHref(locale)} className="btn btn-solid focus-ring">
        {t("errors.notFound.home")}
      </a>
    </ErrorScreen>
  );
}
