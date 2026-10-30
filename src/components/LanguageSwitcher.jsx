import { LOCALE_LABELS, SUPPORTED_LOCALES } from "@/i18n/locale";
import { useT } from "@/i18n/LocaleProvider";

/**
 * Language switcher.
 *
 * Each option is a plain anchor to `/?lang=<code>`: a full navigation, so the
 * middleware can persist the choice in the cookie and the server can answer with
 * the matching prerendered page. Client-side routing here would only swap text
 * and never write the cookie.
 *
 * The visible label is the short code; the accessible name is the language in
 * its own language, and `lang` on the link keeps screen readers switching voice.
 */
const LanguageSwitcher = ({ className = "" }) => {
  const { locale, t } = useT();

  return (
    <nav
      aria-label={t("switcher.label")}
      className={`flex items-center gap-0.5 rounded-full border border-white/15 px-1 py-1 font-mono text-[0.625rem] uppercase tracking-[0.14em] ${className}`}
    >
      {SUPPORTED_LOCALES.map((code) => {
        const isCurrent = code === locale;

        return (
          <a
            key={code}
            href={`/?lang=${code}`}
            hrefLang={code}
            lang={code}
            aria-label={LOCALE_LABELS[code]}
            aria-current={isCurrent ? "true" : undefined}
            title={LOCALE_LABELS[code]}
            className={`focus-ring rounded-full px-1.5 py-0.5 transition-colors ${
              isCurrent
                ? "bg-white/10 text-white"
                : "text-white/55 hover:text-white/90"
            }`}
          >
            {code.toUpperCase()}
          </a>
        );
      })}
    </nav>
  );
};

export default LanguageSwitcher;
