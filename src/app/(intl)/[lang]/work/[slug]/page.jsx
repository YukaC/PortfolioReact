import { notFound } from "next/navigation";
import ProjectPage from "@/components/ProjectPage";
import { SUPPORTED_LOCALES } from "@/i18n/locale";
import { readProjectsSnapshot } from "@/lib/projects-snapshot";
import { findProjectBySlug, projectSlug } from "@/lib/project-slugs";
import { projectMetadata } from "@/lib/seo";

/**
 * Translated project page: `/es/work/<slug>` and `/pt/work/<slug>` (§24 S6).
 *
 * One route, two languages, the same closed set as the English tree —
 * `generateStaticParams` emits the cross product the snapshot allows, so a
 * project added to `src/data/pinned-projects.json` gets its three URLs at the
 * next build without anyone touching this file.
 *
 * The proxy is not involved: the language lives in the path, so the served
 * document already says `es` in its first byte and the canonical URL of the page
 * is the URL the reader is on.
 */
export const revalidate = 21600;
export const dynamicParams = false;

export function generateStaticParams() {
  const { projects } = readProjectsSnapshot();

  return SUPPORTED_LOCALES.filter((locale) => locale !== "en").flatMap((lang) =>
    projects.map((project) => ({ lang, slug: projectSlug(project) })),
  );
}

export async function generateMetadata({ params }) {
  const { lang, slug } = await params;
  const project = findProjectBySlug(readProjectsSnapshot().projects, slug);

  return project ? projectMetadata(lang, project) : {};
}

export default async function LocalizedProjectRoute({ params }) {
  const { lang, slug } = await params;
  const { projects, generatedAt } = readProjectsSnapshot();
  const project = findProjectBySlug(projects, slug);

  if (!project) notFound();

  return (
    <ProjectPage
      project={project}
      projects={projects}
      locale={lang}
      generatedAt={generatedAt}
    />
  );
}
