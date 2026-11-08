import { notFound } from "next/navigation";
import ProjectPage from "@/components/ProjectPage";
import { readProjectsSnapshot } from "@/lib/projects-snapshot";
import { findProjectBySlug, projectSlug } from "@/lib/project-slugs";
import { projectMetadata } from "@/lib/seo";

/**
 * English project page: `/work/<slug>` (§24 S6).
 *
 * The closed set of routes is the snapshot's own list — `generateStaticParams`
 * maps every project to its slug and `dynamicParams = false` makes anything
 * else a 404 instead of an on-demand render of a project that does not exist.
 * That is the whole reason the audit asked for this after the App Router
 * migration: one URL per project costs a `generateStaticParams` and nothing
 * else.
 *
 * `revalidate` is the snapshot cadence (§17), so a refreshed project list
 * refreshes these pages with it.
 */
export const revalidate = 21600;
export const dynamicParams = false;

export function generateStaticParams() {
  return readProjectsSnapshot().projects.map((project) => ({
    slug: projectSlug(project),
  }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const project = findProjectBySlug(readProjectsSnapshot().projects, slug);

  return project ? projectMetadata("en", project) : {};
}

export default async function ProjectRoute({ params }) {
  const { slug } = await params;
  const { projects, generatedAt } = readProjectsSnapshot();
  const project = findProjectBySlug(projects, slug);

  if (!project) notFound();

  return (
    <ProjectPage
      project={project}
      projects={projects}
      locale="en"
      generatedAt={generatedAt}
    />
  );
}
