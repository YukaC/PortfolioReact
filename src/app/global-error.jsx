"use client";

import { useSyncExternalStore } from "react";
import ErrorScreen, { homeHref } from "@/components/ErrorScreen";
import { translator } from "@/i18n/index.js";
import { htmlLangFromPath } from "@/i18n/locale";

const noSubscription = () => () => {};
const clientPath = () => window.location.pathname;
const serverPath = () => "/";

/**
 * 500 for the whole site: what renders when a root layout or a page throws.
 *
 * An error boundary is a client component, so it cannot export metadata and
 * cannot read request headers; the language comes from the address the reader
 * is on (`/es/...`, `/pt/...`, English otherwise), which is the language the
 * failed page was going to speak.
 */
export default function GlobalError({ retry, reset }) {
  /* The prerendered 500 has no address to read, so it hydrates as English and
     re-renders in the reader's language right after, without a mismatch. */
  const path = useSyncExternalStore(noSubscription, clientPath, serverPath);
  const { locale, t } = translator(htmlLangFromPath(path));
  const again = typeof retry === "function" ? retry : reset;

  return (
    <ErrorScreen
      lang={locale}
      code="500"
      title={t("errors.server.title")}
      accent={t("errors.server.accent")}
      lead={t("errors.server.lead")}
    >
      <title>{`500 — ${t("errors.server.title").replace(/\s+/g, " ")}`}</title>
      <button
        type="button"
        className="btn btn-solid focus-ring"
        onClick={() => again?.()}
      >
        {t("errors.server.retry")}
      </button>
      {/* A plain anchor: a full navigation is the reliable way out of a broken tree. */}
      <a href={homeHref(locale)} className="btn focus-ring">
        {t("errors.server.home")}
      </a>
    </ErrorScreen>
  );
}
