import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import SplitHeading from "@/components/SplitHeading";
import SwapArrow from "@/components/SwapArrow";
import WorkFilters from "@/components/WorkFilters";
import {
  GITHUB_USERNAME,
  MAX_PINNED_PROJECTS,
  projectCategories,
  projectMonogram,
} from "@/data/projects";
import { translator } from "@/i18n/index.js";
import { BREAKPOINT, mediaQuery } from "@/lib/breakpoints";
import { resolveProjectLinks } from "@/lib/project-links";
import { projectPath } from "@/lib/project-slugs";

/**
 * `sizes` for the inline cover: the thumb only exists below the `wide`
 * breakpoint, so the descriptor is the breakpoint's own query instead of a
 * second copy of `900` in a string (S9). It is read from the same module the
 * islands use, which falls back to the shipped number on the server where
 * there is no `document`.
 */
const THUMB_SIZES = `${mediaQuery.max(BREAKPOINT.wide)} 100vw, 1px`;

const COVER_BLUR =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9">
      <rect width="100%" height="100%" fill="#0e1830"/>
    </svg>`,
  );

/**
 * Cover art for a project: its screenshot when there is one, otherwise a
 * generated haze with the project's monogram (the reference's placeholder,
 * keyed to the index so the list has variety without inventing assets).
 */
const ProjectCover = ({ project, index, sizes }) => {
  if (project.imgSrc) {
    return (
      <Image
        src={project.imgSrc}
        alt=""
        fill
        quality={70}
        loading="lazy"
        sizes={sizes}
        placeholder="blur"
        blurDataURL={COVER_BLUR}
        className="object-cover"
      />
    );
  }

  return (
    <div className="work-art" style={{ "--h": (index * 47 + 205) % 360 }}>
      <span className="font-heading text-[clamp(4rem,9vw,7rem)] text-white/90">
        {projectMonogram(project)}
      </span>
    </div>
  );
};

/**
 * Project row: the title opens the project's own page (§24 S6), the overlay
 * opens the live demo, and the pill under the copy opens the repository.
 *
 * Three destinations, three elements, no lie: the demo keeps the label it
 * always had (`work.demoAria`), the repository keeps its own, and the new
 * internal link carries nothing but the project's name — so a crawler finds the
 * citable URL and a reader who wanted the demo still lands on the demo.
 *
 * The two conditions are opposite halves of `resolveProjectLinks()`, and that
 * is on purpose. The pill follows the repository, not "the demo is somewhere
 * else": sharing `showRepoLink` with the overlay meant a pin with no homepage
 * (every `PROJECT_OVERRIDES` entry today, and any repository whose Website
 * field is empty) rendered a row with no GitHub link at all, which is exactly
 * the affordance the list lost. The overlay follows the demo, because with no
 * demo it used to point at the repository under the label "view demo" — a
 * control that lies (§20.4-3).
 *
 * Rendered on the server and handed to the filter island as an element, so the
 * copy in a row is in the HTML whether or not a script runs.
 */
const WorkRow = ({ project, index, labels, href }) => {
  // `project.siteUrl` is already resolved upstream (override → GitHub "Website"
  // → repo); re-running the resolver keeps the fallback entries in sync.
  const { siteUrl, repoUrl, showRepoLink } = resolveProjectLinks({
    repoUrl: project.repoLink,
    siteUrlFromOverride: project.siteUrl,
  });

  return (
    <li
      className="work-row"
      data-work-row=""
      data-work-key={project.name ?? project.title}
      style={{ "--d": `${index * 90}ms` }}
    >
      <div className="work-thumb" aria-hidden="true">
        <ProjectCover
          project={project}
          index={index}
          sizes={THUMB_SIZES}
        />
      </div>

      <span className="work-num">{String(index + 1).padStart(2, "0")}</span>

      <div className="work-body">
        <h3>
          {/* Above the row's overlay (`z-index: 2`), like the repo action, so
              the two links are both reachable and neither steals the other.
              `z-main` is the semantic layer from §14.4, not a literal. */}
          <Link
            href={href}
            className="focus-ring relative z-main transition-colors hover:text-sky"
          >
            {project.title}
          </Link>
        </h3>
        {/* The row prints the card's own line — the project's description — and
            falls back to the problem statement only when there is none. The
            problem/outcome pair is the project page's copy, not the list's. */}
        <p className="work-problem">
          {project.description ?? project.problem}
        </p>
        {project.tags?.length ? (
          <p className="work-tags">{project.tags.join(" · ")}</p>
        ) : null}
        {repoUrl ? (
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={labels.repoAria}
            className="focus-ring relative z-main mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-white/55 transition-colors hover:border-white/40 hover:text-white/90"
          >
            {labels.github}
            <SwapArrow direction="d" size={11} />
          </a>
        ) : null}
      </div>

      <span className="work-go" aria-hidden="true">
        <SwapArrow direction="d" />
      </span>

      {showRepoLink ? (
        <a
          className="absolute inset-0 focus-ring"
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={labels.demoAria}
        />
      ) : null}
    </li>
  );
};

/**
 * WorkList - selected work as a filtered list.
 *
 * Rows are the reference's: index, title, problem, tags and a circular arrow.
 * On a fine pointer the list dims its siblings, lights the row under the cursor
 * and floats a glass preview of that project's cover; on touch the cover rides
 * inline above each row instead.
 *
 * A Server Component (docs/audit.md §16.2): the rows are markup, and they arrive in
 * the HTML complete. `WorkFilters` is the island — the tabs, the pointer
 * choreography and the preview — and it receives the rows (and the preview
 * layers) as already-rendered elements, so filtering is the only thing it
 * decides. That is also why the no-script page shows every project: the island
 * server-renders with `filter === "all"`.
 *
 * `projects` is required. It used to default to `PINNED_FALLBACK`, a second,
 * unvalidated copy of the cards: a call site that forgot the prop rendered
 * seven stale rows instead of the six the snapshot serves, and nothing failed.
 * There is one source now (`src/data/pinned-projects.json`, through
 * `PageFrame`), so a missing prop has to be loud.
 */
const WorkList = ({ projects, locale = "en" }) => {
  if (!Array.isArray(projects)) {
    throw new TypeError(
      "[WorkList] projects is required: pass the validated snapshot (readProjectsSnapshot().projects)",
    );
  }

  const { t } = translator(locale);
  const items = projects.slice(0, MAX_PINNED_PROJECTS);

  const rows = items.map((project, index) => ({
    key: project.name ?? project.repoLink,
    categories: projectCategories(project),
    element: (
      <WorkRow
        key={project.name ?? project.repoLink}
        project={project}
        index={index}
        href={projectPath(locale, project)}
        labels={{
          github: t("work.github"),
          repoAria: t("work.repoAria", { title: project.title }),
          demoAria: t("work.demoAria", { title: project.title }),
        }}
      />
    ),
  }));

  const previewLayers = items.map((project, index) => (
    <div
      key={project.name ?? project.repoLink}
      className="work-preview-layer"
      data-preview-key={project.name ?? project.title}
    >
      <ProjectCover project={project} index={index} sizes="320px" />
    </div>
  ));

  return (
    <section
      id="portfolio"
      className="section-y w-full overflow-x-clip scroll-mt-26"
      aria-labelledby="work-heading"
    >
      <div className="site-shell">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Reveal className="eyebrow">{t("work.eyebrow")}</Reveal>
            <SplitHeading
              as="h2"
              id="work-heading"
              text={t("work.title")}
              accent={t("work.accent")}
              delayMs={80}
            />
          </div>
          <Reveal as="p" className="lead" delayMs={160}>
            {t("work.lead")}
          </Reveal>
        </div>

        <WorkFilters rows={rows} previewLayers={previewLayers} />

        <Reveal style={{ marginTop: "2.125rem" }}>
          <a
            href={`https://github.com/${GITHUB_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn focus-ring"
          >
            {t("work.githubProfile")}
            <SwapArrow direction="d" />
            <span className="sr-only">{t("a11y.newTab")}</span>
          </a>
        </Reveal>
      </div>
    </section>
  );
};

export default WorkList;
