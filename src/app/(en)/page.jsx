import PageFrame, { localeMetadata } from "@/components/PageFrame";
import { readProjectsSnapshot } from "@/lib/projects-snapshot";

/**
 * English home: `/`. Also the destination of the proxy's x-default.
 *
 * The page is a Server Component with exactly one job: read the projects
 * snapshot (a committed JSON file — no network, audit.md §17) and hand the
 * language plus the snapshot's date to the frame. The composition itself lives
 * in the `MotionRoot` island, because the sections read the client locale
 * context. The date is what the JSON-LD publishes as `dateModified` and what the
 * project pages print as "last updated" (§24 S4/S6), so it comes from the same
 * read as the projects and can never be a second opinion.
 *
 * `revalidate` is the snapshot cadence (§17): the HTML is prerendered at build
 * and refreshed every 6 h, and a visitor never waits for a render.
 */
export const revalidate = 21600;

export function generateMetadata() {
  return localeMetadata("en");
}

export default function Home() {
  const { projects, generatedAt } = readProjectsSnapshot();

  return (
    <PageFrame locale="en" projects={projects} generatedAt={generatedAt} />
  );
}
