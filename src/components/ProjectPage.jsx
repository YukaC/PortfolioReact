import Link from "next/link";
import PageFrame from "@/components/PageFrame";
import Reveal from "@/components/Reveal";
import SwapArrow from "@/components/SwapArrow";
import { translator } from "@/i18n/index.js";
import { resolveProjectLinks } from "@/lib/project-links";
import {
  faqEntries,
  formatSnapshotDate,
  homePath,
  projectPageCopy,
  projectPageDescriptor,
} from "@/lib/seo";

/**
 * §24 S6 — the citable surface: one page per project.
 *
 * Seven projects used to share one URL (`/#portfolio`), so there was nothing for
 * a search result, an AI Overview or a quotation to point at: every project's
 * facts lived inside a list item that a reader had to scroll to. This page is
 * the URL that owns one project — `<h1>` with its name, its stack, the problem
 * and the result (both already in the snapshot's copy), the demo link, the date
 * the data was refreshed, and the four Q&A.
 *
 * Two rules shape the markup:
 *
 *   • **Everything visible comes from the snapshot or the constants.** The
 *     stack is `project.tags`, the problem/result are `project.problem` /
 *     `project.outcome`, the date is the snapshot's `generatedAt`, and the Q&A
 *     answers are built by `faqEntries` from `SKILLS`, `PERSON_LOCALITY`, the
 *     hero's availability sentence and `EDUCATION`. §26 forbids inventing copy
 *     for a project page, and there is none here.
 *   • **The visible Q&A and the `FAQPage` graph are the same strings.** The
 *     array rendered below is the array `projectPageDescriptor` puts in the
 *     graph, produced by the same call — not a second copy kept in sync.
 *
 * A Server Component, like every other section: the copy is in the HTML whether
 * or not a script runs, which is the property GEO and AIO actually reward. The
 * visual vocabulary is the shipped one — `.section-y` + `.site-shell` for the
 * frame, `.eyebrow` + the base `h1`, `.lead`, `.skill-chips` for the stack,
 * `.about-h3` for the labels, the timeline's title/description pair for the
 * Q&A, `.btn` for the actions and `.work-note` for the footnote tone. No new
 * colour, no card inside a card, no new class in the stylesheet.
 */
const ProjectPage = ({ project, projects = [], locale = "en", generatedAt = null }) => {
  const { t } = translator(locale);
  const copy = projectPageCopy(locale);
  const faq = faqEntries(locale);
  const updated = formatSnapshotDate(generatedAt, locale);

  // The demo link is the project's own site when there is one, otherwise the
  // repository — the same resolver the work row uses, so the two never disagree.
  const { siteUrl, repoUrl, showRepoLink } = resolveProjectLinks({
    repoUrl: project.repoLink,
    siteUrlFromOverride: project.siteUrl,
  });

  const tags = project.tags ?? [];

  return (
    <PageFrame
      locale={locale}
      projects={projects}
      generatedAt={generatedAt}
      page={projectPageDescriptor(locale, project)}
    >
      <article
        className="section-y w-full"
        aria-labelledby="project-title"
      >
        <div className="site-shell">
          <Reveal className="eyebrow">{t("work.eyebrow")}</Reveal>

          <h1 id="project-title" className="mt-6">
            {project.title}
          </h1>

          <p className="lead mt-6">{project.description}</p>

          {tags.length > 0 ? (
            <ul className="skill-chips" aria-label={copy.stack}>
              {tags.map((tag) => (
                <li key={tag}>
                  <span>{tag}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-12 grid gap-10 md:grid-cols-2">
            <section>
              <h2 className="about-h3">{copy.problem}</h2>
              <p className="lead">{project.problem ?? project.description}</p>
            </section>
            <section>
              <h2 className="about-h3">{copy.result}</h2>
              <p className="lead">{project.outcome ?? project.description}</p>
            </section>
          </div>

          <div className="mt-[2.375rem] flex flex-wrap gap-3">
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-solid focus-ring"
            >
              {t("work.viewDemo")}
              <SwapArrow direction="d" />
              <span className="sr-only">{t("a11y.newTab")}</span>
            </a>

            {showRepoLink ? (
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn focus-ring"
              >
                {t("work.github")}
                <SwapArrow direction="d" />
                <span className="sr-only">{t("a11y.newTab")}</span>
              </a>
            ) : null}

            <Link href={homePath(locale)} className="btn focus-ring">
              {copy.back}
            </Link>
          </div>

          {updated ? (
            <p className="work-note">
              {copy.updated}{" "}
              <time dateTime={generatedAt ?? undefined}>{updated}</time>
            </p>
          ) : null}

          <section className="mt-16" aria-labelledby="faq-title">
            <h2 id="faq-title" className="about-h3">
              {copy.faqTitle}
            </h2>

            <div className="mt-2 grid gap-x-12 gap-y-9 md:grid-cols-2">
              {faq.map(({ question, answer }, index) => (
                <Reveal key={question} delayMs={index * 60}>
                  <h3 className="timeline-title">{question}</h3>
                  <p className="timeline-desc">{answer}</p>
                </Reveal>
              ))}
            </div>
          </section>
        </div>
      </article>
    </PageFrame>
  );
};

export default ProjectPage;
