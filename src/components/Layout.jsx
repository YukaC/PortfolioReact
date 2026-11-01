import AppBackground from "./AppBackground";
import Footer from "./Footer";
import Navbar from "./Navbar";
import { translator } from "@/i18n/index.js";

/**
 * Page shell: everything that has to sit *around* the sections.
 *
 * A Server Component, like the sections it wraps (audit.md §16.2). What it
 * renders is structure and one string, so the only thing that crosses to the
 * client from here is the markup the islands stand in: `AppBackground`,
 * `Navbar` and `Footer` are the three islands that are always on screen and
 * always animate, and a Client Component can be a child of a Server Component
 * without dragging the shell along.
 *
 * The document head it used to own (`next/head`, 40 lines of `<meta>`, the
 * JSON-LD script) moved to the server metadata in `PageFrame` and
 * `src/app/root-shell.jsx`; the motion hooks moved to `MotionRoot`. Nothing else
 * changed: the same field behind the same stacking context, the same reading
 * bar, the same skip link, the same `<main>` and the same footer, in the same
 * order.
 */
const Layout = ({ locale = "en", children }) => {
  const { t } = translator(locale);

  return (
    <div className="relative min-h-[100dvh] bg-ink text-white">
      <div className="field-progress" aria-hidden="true">
        <span />
      </div>
      <a href="#main-content" className="skip-link">
        {t("a11y.skipToContent")}
      </a>
      <AppBackground />
      <div className="relative z-10">
        <Navbar />
        <main
          id="main-content"
          className="flex w-full flex-col items-center"
          tabIndex={-1}
        >
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
