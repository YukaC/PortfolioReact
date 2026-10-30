import { useRef } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Head from "next/head";
import AppBackground from "./AppBackground";
import SiteJsonLd from "./SiteJsonLd";
import { useIntroTimeline } from "@/hooks/useIntroTimeline";
import { useFieldMotion } from "@/hooks/useFieldMotion";
import { usePointerLight } from "@/hooks/usePointerLight";
import { useRevealOnEnter } from "@/hooks/useRevealOnEnter";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";
import {
  PERSON_LOCALITY,
  PERSON_REGION,
  SITE_URL,
} from "@/data/constants";
import { useT } from "@/i18n/LocaleProvider";

/** Open Graph locales for the three translated pages. */
const OG_LOCALES = { en: "en_US", es: "es_AR", pt: "pt_BR" };

const Layout = ({ children, title, description, projects = [] }) => {
  const { locale, t } = useT();
  const pageTitle = title ?? t("meta.title");
  const pageDescription = description ?? t("meta.description");
  const pageUrl = locale === "en" ? SITE_URL : `${SITE_URL}/${locale}`;

  const rootRef = useRef(null);
  useSmoothScroll();
  useFieldMotion();
  usePointerLight();
  useRevealOnEnter();
  useIntroTimeline(rootRef);

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="author" content="Agustin Ciucani" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="geo.region" content={PERSON_REGION} />
        <meta name="geo.placename" content={PERSON_LOCALITY} />
        <meta name="geo.position" content="-34.6037;-58.3816" />
        <meta name="ICBM" content="-34.6037, -58.3816" />
        <link rel="canonical" href={pageUrl} />
        <link rel="alternate" hrefLang="en" href={SITE_URL} />
        <link rel="alternate" hrefLang="es" href={`${SITE_URL}/es`} />
        <link rel="alternate" hrefLang="pt" href={`${SITE_URL}/pt`} />
        <link rel="alternate" hrefLang="x-default" href={SITE_URL} />
        <meta property="og:locale" content={OG_LOCALES[locale] ?? OG_LOCALES.en} />
        {locale !== "es" ? (
          <meta property="og:locale:alternate" content="es_AR" />
        ) : null}
        {locale !== "pt" ? (
          <meta property="og:locale:alternate" content="pt_BR" />
        ) : null}
        <meta property="og:site_name" content="Agustin Ciucani" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={`${SITE_URL}/profile-hero.webp`} />
        <meta
          property="og:image:alt"
          content={t("meta.imageAlt")}
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={`${SITE_URL}/profile-hero.webp`} />
        <meta
          name="twitter:image:alt"
          content={t("meta.imageAlt")}
        />
        <link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
        <link
          rel="icon"
          type="image/png"
          sizes="96x96"
          href="/favicon-96x96.png?v=2"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png?v=2"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#060b1a" />
      </Head>
      <SiteJsonLd projects={projects} locale={locale} />

      <div ref={rootRef} className="relative min-h-[100dvh] bg-[#060b1a] text-white">
        <div className="field-progress" aria-hidden="true">
          <span />
        </div>
        <a href="#main-content" className="skip-link">
          {t("a11y.skipToContent")}
        </a>
        <AppBackground />
        <div className="relative z-10">
          <Navbar />
          <main
            id="main-content"
            className="flex w-full flex-col items-center"
            tabIndex={-1}
          >
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </>
  );
};

export default Layout;
