import RootShell, { rootMetadata, rootViewport } from "@/app/root-shell";
import { DEFAULT_LOCALE, normalizeLocale } from "@/i18n/locale";

/**
 * Root layout for the translated tree (`/es`, `/pt`).
 *
 * `<html lang>` is the dynamic segment itself: `/es` is generated from
 * `{ lang: "es" }`, so the prerendered document says `es` before any script
 * runs. `generateStaticParams` + `dynamicParams = false` on the page are what
 * make the set of languages closed — a segment the page did not generate is a
 * 404, not a per-request render of an unknown locale.
 */
export const metadata = rootMetadata;
export const viewport = rootViewport;

export default async function LocalizedRootLayout({ children, params }) {
  const { lang } = await params;
  const locale = normalizeLocale(lang)?.locale ?? DEFAULT_LOCALE;

  return <RootShell lang={locale}>{children}</RootShell>;
}
