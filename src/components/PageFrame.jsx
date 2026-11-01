import About from "@/components/About";
import Contact from "@/components/Contact";
import HeroSection from "@/components/HeroSection";
import Layout from "@/components/Layout";
import Marquee from "@/components/Marquee";
import MotionRoot from "@/components/MotionRoot";
import WorkList from "@/components/WorkList";
import { localizeProjects } from "@/lib/project-i18n";
import {
  CONTACT_EMAIL,
  PERSON_COUNTRY,
  PERSON_JOB_TITLE,
  PERSON_LOCALITY,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  SOCIAL_LINKS,
  SKILLS,
} from "@/data/constants";
import { MAX_PINNED_PROJECTS } from "@/data/projects";
import { getMessages, lookupMessage } from "@/i18n/messages/index.js";

/** Open Graph locales for the three translated pages. */
const OG_LOCALES = { en: "en_US", es: "es_AR", pt: "pt_BR" };

/** The two translated locales, in the order `og:locale:alternate` lists them. */
const TRANSLATED_OG_LOCALES = ["es_AR", "pt_BR"];

/**
 * Server-side copy lookup.
 *
 * `useT` is a React context and a Server Component cannot read one, so the
 * server asks the same dictionaries directly. Same source, same fallback to
 * English for a missing key (`getMessages` merges over `en`), no second copy of
 * the copy.
 *
 * @param {string} locale
 * @returns {(key: string) => string}
 */
function serverT(locale) {
  const messages = getMessages(locale);

  return (key) => {
    const message = lookupMessage(messages, key);
    return typeof message === "string" ? message : key;
  };
}

/** Absolute URL of a locale's page. `/` is English. */
export function localeUrl(locale) {
  return locale === "en" ? SITE_URL : `${SITE_URL}/${locale}`;
}

/**
 * The `<head>` this site used to spell out in `Layout.jsx`, per locale.
 *
 * Fourteen metas, attribute for attribute (audit.md §16.3 A3): title,
 * description, author, canonical, the four `hreflang` alternates, the Open Graph
 * block with its `og:image:alt`, and the Twitter card. The author, the
 * coordinates, the icons and `theme-color` are language-independent and live in
 * `app/layout.jsx`; `metadataBase` there is what makes these URLs absolute.
 *
 * @param {string} locale
 * @returns {import("next").Metadata}
 */
export function localeMetadata(locale) {
  const t = serverT(locale);
  const title = t("meta.title");
  const description = t("meta.description");
  const imageAlt = t("meta.imageAlt");
  const image = `${SITE_URL}/profile-hero.webp`;
  const localeKey = OG_LOCALES[locale] ? locale : "en";

  return {
    title,
    description,
    alternates: {
      canonical: localeUrl(localeKey),
      languages: {
        en: SITE_URL,
        es: `${SITE_URL}/es`,
        pt: `${SITE_URL}/pt`,
        "x-default": SITE_URL,
      },
    },
    openGraph: {
      locale: OG_LOCALES[localeKey],
      // The other languages, exactly as the old `next/head` block listed them:
      // every translated locale but the one being read, so English never
      // appears as an alternate of itself.
      alternateLocale: TRANSLATED_OG_LOCALES.filter(
        (ogLocale) => ogLocale !== OG_LOCALES[localeKey],
      ),
      siteName: SITE_NAME,
      title,
      description,
      type: "website",
      url: localeUrl(localeKey),
      images: [{ url: image, alt: imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image, alt: imageAlt }],
    },
  };
}

/**
 * Structured data, rendered by the server.
 *
 * This is `SiteJsonLd` with the one thing it could not do in the App Router: it
 * is not a Client Component and it does not go through `next/head` (which
 * renders nothing outside the Pages Router and would push the whole graph into
 * the client bundle). The graph is the same one, from the same constants.
 *
 * It is a `<script>` in the body rather than in `<head>` because the App Router
 * owns the head; both positions are valid JSON-LD and every consumer parses the
 * document, not a position.
 */
const PageStructuredData = ({ locale, projects }) => {
  const t = serverT(locale);
  const pinnedProjects = projects.slice(0, MAX_PINNED_PROJECTS);
  const personId = `${SITE_URL}/#person`;
  const websiteId = `${SITE_URL}/#website`;
  const webpageId = `${SITE_URL}/#webpage`;

  const graph = [
    {
      "@type": "Person",
      "@id": personId,
      name: SITE_NAME,
      jobTitle: PERSON_JOB_TITLE,
      url: SITE_URL,
      email: `mailto:${CONTACT_EMAIL}`,
      image: `${SITE_URL}/profile-hero.webp`,
      address: {
        "@type": "PostalAddress",
        addressLocality: PERSON_LOCALITY,
        addressCountry: PERSON_COUNTRY,
      },
      sameAs: SOCIAL_LINKS.map((link) => link.href),
      knowsAbout: SKILLS.map((skill) => skill.name),
      knowsLanguage: ["en", "es", "pt"],
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      url: SITE_URL,
      name: `${SITE_NAME} portfolio`,
      description: SITE_DESCRIPTION,
      inLanguage: locale,
      publisher: { "@id": personId },
    },
    {
      "@type": "WebPage",
      "@id": webpageId,
      url: SITE_URL,
      name: `${SITE_NAME}, ${PERSON_JOB_TITLE} in ${PERSON_LOCALITY}`,
      description: SITE_DESCRIPTION,
      inLanguage: locale,
      isPartOf: { "@id": websiteId },
      about: { "@id": personId },
      primaryImageOfPage: `${SITE_URL}/profile-hero.webp`,
    },
  ];

  if (pinnedProjects.length > 0) {
    graph.push({
      "@type": "ItemList",
      "@id": `${SITE_URL}/#work`,
      name: t("work.eyebrow"),
      numberOfItems: pinnedProjects.length,
      itemListElement: pinnedProjects.map((project, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "SoftwareSourceCode",
          name: project.title,
          description: project.description,
          url: project.repoLink,
          codeRepository: project.repoLink,
          author: { "@id": personId },
        },
      })),
    });
  }

  const json = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph,
  }).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
};

/**
 * The home composition, on the server.
 *
 * Five sections, one per beat of the page. All five are Server Components: the
 * copy is in the HTML, the reveals are CSS, and each one embeds the single small
 * island it actually needs (`HeroActions`, `MarqueeMotion`, `WorkFilters`,
 * `AboutScroll`, `CopyButton`). That is the shape audit.md §16.2 asks for, and it
 * is the shape that pays for the migration — the static text stops being client
 * JavaScript.
 *
 * Project copy is localized here, once, with the same pure helper the client used
 * to call, so the rows the island filters are already in the reader's language.
 */
const HomeSections = ({ locale, projects }) => {
  const localized = localizeProjects(projects, locale);

  return (
    <>
      <HeroSection locale={locale} />
      <Marquee locale={locale} />
      <WorkList projects={localized} locale={locale} />
      <About locale={locale} />
      <Contact locale={locale} />
    </>
  );
};

/**
 * Frame every page shares: metadata, structured data, the shell and the page's
 * own content — all server-rendered, with `MotionRoot` as the one client island
 * around them (audit.md §16.2).
 *
 * `children` lets a route that is not the home composition (the 404) reuse the
 * shell without pulling the sections in.
 */
const PageFrame = ({ locale = "en", projects = [], children = null }) => (
  <>
    <PageStructuredData locale={locale} projects={projects} />
    <MotionRoot locale={locale}>
      <Layout locale={locale}>
        {children ?? <HomeSections locale={locale} projects={projects} />}
      </Layout>
    </MotionRoot>
  </>
);

export default PageFrame;
