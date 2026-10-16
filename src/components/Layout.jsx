import { useRef } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Head from "next/head";
import AppBackground from "./AppBackground";
import SiteJsonLd from "./SiteJsonLd";
import { useIntroTimeline } from "@/hooks/useIntroTimeline";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";
import {
  PERSON_LOCALITY,
  PERSON_REGION,
  SITE_DESCRIPTION,
  SITE_TITLE,
  SITE_URL,
} from "@/data/constants";

const Layout = ({
  children,
  title = SITE_TITLE,
  description = SITE_DESCRIPTION,
  projects = [],
}) => {
  const rootRef = useRef(null);
  useSmoothScroll();
  useIntroTimeline(rootRef);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="author" content="Agustin Ciucani" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="geo.region" content={PERSON_REGION} />
        <meta name="geo.placename" content={PERSON_LOCALITY} />
        <meta name="geo.position" content="-34.6037;-58.3816" />
        <meta name="ICBM" content="-34.6037, -58.3816" />
        <link rel="canonical" href={SITE_URL} />
        <link rel="alternate" hrefLang="en" href={SITE_URL} />
        <link rel="alternate" hrefLang="x-default" href={SITE_URL} />
        <meta property="og:locale" content="en_US" />
        <meta property="og:locale:alternate" content="es_AR" />
        <meta property="og:site_name" content="Agustin Ciucani" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={`${SITE_URL}/profile-hero.webp`} />
        <meta
          property="og:image:alt"
          content="Portrait of Agustin Ciucani, full-stack developer in Buenos Aires"
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={`${SITE_URL}/profile-hero.webp`} />
        <meta
          name="twitter:image:alt"
          content="Portrait of Agustin Ciucani, full-stack developer in Buenos Aires"
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
        <meta name="theme-color" content="#02122d" />
      </Head>
      <SiteJsonLd projects={projects} />

      <div ref={rootRef} className="relative min-h-[100dvh] bg-[#02122d] text-white">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <AppBackground />
        <div className="site-content relative z-10">
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
