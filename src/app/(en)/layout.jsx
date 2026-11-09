import RootShell, { rootMetadata, rootViewport } from "@/app/root-shell";

/**
 * Root layout for the English tree (`/`).
 *
 * The site has two root layouts because `<html lang>` is a property of the
 * route, and the App Router only lets a *root* layout render `<html>`. English
 * is the untranslated tree, so its document declares `en` statically: no
 * request-time API touches this layout, which is what keeps `/` a prerendered
 * page (docs/audit.md §16.3 A1/A5).
 */
export const metadata = rootMetadata;
export const viewport = rootViewport;

export default function EnglishRootLayout({ children }) {
  return <RootShell lang="en">{children}</RootShell>;
}
