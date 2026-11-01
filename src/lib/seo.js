/**
 * §24 S1–S6 — the findability surface (SEO · GEO · AEO · AIO), as pure data.
 *
 * Everything a crawler reads that is not the markup lives here: the sitemap
 * entries, the Open Graph/Twitter metadata (including the per-language card),
 * the JSON-LD graph, and the four citable Q&A. The rule the audit sets for the
 * whole part is that **nothing is invented**: every URL, date, name and claim
 * below is either read from the project snapshot, taken from
 * `src/data/constants.js`, or taken from the copy dictionaries the visible page
 * already renders. The one exception is the prose that labels the project page
 * (`PROJECT_PAGE_COPY`) and the questions themselves (`FAQ_COPY`), which live
 * here because `src/i18n/messages/` is outside this task's edit surface; both
 * tables are locale-parallel and are asserted for parity in
 * `src/lib/seo.test.js`.
 *
 * Pure on purpose: no React, no `fs`, no request object. The route files
 * (`app/sitemap.js`, `app/robots.js`, `app/llms.txt`, `app/projects.json`,
 * `app/og/[lang].png`) and the page components only assemble what is here, and
 * the unit suite can therefore pin the shapes without a build.
 */
import {
  CONTACT_EMAIL,
  EDUCATION,
  PERSON_COUNTRY,
  PERSON_JOB_TITLE,
  PERSON_LOCALITY,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  SKILLS,
  SOCIAL_LINKS,
} from "../data/constants.js";
import { projectCategories } from "../data/projects.js";
import { interpolate, translator } from "../i18n/index.js";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  normalizeLocale,
} from "../i18n/locale.js";
import { projectSlug } from "./project-slugs.js";

/** The three prerendered documents, in sitemap order. */
export const SITE_LOCALES = SUPPORTED_LOCALES;

/** `og:locale` tags: the region is the audience's, not the document's. */
export const OG_LOCALE_TAGS = { en: "en_US", es: "es_AR", pt: "pt_BR" };

/** The one card size every crawler is told about (S2). */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/** The portrait stays a page asset; it is not the social card any more. */
export const PORTRAIT_PATH = "/profile-hero.webp";

export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** A canonical locale key: a region tag (`es-AR`) normalises to `es`. */
export function localeKey(locale) {
  return normalizeLocale(locale)?.locale ?? DEFAULT_LOCALE;
}

/** Absolute URL of a language's home. `/` is English, by definition. */
export function localeUrl(locale) {
  const key = localeKey(locale);
  return key === DEFAULT_LOCALE ? SITE_URL : `${SITE_URL}/${key}`;
}

/** Absolute URL of a project page in one language. */
export function projectUrl(locale, project) {
  const key = localeKey(locale);
  return `${key === DEFAULT_LOCALE ? SITE_URL : `${SITE_URL}/${key}`}/work/${projectSlug(project)}`;
}

/** Site-relative path of the Open Graph card for a language. */
export function ogImagePath(locale) {
  return `/og/${localeKey(locale)}.png`;
}

export function ogImageUrl(locale) {
  return `${SITE_URL}${ogImagePath(locale)}`;
}

/**
 * What the card *shows*, so `og:image:alt` describes the image that is there
 * instead of the portrait it replaced (S2).
 */
export function ogImageAlt() {
  return `${SITE_NAME}, ${PERSON_JOB_TITLE} in ${PERSON_LOCALITY}`;
}

/**
 * Reciprocal `hreflang` map for the home pages.
 *
 * `x-default` is English: it is what `/` serves without an `Accept-Language`
 * header, and the proxy's rewrite only changes which document answers, never
 * which URL is canonical.
 */
export function homeAlternates() {
  const languages = {};
  for (const locale of SITE_LOCALES) languages[locale] = localeUrl(locale);
  languages["x-default"] = localeUrl(DEFAULT_LOCALE);
  return languages;
}

/** Reciprocal `hreflang` map for one project's three URLs (S6). */
export function projectAlternates(project) {
  const languages = {};
  for (const locale of SITE_LOCALES) languages[locale] = projectUrl(locale, project);
  languages["x-default"] = projectUrl(DEFAULT_LOCALE, project);
  return languages;
}

const otherOgLocales = (key) =>
  SITE_LOCALES.filter((locale) => locale !== key).map((locale) => OG_LOCALE_TAGS[locale]);

/** The Open Graph image descriptor every page shares. */
function ogImage(locale, alt) {
  return {
    url: ogImageUrl(locale),
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    type: "image/png",
    alt,
  };
}

/**
 * The home `<head>`, per language.
 *
 * The fourteen metas the site has always shipped (title, description, author,
 * canonical, the four `hreflang` alternates, the Open Graph block and the
 * Twitter card) are preserved attribute for attribute; S2 changes exactly one
 * thing — the image is now the language's 1200×630 card, with the dimensions
 * declared, instead of the square portrait.
 *
 * @param {string} locale
 * @returns {import("next").Metadata}
 */
export function homeMetadata(locale) {
  const key = localeKey(locale);
  const { t } = translator(key);
  const title = t("meta.title");
  const description = t("meta.description");
  const alt = ogImageAlt();

  return {
    title,
    description,
    alternates: {
      canonical: localeUrl(key),
      languages: homeAlternates(),
    },
    openGraph: {
      locale: OG_LOCALE_TAGS[key],
      alternateLocale: otherOgLocales(key),
      siteName: SITE_NAME,
      title,
      description,
      type: "website",
      url: localeUrl(key),
      images: [ogImage(key, alt)],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage(key, alt)],
    },
  };
}

/**
 * The `<head>` of one project page (S6): its own canonical, the reciprocal
 * alternates of the three language URLs, and the same card.
 */
export function projectMetadata(locale, project) {
  const key = localeKey(locale);
  const url = projectUrl(key, project);
  const title = `${project.title} — ${SITE_NAME}`;
  const description = project.description;
  const alt = ogImageAlt();

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: projectAlternates(project),
    },
    openGraph: {
      locale: OG_LOCALE_TAGS[key],
      alternateLocale: otherOgLocales(key),
      siteName: SITE_NAME,
      title,
      description,
      type: "website",
      url,
      images: [ogImage(key, alt)],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage(key, alt)],
    },
  };
}

/**
 * The sitemap (S1).
 *
 * Three home entries plus one per project per language, every entry carrying
 * the snapshot's `generatedAt` as `lastmod` and the reciprocal alternates —
 * including `x-default`. Next renders `alternates.languages` as
 * `<xhtml:link rel="alternate" hreflang="…">`, which is the encoding the
 * sitemap protocol asks for.
 *
 * @param {{ generatedAt?: string|null, projects?: object[] }} [snapshot]
 */
export function sitemapEntries({ generatedAt = null, projects = [] } = {}) {
  const lastModified = generatedAt ?? undefined;
  const alternates = { languages: homeAlternates() };

  const entries = SITE_LOCALES.map((locale) => ({
    url: localeUrl(locale),
    lastModified,
    changeFrequency: "weekly",
    priority: locale === DEFAULT_LOCALE ? 1 : 0.9,
    alternates,
  }));

  for (const project of projects) {
    const languages = { languages: projectAlternates(project) };
    for (const locale of SITE_LOCALES) {
      entries.push({
        url: projectUrl(locale, project),
        lastModified,
        changeFrequency: "monthly",
        priority: 0.7,
        alternates: languages,
      });
    }
  }

  return entries;
}

/**
 * The snapshot's date, in the reader's language, for a `<time>` element.
 * UTC on purpose: the build's timezone is not a fact about the data.
 */
export function formatSnapshotDate(value, locale = DEFAULT_LOCALE) {
  const timestamp = typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (Number.isNaN(timestamp)) return null;

  return new Intl.DateTimeFormat(localeKey(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

/** "a, b and c" — the locale's own conjunction, never a hard-coded `and`. */
function joinList(items, conjunction) {
  const values = items.filter((item) => typeof item === "string" && item.length > 0);
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  return `${values.slice(0, -1).join(", ")}${conjunction}${values[values.length - 1]}`;
}

/** "Argentina" from the `AR` the constants store, in the reader's language. */
function regionName(locale, code) {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * The labels the project page needs (S6).
 *
 * They live here, next to the Q&A that uses the same locale rule, because
 * `src/i18n/messages/` is outside this task's edit surface. Every locale
 * carries every key; the suite asserts that parity so a missing label is a
 * failing test instead of an English word inside a Spanish page.
 */
export const PROJECT_PAGE_COPY = {
  en: {
    problem: "Problem",
    result: "Result",
    stack: "Stack",
    updated: "Last updated",
    faqTitle: "Questions",
    back: "Back to the work",
  },
  es: {
    problem: "Problema",
    result: "Resultado",
    stack: "Stack",
    updated: "Última actualización",
    faqTitle: "Preguntas",
    back: "Volver al trabajo",
  },
  pt: {
    problem: "Problema",
    result: "Resultado",
    stack: "Stack",
    updated: "Última atualização",
    faqTitle: "Perguntas",
    back: "Voltar ao trabalho",
  },
};

export function projectPageCopy(locale) {
  return PROJECT_PAGE_COPY[localeKey(locale)];
}

/**
 * The four questions and their templates.
 *
 * Only facts the repository already holds are asked about: the stack
 * (`SKILLS`), the place (`PERSON_LOCALITY`), the availability (`hero.status`,
 * the sentence the hero shows) and the training (`EDUCATION`). Nothing else —
 * §26 forbids schema that does not match what is visible, and forbids content
 * generated outside the repository's data.
 */
export const FAQ_COPY = {
  en: {
    skills: "What does {name} work with?",
    based: "Where is {name} based?",
    availability: "Is {name} available for new work?",
    education: "What did {name} study?",
    worksWith: "{name} works with {list}.",
    basedIn: "{name} is based in {locality}, {country}.",
    available: "{status}.",
    studied: "{list}.",
    programme: "{title} at {company} ({period})",
    conjunction: " and ",
  },
  es: {
    skills: "¿Con qué trabaja {name}?",
    based: "¿Dónde está radicado {name}?",
    availability: "¿{name} está disponible para nuevos proyectos?",
    education: "¿Qué estudió {name}?",
    worksWith: "{name} trabaja con {list}.",
    basedIn: "{name} está radicado en {locality}, {country}.",
    available: "{status}.",
    studied: "{list}.",
    programme: "{title} en {company} ({period})",
    conjunction: " y ",
  },
  pt: {
    skills: "Com o que {name} trabalha?",
    based: "Onde está baseado {name}?",
    availability: "{name} está disponível para novos projetos?",
    education: "O que {name} estudou?",
    worksWith: "{name} trabalha com {list}.",
    basedIn: "{name} está baseado em {locality}, {country}.",
    available: "{status}.",
    studied: "{list}.",
    programme: "{title} na {company} ({period})",
    conjunction: " e ",
  },
};

/**
 * The four citable Q&A, in one place (S6).
 *
 * The page renders this array and the `FAQPage` graph is built from the same
 * array, so the visible text and the structured text are the same strings by
 * construction — the 1:1 the audit asks for, not a copy that is kept in sync.
 *
 * @param {string} locale
 * @returns {Array<{ question: string, answer: string }>}
 */
export function faqEntries(locale) {
  const key = localeKey(locale);
  const copy = FAQ_COPY[key];
  const { t } = translator(key);

  const base = { name: SITE_NAME };
  const status = { status: t("hero.status") };
  const skills = joinList(
    SKILLS.map((skill) => skill.name),
    copy.conjunction,
  );
  const programmes = joinList(
    EDUCATION.map((item) =>
      interpolate(copy.programme, {
        title: item.title,
        company: item.company,
        period: item.period,
      }),
    ),
    copy.conjunction,
  );

  return [
    {
      question: interpolate(copy.skills, base),
      answer: interpolate(copy.worksWith, { ...base, list: skills }),
    },
    {
      question: interpolate(copy.based, base),
      answer: interpolate(copy.basedIn, {
        ...base,
        locality: PERSON_LOCALITY,
        country: regionName(key, PERSON_COUNTRY),
      }),
    },
    {
      question: interpolate(copy.availability, base),
      answer: interpolate(copy.available, status),
    },
    {
      question: interpolate(copy.education, base),
      answer: interpolate(copy.studied, { list: programmes }),
    },
  ];
}

/**
 * `EDUCATION` as schema.org.
 *
 * `EducationalOccupationalProgram` carries the training itself (its name, what
 * it covered, and the years as `startDate`/`endDate`), and `provider` names the
 * institution — the two facts the page's timeline shows, in the type the spec
 * asks for.
 */
export function educationProgrammes() {
  return EDUCATION.map((item) => {
    const [start, end] = String(item.period ?? "")
      .split("-")
      .map((part) => part.trim());
    const node = {
      "@type": "EducationalOccupationalProgram",
      name: item.title,
      description: item.description,
      provider: { "@type": "EducationalOrganization", name: item.company },
    };
    if (/^\d{4}$/.test(start ?? "")) node.startDate = start;
    if (/^\d{4}$/.test(end ?? "")) node.endDate = end;
    return node;
  });
}

/** The person, once, with the training the graph used to ignore (S4). */
export function personNode() {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: SITE_NAME,
    jobTitle: PERSON_JOB_TITLE,
    url: SITE_URL,
    email: `mailto:${CONTACT_EMAIL}`,
    image: `${SITE_URL}${PORTRAIT_PATH}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: PERSON_LOCALITY,
      addressCountry: PERSON_COUNTRY,
    },
    sameAs: SOCIAL_LINKS.map((link) => link.href),
    knowsAbout: SKILLS.map((skill) => skill.name),
    knowsLanguage: ["en", "es", "pt"],
    alumniOf: educationProgrammes(),
  };
}

export function websiteNode(locale) {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: `${SITE_NAME} portfolio`,
    description: SITE_DESCRIPTION,
    inLanguage: localeKey(locale),
    publisher: { "@id": PERSON_ID },
  };
}

/**
 * `applicationCategory` from the groups the work list already derives.
 *
 * `projectCategories()` is the site's own reading of a project's tags, so the
 * category is a restatement of data that ships, not a new judgement about the
 * project.
 */
const APPLICATION_CATEGORY_BY_GROUP = {
  pwa: "BusinessApplication",
  systems: "DeveloperApplication",
  react: "WebApplication",
  python: "WebApplication",
};

export function applicationCategoryFor(project) {
  for (const group of projectCategories(project)) {
    const category = APPLICATION_CATEGORY_BY_GROUP[group];
    if (category) return category;
  }
  return "UtilityApplication";
}

/**
 * One project as schema.org (S4).
 *
 * Two types on purpose: `codeRepository` is defined on `SoftwareSourceCode`
 * and `programmingLanguage` on `CreativeWork` (its parent), while
 * `applicationCategory` is defined on `SoftwareApplication`. One node carrying
 * both types lets every property be a real one on the node it belongs to,
 * instead of inventing a property or dropping two of the three the spec names.
 *
 * `@id` is the English URL plus `#project`, so the identifier of a project is
 * stable across the three language pages that describe it; `url` is the page
 * the reader is on.
 */
export function softwareNode(project, locale) {
  const key = localeKey(locale);
  const node = {
    "@type": ["SoftwareApplication", "SoftwareSourceCode"],
    "@id": `${SITE_URL}/work/${projectSlug(project)}#project`,
    name: project.title,
    description: project.description,
    url: projectUrl(key, project),
    codeRepository: project.repoLink,
    programmingLanguage: (project.tags ?? []).map((tag) => ({
      "@type": "ComputerLanguage",
      name: tag,
    })),
    applicationCategory: applicationCategoryFor(project),
    author: { "@id": PERSON_ID },
  };

  if (project.siteUrl) node.sameAs = project.siteUrl;
  if (project.imgSrc) node.image = `${SITE_URL}${project.imgSrc}`;

  return node;
}

/** The `FAQPage` node, built from the same array the page renders (S6). */
export function faqPageNode({ locale, url, faq }) {
  return {
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    url,
    name: projectPageCopy(locale).faqTitle,
    inLanguage: localeKey(locale),
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": PERSON_ID },
    mainEntity: (faq ?? []).map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

/**
 * The JSON-LD graph of one page.
 *
 * The home is a `ProfilePage` whose `mainEntity` is the `Person` (S4); a
 * project page is a `WebPage` whose `mainEntity` is that project, with the
 * `FAQPage` hanging off it as `hasPart`. `dateModified` comes from the
 * snapshot's `generatedAt` on both, because that is the date the facts on the
 * page were last refreshed.
 *
 * @param {{
 *   locale?: string,
 *   url: string,
 *   type?: "ProfilePage"|"WebPage",
 *   name: string,
 *   description?: string,
 *   projects?: object[],
 *   generatedAt?: string|null,
 *   faq?: Array<{ question: string, answer: string }>,
 *   project?: object|null,
 * }} page
 */
export function siteGraph({
  locale = DEFAULT_LOCALE,
  url,
  type = "ProfilePage",
  name,
  description = SITE_DESCRIPTION,
  projects = [],
  generatedAt = null,
  faq = [],
  project = null,
}) {
  const key = localeKey(locale);
  const person = personNode();
  const website = websiteNode(key);
  const projectNode = project ? softwareNode(project, key) : null;

  const page = {
    "@type": type,
    "@id": url,
    url,
    name,
    description,
    inLanguage: key,
    isPartOf: { "@id": website["@id"] },
    about: { "@id": person["@id"] },
    mainEntity: { "@id": projectNode ? projectNode["@id"] : person["@id"] },
    primaryImageOfPage: `${SITE_URL}${PORTRAIT_PATH}`,
  };
  if (generatedAt) page.dateModified = generatedAt;

  const graph = [page, person, website];

  if (projectNode) {
    graph.push(projectNode);
  } else if (projects.length > 0) {
    const itemList = {
      "@type": "ItemList",
      "@id": `${url}#work`,
      name: translator(key).t("work.eyebrow"),
      numberOfItems: projects.length,
      itemListElement: projects.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: softwareNode(item, key),
      })),
    };
    graph.push(itemList);
    page.hasPart = [{ "@id": itemList["@id"] }];
  }

  if (faq.length > 0) {
    const faqPage = faqPageNode({ locale: key, url, faq });
    graph.push(faqPage);
    page.hasPart = [...(page.hasPart ?? []), { "@id": faqPage["@id"] }];
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

/**
 * The page descriptor `PageFrame` hands to `siteGraph`, so the components never
 * have to know the graph's shape.
 */
export function homePageDescriptor(locale) {
  return {
    url: localeUrl(locale),
    type: "ProfilePage",
    name: `${SITE_NAME}, ${PERSON_JOB_TITLE} in ${PERSON_LOCALITY}`,
    description: SITE_DESCRIPTION,
  };
}

export function projectPageDescriptor(locale, project) {
  return {
    url: projectUrl(locale, project),
    type: "WebPage",
    name: `${project.title} — ${SITE_NAME}`,
    description: project.description,
    project,
    faq: faqEntries(locale),
  };
}

/** Site-relative href of a language's home, for in-page links. */
export function homePath(locale) {
  const key = localeKey(locale);
  return key === DEFAULT_LOCALE ? "/" : `/${key}`;
}
