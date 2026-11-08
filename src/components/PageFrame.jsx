import About from "@/components/About";
import Contact from "@/components/Contact";
import HeroSection from "@/components/HeroSection";
import Layout from "@/components/Layout";
import Marquee from "@/components/Marquee";
import MotionRoot from "@/components/MotionRoot";
import WorkList from "@/components/WorkList";
import { localizeProjects } from "@/lib/project-i18n";
import {
  homeMetadata,
  homePageDescriptor,
  localeUrl,
  siteGraph,
} from "@/lib/seo";

/**
 * Frame every page shares: metadata, structured data, the shell and the page's
 * own content — all server-rendered, with `MotionRoot` as the one client island
 * around them (audit.md §16.2).
 *
 * The head and the graph are no longer built here (§24): `src/lib/seo.js` owns
 * them, so the same functions that answer for a project page answer for the
 * home, the sitemap and the unit suite, and this component only decides which
 * descriptor a page hands over.
 *
 * `page` is that descriptor — `{ url, type, name, description }` plus, for a
 * project, the project node and the four Q&A. Without it the frame is the home
 * page: a `ProfilePage` whose `mainEntity` is the `Person` and whose `hasPart`
 * is the work list.
 *
 * `children` lets a route that is not the home composition (a project page, the
 * 404) reuse the shell without pulling the sections in.
 */

/**
 * Absolute URL of a locale's home. `/` is English.
 * Kept as a named export because the routes import it.
 */
export { localeUrl };

/**
 * The home `<head>`, per locale.
 *
 * The fourteen metas the site has always shipped, attribute for attribute
 * (audit.md §16.3 A3): title, description, author, canonical, the four
 * `hreflang` alternates, the Open Graph block with its `og:image:alt`, and the
 * Twitter card. The author, the coordinates, the icons and `theme-color` are
 * language-independent and live in `src/app/root-shell.jsx`; `metadataBase`
 * there is what makes these URLs absolute.
 *
 * @param {string} locale
 * @returns {import("next").Metadata}
 */
export function localeMetadata(locale) {
  return homeMetadata(locale);
}

/**
 * Structured data, rendered by the server.
 *
 * It is a `<script>` in the body rather than in `<head>` because the App Router
 * owns the head; both positions are valid JSON-LD and every consumer parses the
 * document, not a position. `<` is escaped so a payload can never close the
 * element it lives in.
 */
const PageStructuredData = ({ locale, projects, generatedAt, page }) => {
  const graph = siteGraph({
    locale,
    ...(page ?? homePageDescriptor(locale)),
    projects,
    generatedAt,
  });

  const json = JSON.stringify(graph).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
};

/**
 * The home composition, on the server.
 *
 * Five sections, one per beat of the page. All five are Server Components: the
 * copy is in the HTML, the reveals are CSS, and each one embeds the single small
 * island it actually needs (`HeroActions`, `MarqueeMotion`, `WorkFilters`,
 * `AboutScroll`, `CopyButton`). That is the shape audit.md §16.2 asks for, and
 * it is the shape that pays for the migration — the static text stops being
 * client JavaScript.
 *
 * Project copy is localized here, once, with the same pure helper the client used
 * to call, so the rows the island filters are already in the reader's language.
 */
const HomeSections = ({ locale, projects }) => {
  const localized = localizeProjects(projects, locale);

  return (
    <>
      <HeroSection locale={locale} />
      <Marquee locale={locale} />
      <WorkList projects={localized} locale={locale} />
      <About locale={locale} />
      <Contact locale={locale} />
    </>
  );
};

const PageFrame = ({
  locale = "en",
  projects = [],
  generatedAt = null,
  page = null,
  children = null,
}) => (
  <>
    <PageStructuredData
      locale={locale}
      projects={projects}
      generatedAt={generatedAt}
      page={page}
    />
    <MotionRoot locale={locale}>
      <Layout locale={locale}>
        {children ?? <HomeSections locale={locale} projects={projects} />}
      </Layout>
    </MotionRoot>
  </>
);

export default PageFrame;
