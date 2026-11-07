import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
import en from "../i18n/messages/en.js";
import es from "../i18n/messages/es.js";
import pt from "../i18n/messages/pt.js";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../i18n/locale.js";
import {
  SLUG_PATTERN,
  findProjectBySlug,
  projectPath,
  projectSlug,
  repoName,
} from "./project-slugs.js";
import {
  ALUMNI_UNIVERSITY,
  FAQ_COPY,
  KNOWS_ABOUT,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  OG_LOCALE_TAGS,
  PERSON_ADDRESS_LOCALITY,
  PERSON_ADDRESS_REGION,
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
  personNode,
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
 *      page's visible Q&A required to appear verbatim in the prerendered HTML
 *      (plus the `FAQPage` node carrying those same strings);
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

test("a regional tag resolves to its language's URL, never to `/es-AR/…`", () => {
  const project = projects[0];
  const slug = projectSlug(project);

  for (const [locale, expected] of [
    ["es-AR", `/es/work/${slug}`],
    ["pt-BR", `/pt/work/${slug}`],
    ["en-US", `/work/${slug}`],
    ["en", `/work/${slug}`],
    ["", `/work/${slug}`],
  ]) {
    assert.equal(projectPath(locale, project), expected, `${JSON.stringify(locale)}`);
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

/**
 * §24 S6, as a statement about the *document*.
 *
 * Comparing `faqEntries()` with a graph built from the same call proves one
 * thing: the function is deterministic. It cannot see the page. So this reads
 * the HTML `next build` actually emitted (`src/app/**` →
 * `.next/server/app/**`) and requires every `Question.name` and every
 * `Answer.text` to appear verbatim in the page's visible text — the 1:1 the
 * audit asks for, checked against the artefact a crawler receives.
 *
 * The suite does not build (that is the `build` job's cost, and a unit run must
 * stay a unit run), so a checkout without build output skips with the command
 * that produces it instead of passing on nothing.
 */
const APP_OUTPUT = path.join(ROOT, ".next", "server", "app");

/** The prerendered project page for one language, or null without a build. */
function prerenderedProjectPage(locale) {
  const slug = projectSlug(projects[0]);
  const file =
    locale === DEFAULT_LOCALE
      ? path.join(APP_OUTPUT, "work", `${slug}.html`)
      : path.join(APP_OUTPUT, locale, "work", `${slug}.html`);

  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

/** The text a reader sees: no scripts, no styles, no tags, entities decoded. */
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const prerendered = new Map(
  SUPPORTED_LOCALES.map((locale) => [locale, prerenderedProjectPage(locale)]),
);
const missingPages = SUPPORTED_LOCALES.filter((locale) => !prerendered.get(locale));

test(
  "every Question.name and Answer.text is in the prerendered page",
  {
    skip:
      missingPages.length > 0
        ? `no prerendered project page for ${missingPages.join(", ")} under .next/server/app — run \`pnpm build\``
        : false,
  },
  () => {
    for (const locale of SUPPORTED_LOCALES) {
      const html = prerendered.get(locale);
      const text = visibleText(html);

      // S7's document checklist, on the artefact a crawler receives: the
      // language is in the first byte and the page carries exactly one h1.
      assert.match(
        html,
        new RegExp(`<html[^>]+lang="${locale}"`),
        `${locale}: <html lang> is not the document's language`,
      );
      assert.equal(
        (html.match(/<h1[\s>]/g) ?? []).length,
        1,
        `${locale}: the page must have exactly one h1`,
      );

      for (const { question, answer } of faqEntries(locale)) {
        assert.ok(
          text.includes(question),
          `${locale}: the page never shows the question ${JSON.stringify(question)}`,
        );
        assert.ok(
          text.includes(answer),
          `${locale}: the page never shows the answer ${JSON.stringify(answer)}`,
        );
      }
    }
  },
);

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
  "addressRegion",
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
    ...projects.map((project) => project.siteUrl).filter(Boolean),
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
  // A systems project is not filed as a business app, and a PWA is. The fixture
  // is literal on purpose: the rule must hold for a shape the snapshot may not
  // carry on the day it runs (the pinned set changes; the grouping does not).
  const btrfs = { name: "btrfs2ext4", tags: ["C", "Linux", "btrfs", "ext4"] };
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

  const programmes = person.alumniOf.filter(
    (node) => node["@type"] === "EducationalOccupationalProgram",
  );

  assert.equal(programmes.length, EDUCATION.length);
  assert.deepEqual(
    programmes.map((programme) => programme.name),
    EDUCATION.map((item) => item.title),
  );
  for (const [index, programme] of programmes.entries()) {
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

/** The three dictionaries, by locale, as the timeline reads them. */
const DICTIONARIES = { en, es, pt };

/**
 * A period with the visible en dash flattened and its spacing collapsed, so the
 * display copy and the machine copy are comparable: `2024 – 2025` and
 * `2024 - 2025` are the same range.
 */
const normalizedPeriod = (period) =>
  period.replace(/–/g, "-").replace(/\s+/g, " ").trim();

/**
 * The training is duplicated on purpose and the two copies are pinned together.
 *
 * `EDUCATION` in `src/data/constants.js` is the machine copy: the JSON-LD graph
 * and `llms.txt` publish it, and it needs the ASCII range the date parser splits
 * on. Each dictionary carries the same four entries as the copy the timeline
 * renders, with the en dash the reader sees. They drift the moment a school year
 * moves and only one copy is edited — the timeline then prints one range while
 * the graph dates another, and nothing in a screenshot shows it. Titles are
 * translated on purpose and are not compared here.
 */
test("the dictionary timeline and EDUCATION carry the same dates", () => {
  for (const [locale, messages] of Object.entries(DICTIONARIES)) {
    const entries = messages.about.education;
    assert.equal(
      entries.length,
      EDUCATION.length,
      `${locale} lists every entry EDUCATION has`,
    );
    assert.deepEqual(
      entries.map((item) => normalizedPeriod(item.period)),
      EDUCATION.map((item) => normalizedPeriod(item.period)),
      `${locale} keeps the same ranges, entry by entry`,
    );
  }
});

/**
 * S7's `Person` node, as the brief states it.
 *
 * Every field below is either the brief's own string or a value the repository
 * already holds, and the assertions say which: the job title is the Spanish
 * `about.role` the portrait prints, `knowsAbout` is the brief's six technologies
 * drawn from the visible chip row, and `sameAs` is exactly the profiles
 * `src/data/constants.js` ships. A handle nobody verified cannot get in here.
 */
test("the Person node publishes the brief's identity, unaltered", () => {
  const person = personNode();

  assert.equal(person.name, "Agustín Ciucani");
  assert.equal(person.jobTitle, "Desarrollador full-stack");
  assert.equal(person.url, SITE_URL);
  assert.equal(person.email, "mailto:agusyuk25@gmail.com");
  assert.deepEqual(person.address, {
    "@type": "PostalAddress",
    addressLocality: "Coronel Dorrego",
    addressRegion: "Buenos Aires",
    addressCountry: "AR",
  });

  const university = person.alumniOf.filter(
    (node) => node["@type"] === "EducationalOrganization",
  );
  assert.deepEqual(university, [
    { "@type": "EducationalOrganization", name: ALUMNI_UNIVERSITY },
  ]);
  assert.equal(ALUMNI_UNIVERSITY, "Universidad Provincial del Sudoeste");

  assert.deepEqual(person.knowsAbout, [
    "React",
    "Next.js",
    "TypeScript",
    "Node.js",
    "Python",
    "PostgreSQL",
  ]);
  // Each claim is a chip the page shows, or that chip's fuller spelling.
  const chips = SKILLS.map((skill) => skill.name);
  for (const name of person.knowsAbout) {
    assert.ok(
      chips.includes(name) || (name === "Node.js" && chips.includes("Node")),
      `${name} is not a technology the page shows`,
    );
  }

  assert.deepEqual(person.sameAs, SOCIAL_LINKS.map((link) => link.href));
  for (const url of person.sameAs) {
    assert.match(url, /^https:\/\//, `${url} is not an absolute profile URL`);
  }
  assert.equal(
    new Set(person.sameAs).size,
    person.sameAs.length,
    "a profile cannot be listed twice",
  );
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
    assert.equal(metadata.openGraph.title, t("meta.ogTitle"));
    assert.equal(metadata.openGraph.description, t("meta.ogDescription"));
    assert.equal(metadata.openGraph.locale, OG_LOCALE_TAGS[locale]);
    assert.equal(metadata.twitter.card, "summary_large_image");
  }
});

/**
 * S7, as the owner wrote it. Spanish is the source, so these four strings are
 * compared literally: a reworded title is a change to the brief, not a fix.
 */
const BRIEF_META = {
  title: "Agustín Ciucani · Desarrollador full-stack en Buenos Aires",
  description:
    "Desarrollador full-stack en Buenos Aires. Apps web, paneles y PWAs con React, Next.js, Node y Python. Disponible para freelance y full-time.",
  ogTitle: "Agustín Ciucani · Desarrollador full-stack",
  ogDescription:
    "Armo tu software de punta a punta. React, Next.js, Node y Python.",
};

test("the Spanish head is the brief's text, verbatim", () => {
  const metadata = homeMetadata("es");

  assert.equal(metadata.title, BRIEF_META.title);
  assert.equal(metadata.description, BRIEF_META.description);
  assert.ok(metadata.description.endsWith("Disponible para freelance y full-time."));
  assert.equal(metadata.openGraph.title, BRIEF_META.ogTitle);
  assert.equal(metadata.openGraph.description, BRIEF_META.ogDescription);
  assert.equal(metadata.openGraph.locale, "es_AR");
  assert.equal(metadata.openGraph.type, "website");
  assert.equal(metadata.openGraph.url, localeUrl("es"));

  // The canonical is the site's own origin, and `languages` names the three
  // documents that actually exist — `/en` is not a route, `/` is English.
  assert.equal(metadata.alternates.canonical, `${SITE_URL}/es`);
  assert.deepEqual(metadata.alternates.languages, {
    en: SITE_URL,
    es: `${SITE_URL}/es`,
    pt: `${SITE_URL}/pt`,
    "x-default": SITE_URL,
  });
});

test("every language carries the same meta keys, translated", () => {
  const keys = Object.keys(en.meta).sort();

  for (const [locale, dictionary] of [
    ["es", es],
    ["pt", pt],
  ]) {
    assert.deepEqual(Object.keys(dictionary.meta).sort(), keys, `${locale}: meta keys`);
    assert.notEqual(dictionary.meta.ogTitle, en.meta.ogTitle, `${locale}: ogTitle`);
    assert.notEqual(
      dictionary.meta.ogDescription,
      en.meta.ogDescription,
      `${locale}: ogDescription`,
    );
    assert.notEqual(
      dictionary.meta.description,
      en.meta.description,
      `${locale}: description`,
    );
  }

  // S7's shape: name, a middle dot, role — never the em dash the old copy used.
  for (const dictionary of [en, es, pt]) {
    assert.ok(dictionary.meta.title.includes(" · "), dictionary.meta.title);
    assert.equal(dictionary.meta.title.includes("—"), false, dictionary.meta.title);
    assert.ok(dictionary.meta.ogTitle.includes(" · "), dictionary.meta.ogTitle);
  }
});

test("the portrait's alt text names the person, in every language", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const { t } = translator(locale);
    assert.ok(t("about.portraitAlt", { name: SITE_NAME }).includes(SITE_NAME), locale);
  }
  assert.equal(
    translator("es").t("about.portraitAlt", { name: SITE_NAME }),
    "Retrato de Agustín Ciucani",
  );
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
  assert.equal(person.jobTitle, translator("es").t("about.role"));
  assert.notEqual(
    person.jobTitle,
    PERSON_JOB_TITLE,
    "S7's jobTitle is the Spanish one, not the English constant",
  );
  assert.equal(person.url, SITE_URL);
  assert.equal(person.email, `mailto:${CONTACT_EMAIL}`);
  assert.equal(person.image, `${SITE_URL}${PORTRAIT_PATH}`);
  assert.deepEqual(person.address, {
    "@type": "PostalAddress",
    addressLocality: PERSON_ADDRESS_LOCALITY,
    addressRegion: PERSON_ADDRESS_REGION,
    addressCountry: "AR",
  });
  assert.deepEqual(person.sameAs, SOCIAL_LINKS.map((link) => link.href));
  assert.deepEqual(person.knowsAbout, KNOWS_ABOUT);
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
