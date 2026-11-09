import Link from "next/link";
import PageFrame from "@/components/PageFrame";
import Reveal from "@/components/Reveal";
import { CONTACT_EMAIL } from "@/data/constants";
import { translator } from "@/i18n/index.js";
import { homePath, privacyPageDescriptor } from "@/lib/seo";

/**
 * The privacy page: what the site measures, its one cookie, the host's logs and
 * what happens to an email. Same frame and type as a project page — the field,
 * the nav and the footer — with the copy in the locale dictionaries.
 */
const PrivacyPage = ({ locale = "en" }) => {
  const { t } = translator(locale);
  const sections = t("privacy.sections");

  return (
    <PageFrame locale={locale} page={privacyPageDescriptor(locale)}>
      <article className="section-y w-full" aria-labelledby="privacy-title">
        <div className="site-shell">
          <Reveal className="eyebrow">{t("privacy.title")}</Reveal>

          <h1 id="privacy-title" className="mt-6">
            {t("privacy.title")}
          </h1>

          <p className="lead mt-6">{t("privacy.lead")}</p>

          <div className="mt-12 grid gap-10 md:grid-cols-2">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="about-h3 max-w-none">{section.title}</h2>
                <p className="lead">{section.body}</p>
              </section>
            ))}
          </div>

          <p className="lead mt-12">
            {t("privacy.contact")}{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="focus-ring text-sky">
              {CONTACT_EMAIL}
            </a>
          </p>

          <div className="mt-[2.375rem] flex flex-wrap gap-3">
            <Link href={homePath(locale)} className="btn focus-ring">
              {t("errors.notFound.home")}
            </Link>
          </div>

          <p className="work-note">{t("privacy.updated")}</p>
        </div>
      </article>
    </PageFrame>
  );
};

export default PrivacyPage;
