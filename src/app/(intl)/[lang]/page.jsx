import PageFrame, { localeMetadata } from "@/components/PageFrame";
import { readProjectsSnapshot } from "@/lib/projects-snapshot";
import { SUPPORTED_LOCALES } from "@/i18n/locale";

/**
 * Translated home: `/es` and `/pt`.
 *
 * Both languages come from the one route — `generateStaticParams` is the closed
 * set, `dynamicParams = false` makes anything else a 404 instead of an on-demand
 * render of an unknown locale (docs/audit.md §16.4). The proxy still decides which of
 * these answers `/`; the URL the reader sees never carries the language.
 *
 * `revalidate` is the snapshot cadence (§17), and `readProjectsSnapshot` reads
 * the committed JSON: the build talks to no host at all. The snapshot's date
 * travels with the projects into the frame, so the JSON-LD's `dateModified` and
 * the project pages' "last updated" are the same fact in every language.
 */
export const revalidate = 21600;
export const dynamicParams = false;

export function generateStaticParams() {
  return SUPPORTED_LOCALES.filter((locale) => locale !== "en").map((lang) => ({
    lang,
  }));
}

export async function generateMetadata({ params }) {
  const { lang } = await params;

  return localeMetadata(lang);
}

export default async function LocalizedHome({ params }) {
  const { lang } = await params;
  const { projects, generatedAt } = readProjectsSnapshot();

  return (
    <PageFrame locale={lang} projects={projects} generatedAt={generatedAt} />
  );
}
