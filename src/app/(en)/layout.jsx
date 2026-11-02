import RootShell, { rootMetadata, rootViewport } from "@/app/root-shell";
import PerfTestMeter from "@/components/PerfTestMeter";

/**
 * Root layout for the English tree (`/`).
 *
 * The site has two root layouts because `<html lang>` is a property of the
 * route, and the App Router only lets a *root* layout render `<html>`. English
 * is the untranslated tree, so its document declares `en` statically: no
 * request-time API touches this layout, which is what keeps `/` a prerendered
 * page (audit.md §16.3 A1/A5).
 *
 * The measuring overlay (`PerfTestMeter`) sits beside `{children}` inside
 * `RootShell`: it renders nothing outside development, and it decides on the
 * client whether this tab is a `/test` session, so the layout still reads no
 * request-time API.
 */
export const metadata = rootMetadata;
export const viewport = rootViewport;

export default function EnglishRootLayout({ children }) {
  return (
    <RootShell lang="en">
      {children}
      <PerfTestMeter />
    </RootShell>
  );
}
