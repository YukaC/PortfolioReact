import PageFrame, { localeMetadata } from "@/components/PageFrame";
import { fetchPinnedProjects } from "@/lib/fetch-pinned-projects";

/**
 * English home: `/`. Also the destination of the proxy's x-default.
 *
 * The page is a Server Component with exactly one job: read the projects
 * snapshot (a committed JSON file — no network, audit.md §17) and hand the
 * language to the frame. The composition itself lives in the `MotionRoot`
 * island, because the sections read the client locale context.
 *
 * `revalidate` is the snapshot cadence (§17): the HTML is prerendered at build
 * and refreshed every 6 h, and a visitor never waits for a render.
 */
export const revalidate = 21600;

export function generateMetadata() {
  return localeMetadata("en");
}

export default async function Home() {
  const projects = await fetchPinnedProjects();

  return <PageFrame locale="en" projects={projects} />;
}
