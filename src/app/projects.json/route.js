import { readProjectsSnapshot } from "@/lib/projects-snapshot";

/**
 * §24 S5 — `/projects.json`: the snapshot, as JSON, at a stable URL.
 *
 * The site already serves `src/data/pinned-projects.json` as its only project
 * data (§17: validated, atomic, no network at build or render). This route
 * publishes exactly that object over HTTP so an agent or an AI Overview can
 * read the facts without parsing the markup: the same six items, the same
 * `generatedAt`, and nothing else.
 *
 * The file's `$comment` (a note to whoever edits the file by hand) is dropped
 * from the response: it describes the repository's process, not the data, and
 * an API payload should not carry instructions aimed at a person.
 *
 * `force-static` keeps it a build artefact of the snapshot, refreshed on the
 * same window as the pages.
 */
export const dynamic = "force-static";
export const revalidate = 21600;

export function GET() {
  const { generatedAt, projects } = readProjectsSnapshot();

  return new Response(`${JSON.stringify({ generatedAt, projects }, null, 2)}\n`, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}
