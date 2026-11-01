import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTACT_EMAIL,
  EDUCATION,
  PERSON_JOB_TITLE,
  PERSON_LOCALITY,
  SITE_NAME,
  SITE_URL,
  SKILLS,
  SOCIAL_LINKS,
} from "../data/constants.js";
import { translator } from "../i18n/index.js";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../i18n/locale.js";
import {
  SLUG_PATTERN,
  findProjectBySlug,
  projectPath,
  projectSlug,
  repoName,
} from "./project-slugs.js";
import {
  FAQ_COPY,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  PORTRAIT_PATH,
  PROJECT_PAGE_COPY,
  applicationCategoryFor,
  faqEntries,
  formatSnapshotDate,
  homeAlternates,
  homeMetadata,
  homePageDescriptor,
  localeUrl,
  ogImageUrl,
  projectAlternates,
  projectMetadata,
  projectPageCopy,
  projectPageDescriptor,
  projectUrl,
  sitemapEntries,
  siteGraph,
  softwareNode,
} from "./seo.js";

/**
 * §24 S1–S6, as a property of the sources alone.
 *
 * The findability work is metadata, a sitemap and a JSON-LD graph, and the one
 * way it goes wrong is silently: a sitemap that loses a language, a canonical
 * that points at the wrong URL, a `FAQPage` whose text is not the text on the
 * page, or a schema node holding a URL from somewhere nobody checked. None of
 * that shows up in a screenshot, so it is pinned here:
 *
 *   1. slug derivation (S6): the repository name, unique, URL-safe;
 *   2. the sitemap (S1): three homes + one entry per project per language,
 *      `lastmod` from the snapshot, reciprocal alternates including x-default;
 *   3. the Q&A (S6): four questions from the repository's own data, and the
 *      visible array and the `FAQPage` node holding the *same strings*;
 *   4. the graph (S4): parses, every property and type is a real schema.org
 *      one, and every URL comes from the snapshot or the config;
 *   5. the `<head>` (S2, S3): the language's canonical, the reciprocal
 *      hreflang map, and the 1200×630 card that replaced the square portrait.
 *
 * The last tests are PRESERVE: the metadata block and the graph nodes the site
 * already shipped keep every field they had.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const snapshot = JSON.parse(
  readFileSync(path.join(ROOT, "src/data/pinned-projects.json"), "utf8"),
);
const projects = snapshot.projects;

/** Every node of a graph, depth first, in document order. */
function nodesOf(value, found = []) {
  if (Array.isArray(value)) {
    for (const item of value) nodesOf(item, found);
    return found;
  }
  if (value && typeof value === "object") {
    if (typeof value["@type"] === "string" || Array.isArray(value["@type"])) {
      found.push(value);
    }
    for (const child of Object.values(value)) nodesOf(child, found);
  }
  return found;
}

/**
 * Every string that behaves like a URL, anywhere in the graph.
 *
 * `@context` is skipped: `https://schema.org` is the vocabulary's identifier,
 * not an address the site publishes.
 */
function urlsOf(value, found = []) {
  if (typeof value === "string") {
    if (/^(?:https?|mailto):/.test(value)) found.push(value);
    return found;
  }
  if (Array.isArray(value)) {
    for (const item of value) urlsOf(item, found);
    return found;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "@context") continue;
      urlsOf(child, found);
    }
  }
  return found;
}

// ——— 1. slug derivation (S6) ——————————————————————————————————————————————

test("every project has one URL, and it is the repository name", () => {
  const slugs = projects.map((project) => projectSlug(project));
  assert.deepEqual(
    slugs,
    projects.map((project) => project.name),
    "the slug must be the identifier the snapshot already validates",
  );
  assert.equal(new Set(slugs).size, slugs.length, "two projects cannot share a URL");

  for (const project of projects) {
    const slug = projectSlug(project);
    assert.match(slug, SLUG_PATTERN, `${slug} is not URL-safe`);
    assert.equal(projectPath("en", project), `/work/${slug}`);
    assert.equal(projectPath("es", project), `/es/work/${slug}`);
    assert.equal(projectPath("pt", project), `/pt/work/${slug}`);
  }
});

test("the slug falls back to the repository URL and refuses to invent one", () => {
  assert.equal(repoName("https://github.com/YukaC/PortfolioReact"), "PortfolioReact");
  assert.equal(repoName("https://github.com/YukaC/PortfolioReact.git"), "PortfolioReact");
  assert.equal(repoName("not a url"), "");

  // A name the snapshot would reject still has a derivable URL.
  assert.equal(
    projectSlug({ name: "Portfolio React!", repoLink: "https://github.com/YukaC/PortfolioReact" }),
    "PortfolioReact",
  );
  // `..` is a path traversal, not a slug.
  for (const name of ["..", ".", "-leading", ""]) {
    assert.throws(
      () => projectSlug({ name, repoLink: "javascript:alert(1)" }),
      /project-slugs/,
      `${JSON.stringify(name)} must not become a URL`,
    );
  }
});

test("the closed set of routes and the lookup inside a route agree", () => {
  for (const project of projects) {
    assert.equal(findProjectBySlug(projects, projectSlug(project)), project);
  }
  assert.equal(findProjectBySlug(projects, "no-such-repo"), null);
  assert.equal(findProjectBySlug(projects, "../etc/passwd"), null);
});

// ——— 2. the sitemap (S1) ——————————————————————————————————————————————————

test("the sitemap carries three homes and every project in every language", () => {
  const entries = sitemapEntries({ generatedAt: snapshot.generatedAt, projects });
  const expected = SUPPORTED_LOCALES.length + projects.length * SUPPORTED_LOCALES.length;

  assert.equal(entries.length, expected);
  assert.equal(entries.length, 3 + 18);

  const locs = entries.map((entry) => entry.url);
  assert.deepEqual(locs.slice(0, 3), [
    SITE_URL,
    `${SITE_URL}/es`,
    `${SITE_URL}/pt`,
  ]);
  assert.equal(new Set(locs).size, locs.length, "a sitemap cannot list a URL twice");

  for (const project of projects) {
    for (const locale of SUPPORTED_LOCALES) {
      assert.ok(
        locs.includes(projectUrl(locale, project)),
        `${project.name} has no ${locale} URL in the sitemap`,
      );
    }
  }
});

test("every sitemap entry has the snapshot date and reciprocal alternates", () => {
  const entries = sitemapEntries({ generatedAt: snapshot.generatedAt, projects });

  for (const entry of entries) {
    assert.equal(entry.lastModified, snapshot.generatedAt);
    assert.ok(
      Number.isFinite(Date.parse(entry.lastModified)),
      `${entry.url} has no valid lastmod`,
    );

    const languages = entry.alternates.languages;
    assert.deepEqual(Object.keys(languages).sort(), ["en", "es", "pt", "x-default"]);
    assert.equal(languages["x-default"], languages.en, "x-default must be English");
    // The alternates are the page's own set, so every loc is one of them.
    assert.ok(Object.values(languages).includes(entry.url), `${entry.url} is not its own alternate`);
  }

  // And the alternates of a project entry are its three URLs, not the homes'.
  const projectEntry = entries.find((entry) => entry.url === projectUrl("es", projects[0]));
  assert.deepEqual(
    projectEntry.alternates.languages,
    projectAlternates(projects[0]),
  );
});

test("the snapshot date renders as a date in each language, and never as NaN", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const rendered = formatSnapshotDate(snapshot.generatedAt, locale);
    assert.ok(rendered.includes("2026"), `${locale}: ${rendered}`);
  }
  assert.equal(formatSnapshotDate("not a date", "en"), null);
  assert.equal(formatSnapshotDate(null, "en"), null);
});

// ——— 3. the citablesurface (S6) ————————————————————————————————————————————

test("there are four questions, and every answer is built from the repository's data", () => {
  const skillNames = SKILLS.map((skill) => skill.name);

  for (const locale of SUPPORTED_LOCALES) {
    const faq = faqEntries(locale);
    assert.equal(faq.length, 4, `${locale}: the spec asks for four Q&A blocks`);
    assert.equal(new Set(faq.map((item) => item.question)).size, 4);

    for (const { question, answer } of faq) {
      assert.ok(question.trim().length > 0, `${locale}: empty question`);
      assert.ok(answer.trim().length > 0, `${locale}: empty answer`);
      assert.equal(
        question.includes("{") || answer.includes("}"),
        false,
        `${locale}: an unresolved placeholder: ${question} / ${answer}`,
      );
    }

    // 1: the stack is SKILLS, verbatim.
    for (const name of skillNames) assert.ok(faq[0].answer.includes(name));
    // 2: the place is PERSON_LOCALITY.
    assert.ok(faq[1].answer.includes(PERSON_LOCALITY));
    // 3: the availability is the sentence the hero shows.
    assert.equal(faq[2].answer, `${translator(locale).t("hero.status")}.`);
    // 4: the training is EDUCATION, verbatim.
    for (const item of EDUCATION) {
      assert.ok(faq[3].answer.includes(item.title), `${locale}: ${item.title} missing`);
      assert.ok(faq[3].answer.includes(item.company));
      assert.ok(faq[3].answer.includes(item.period));
    }
  }
});

test("the visible Q&A and the FAQPage graph are the same strings", () => {
  for (const project of projects) {
    for (const locale of SUPPORTED_LOCALES) {
      const visible = faqEntries(locale);
      const graph = siteGraph({
        locale,
        ...projectPageDescriptor(locale, project),
        projects,
        generatedAt: snapshot.generatedAt,
      });
      const faqPage = graph["@graph"].find((node) => node["@type"] === "FAQPage");
      assert.ok(faqPage, `${locale}: the project page ships no FAQPage`);

      assert.deepEqual(
        faqPage.mainEntity.map((question) => ({
          question: question.name,
          answer: question.acceptedAnswer.text,
        })),
        visible,
        `${locale}: the structured Q&A differs from the visible one`,
      );
    }
  }
});

test("the page labels exist in every language, with no key left English", () => {
  const keys = Object.keys(PROJECT_PAGE_COPY.en).sort();
  const faqKeys = Object.keys(FAQ_COPY.en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    assert.deepEqual(Object.keys(PROJECT_PAGE_COPY[locale]).sort(), keys);
    assert.deepEqual(Object.keys(FAQ_COPY[locale]).sort(), faqKeys);
    assert.deepEqual(projectPageCopy(locale), PROJECT_PAGE_COPY[locale]);
  }
});

// ——— 4. the graph (S4) ————————————————————————————————————————————————————

/** schema.org properties this graph is allowed to use — all real ones. */
const SCHEMA_PROPERTIES = new Set([
  "@id",
  "about",
  "acceptedAnswer",
  "address",
  "addressCountry",
  "addressLocality",
  "alumniOf",
  "applicationCategory",
  "author",
  "codeRepository",
  "dateModified",
  "description",
  "email",
  "endDate",
  "hasPart",
  "image",
  "inLanguage",
  "isPartOf",
  "item",
  "itemListElement",
  "jobTitle",
  "knowsAbout",
  "knowsLanguage",
  "mainEntity",
  "name",
  "numberOfItems",
  "position",
  "primaryImageOfPage",
  "programmingLanguage",
  "provider",
  "publisher",
  "sameAs",
  "startDate",
  "text",
  "url",
]);

/** schema.org types this graph is allowed to use — all real ones. */
const SCHEMA_TYPES = new Set([
  "Answer",
  "ComputerLanguage",
  "EducationalOccupationalProgram",
  "EducationalOrganization",
  "FAQPage",
  "ItemList",
  "ListItem",
  "Person",
  "PostalAddress",
  "ProfilePage",
  "Question",
  "SoftwareApplication",
  "SoftwareSourceCode",
  "WebPage",
  "WebSite",
]);

function assertRealSchema(node, where) {
  const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
  for (const type of types) {
    assert.ok(SCHEMA_TYPES.has(type), `${where}: unknown @type ${type}`);
  }
  for (const key of Object.keys(node)) {
    if (key === "@type" || key === "@context") continue;
    assert.ok(SCHEMA_PROPERTIES.has(key), `${where}: ${key} is not a schema.org property`);
  }
}

test("the graph parses, and every node uses real schema.org vocabulary", () => {
  const graphs = [
    siteGraph({
      locale: "en",
      ...homePageDescriptor("en"),
      projects,
      generatedAt: snapshot.generatedAt,
    }),
    siteGraph({
      locale: "es",
      ...projectPageDescriptor("es", projects[0]),
      projects,
      generatedAt: snapshot.generatedAt,
    }),
  ];

  for (const graph of graphs) {
    assert.deepEqual(graph["@context"], "https://schema.org");

    const parsed = JSON.parse(JSON.stringify(graph));
    assert.deepEqual(parsed, graph, "the graph must survive a JSON round trip");
    assert.equal(
      JSON.stringify(graph).includes("</script"),
      false,
      "a JSON-LD payload must not be able to close its own script tag",
    );

    const nodes = nodesOf(graph["@graph"]);
    assert.ok(nodes.length >= 4);
    for (const node of nodes) assertRealSchema(node, node["@id"] ?? node.name);
  }
});

test("every URL in the graph comes from the snapshot or the config", () => {
  // The only addresses the site is allowed to publish, built from the same two
  // sources the graph draws on: `src/data/constants.js` and the snapshot.
  const configured = new Set([
    SITE_URL,
    ...SOCIAL_LINKS.map((link) => link.href),
    ...projects.map((project) => project.repoLink),
    `mailto:${CONTACT_EMAIL}`,
  ]);

  const graphs = [
    siteGraph({
      locale: "en",
      ...homePageDescriptor("en"),
      projects,
      generatedAt: snapshot.generatedAt,
    }),
    siteGraph({
      locale: "pt",
      ...projectPageDescriptor("pt", projects[1]),
      projects,
      generatedAt: snapshot.generatedAt,
    }),
  ];

  for (const graph of graphs) {
    const urls = urlsOf(graph);
    assert.ok(urls.length > 0);
    for (const url of urls) {
      const sameOrigin =
        url === SITE_URL ||
        url.startsWith(`${SITE_URL}/`) ||
        url.startsWith(`${SITE_URL}#`);
      assert.ok(
        sameOrigin || configured.has(url),
        `${url} does not come from the snapshot or the config`,
      );
    }
  }
});

test("each project node carries the stack, the repository and a category", () => {
  const graph = siteGraph({
    locale: "en",
    ...homePageDescriptor("en"),
    projects,
    generatedAt: snapshot.generatedAt,
  });
  const listed = graph["@graph"].find((node) => node["@type"] === "ItemList");

  assert.equal(listed.numberOfItems, projects.length);
  assert.deepEqual(
    listed.itemListElement.map((item) => item.position),
    projects.map((_, index) => index + 1),
  );

  for (const { item } of listed.itemListElement) {
    const source = projects.find((project) => project.title === item.name);
    assert.ok(source, `${item.name} is not in the snapshot`);
    assert.equal(item.codeRepository, source.repoLink);
    assert.deepEqual(
      item.programmingLanguage,
      source.tags.map((tag) => ({ "@type": "ComputerLanguage", name: tag })),
    );
    assert.equal(item.applicationCategory, applicationCategoryFor(source));
    assert.equal(item.url, projectUrl("en", source));
    assert.equal(item["@id"], `${SITE_URL}/work/${source.name}#project`);
    assert.deepEqual(item.author, { "@id": `${SITE_URL}/#person` });
  }
});

test("applicationCategory is derived from the groups the work list already uses", () => {
  const categories = projects.map((project) => applicationCategoryFor(project));
  assert.ok(categories.every((category) => /Application$/.test(category)));
  // A systems project is not filed as a business app, and a PWA is.
  const btrfs = projects.find((project) => project.name === "btrfs2ext4");
  assert.equal(applicationCategoryFor(btrfs), "DeveloperApplication");
  assert.equal(
    applicationCategoryFor({ name: "nothing-matches", tags: [] }),
    "UtilityApplication",
  );
});

test("the training the graph used to ignore is in it, dated", () => {
  const graph = siteGraph({
    locale: "en",
    ...homePageDescriptor("en"),
    projects,
    generatedAt: snapshot.generatedAt,
  });
  const person = graph["@graph"].find((node) => node["@type"] === "Person");

  assert.equal(person.alumniOf.length, EDUCATION.length);
  assert.deepEqual(
    person.alumniOf.map((programme) => programme.name),
    EDUCATION.map((item) => item.title),
  );
  for (const [index, programme] of person.alumniOf.entries()) {
    const [start, end] = EDUCATION[index].period.split("-").map((part) => part.trim());
    assert.equal(programme["@type"], "EducationalOccupationalProgram");
    assert.equal(programme.provider.name, EDUCATION[index].company);
    assert.equal(programme.startDate, start);
    assert.equal(programme.endDate, end);
  }

  const profile = graph["@graph"].find((node) => node["@type"] === "ProfilePage");
  assert.equal(profile.dateModified, snapshot.generatedAt);
  assert.deepEqual(profile.mainEntity, { "@id": `${SITE_URL}/#person` });
});

// ——— 5. the head (S2, S3) ——————————————————————————————————————————————————

test("the home keeps its canonical, its hreflang map and its Open Graph block", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const metadata = homeMetadata(locale);
    const { t } = translator(locale);

    assert.equal(metadata.title, t("meta.title"));
    assert.equal(metadata.description, t("meta.description"));
    assert.equal(metadata.alternates.canonical, localeUrl(locale));
    assert.deepEqual(metadata.alternates.languages, homeAlternates());
    assert.deepEqual(Object.keys(metadata.alternates.languages).sort(), [
      "en",
      "es",
      "pt",
      "x-default",
    ]);
    assert.equal(metadata.alternates.languages["x-default"], SITE_URL);

    assert.equal(metadata.openGraph.type, "website");
    assert.equal(metadata.openGraph.url, localeUrl(locale));
    assert.equal(metadata.openGraph.siteName, SITE_NAME);
    assert.equal(metadata.openGraph.title, metadata.title);
    assert.equal(metadata.openGraph.description, metadata.description);
    assert.equal(metadata.twitter.card, "summary_large_image");
  }
});

test("the Open Graph image is the language's 1200×630 card, not the portrait", () => {
  for (const locale of SUPPORTED_LOCALES) {
    for (const metadata of [homeMetadata(locale), projectMetadata(locale, projects[0])]) {
      const [image] = metadata.openGraph.images;
      const [twitterImage] = metadata.twitter.images;

      assert.equal(image.url, ogImageUrl(locale));
      assert.equal(image.url, `${SITE_URL}/og/${locale}.png`);
      assert.equal(image.width, OG_IMAGE_WIDTH);
      assert.equal(image.height, OG_IMAGE_HEIGHT);
      assert.equal(image.width, 1200);
      assert.equal(image.height, 630);
      assert.match(image.alt, /Full-stack developer/);
      assert.match(image.alt, /Buenos Aires/);
      assert.notEqual(image.url, `${SITE_URL}${PORTRAIT_PATH}`);
      assert.equal(twitterImage.url, image.url);
    }
  }
});

test("a project page has its own canonical and three reciprocal alternates", () => {
  for (const project of projects) {
    for (const locale of SUPPORTED_LOCALES) {
      const metadata = projectMetadata(locale, project);
      assert.equal(metadata.alternates.canonical, projectUrl(locale, project));
      assert.deepEqual(metadata.alternates.languages, projectAlternates(project));
      assert.equal(
        metadata.alternates.languages["x-default"],
        projectUrl(DEFAULT_LOCALE, project),
      );
      assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
      assert.ok(metadata.title.includes(project.title));
      assert.equal(metadata.description, project.description);
    }
  }
});

// ——— PRESERVE: what the site already shipped ——————————————————————————————

test("the graph keeps every node, and every field, the page already had", () => {
  const graph = siteGraph({
    locale: "en",
    ...homePageDescriptor("en"),
    projects,
    generatedAt: snapshot.generatedAt,
  });
  const types = graph["@graph"].map((node) => node["@type"]);

  // Person, WebSite, WebPage (= ProfilePage) and the work ItemList, unchanged.
  assert.ok(types.includes("Person"));
  assert.ok(types.includes("WebSite"));
  assert.ok(types.includes("ProfilePage"));
  assert.ok(types.includes("ItemList"));

  const person = graph["@graph"].find((node) => node["@type"] === "Person");
  assert.equal(person.name, SITE_NAME);
  assert.equal(person.jobTitle, PERSON_JOB_TITLE);
  assert.equal(person.url, SITE_URL);
  assert.equal(person.email, `mailto:${CONTACT_EMAIL}`);
  assert.equal(person.image, `${SITE_URL}${PORTRAIT_PATH}`);
  assert.deepEqual(person.address, {
    "@type": "PostalAddress",
    addressLocality: PERSON_LOCALITY,
    addressCountry: "AR",
  });
  assert.deepEqual(person.sameAs, SOCIAL_LINKS.map((link) => link.href));
  assert.deepEqual(
    person.knowsAbout,
    SKILLS.map((skill) => skill.name),
  );
  assert.deepEqual(person.knowsLanguage, ["en", "es", "pt"]);

  const website = graph["@graph"].find((node) => node["@type"] === "WebSite");
  assert.equal(website.url, SITE_URL);
  assert.equal(website.inLanguage, "en");
  assert.deepEqual(website.publisher, { "@id": `${SITE_URL}/#person` });

  // The portrait still backs the page's own image, and the card does not.
  const profile = graph["@graph"].find((node) => node["@type"] === "ProfilePage");
  assert.equal(profile.primaryImageOfPage, `${SITE_URL}${PORTRAIT_PATH}`);
  assert.equal(profile.url, SITE_URL);
  assert.deepEqual(profile.about, { "@id": `${SITE_URL}/#person` });
});

test("a project node stays addressable when it is not on the home page", () => {
  const node = softwareNode(projects[0], "es");
  assert.equal(node.url, projectUrl("es", projects[0]));
  assert.equal(node["@id"], `${SITE_URL}/work/${projects[0].name}#project`);
  assert.equal(node.name, projects[0].title);
  assert.equal(node.description, projects[0].description);
  assert.equal(node.author["@id"], `${SITE_URL}/#person`);
});
