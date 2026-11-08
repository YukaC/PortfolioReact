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
} from "@/data/constants";
import { translator } from "@/i18n/index.js";
import {
  formatSnapshotDate,
  localeUrl,
  ogImagePath,
  projectUrl,
} from "@/lib/seo";
import { readProjectsSnapshot } from "@/lib/projects-snapshot";

/**
 * §24 S5 — `/llms.txt`: a plain-text index of the site, for a reader that is a
 * language model rather than a browser.
 *
 * It is a map, not a copy of the pages: what the site is, which URLs matter,
 * and where the machine-readable version of the project data lives. Every line
 * is generated from `src/data/constants.js` and the project snapshot, so the
 * index can never describe a page that does not exist or a fact the HTML does
 * not also state — the failure mode §26 warns about (a document that says one
 * thing while the page says another).
 *
 * Served as `text/plain` with `force-static`: the file is a build artefact of
 * the snapshot, and it refreshes on the same 6 h window as the pages.
 */
export const dynamic = "force-static";
export const revalidate = 21600;

export function GET() {
  const { generatedAt, projects } = readProjectsSnapshot();
  const { t } = translator("en");
  const updated = formatSnapshotDate(generatedAt, "en");
  const region = PERSON_COUNTRY === "AR" ? "Argentina" : PERSON_COUNTRY;

  const lines = [
    `# ${SITE_NAME} — ${PERSON_JOB_TITLE} in ${PERSON_LOCALITY}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "## What this site is",
    "",
    `- A one-page portfolio for ${SITE_NAME}, ${PERSON_JOB_TITLE.toLowerCase()} in ${PERSON_LOCALITY}, ${region}.`,
    "- Prerendered HTML in English, Spanish and Portuguese: the copy is in the first byte and nothing needs a script to be read.",
    `- One page per project, with the stack, the problem, the result, the demo link and the date the project data was last refreshed (${updated ?? "unknown"}).`,
    "- Every fact below is also stated on the corresponding HTML page; this file adds no claim of its own.",
    "",
    "## Pages",
    "",
    `- [Home (English)](${localeUrl("en")}): ${translator("en").t("meta.title")}`,
    `- [Home (Spanish)](${localeUrl("es")}): ${translator("es").t("meta.title")}`,
    `- [Home (Portuguese)](${localeUrl("pt")}): ${translator("pt").t("meta.title")}`,
    "",
    "## Projects",
    "",
    ...projects.map(
      (project) =>
        `- [${project.title}](${projectUrl("en", project)}) (also ${projectUrl("es", project)} and ${projectUrl("pt", project)}): ${project.description} Stack: ${(project.tags ?? []).join(", ")}. Source: ${project.repoLink}`,
    ),
    "",
    "## Facts",
    "",
    `- Name: ${SITE_NAME}`,
    `- Role: ${PERSON_JOB_TITLE}`,
    `- Place: ${PERSON_LOCALITY}, ${region}`,
    `- Availability: ${t("hero.status")}`,
    `- Tools: ${SKILLS.map((skill) => skill.name).join(", ")}`,
    ...EDUCATION.map(
      (item) => `- Education: ${item.title}, ${item.company} (${item.period})`,
    ),
    `- Contact: ${CONTACT_EMAIL}`,
    "",
    "## Machine-readable",
    "",
    `- [projects.json](${SITE_URL}/projects.json): the project snapshot as JSON — { generatedAt, projects: [{ name, title, description, problem, outcome, tags, repoLink, siteUrl, imgSrc, alt, isFeatured }] }, last refreshed ${updated ?? "unknown"}.`,
    `- [sitemap.xml](${SITE_URL}/sitemap.xml): every URL, with hreflang alternates.`,
    `- [robots.txt](${SITE_URL}/robots.txt): the crawler policy, written out per agent.`,
    `- [Open Graph card](${SITE_URL}${ogImagePath("en")}): 1200×630, one per language (/og/en.png, /og/es.png, /og/pt.png).`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}
