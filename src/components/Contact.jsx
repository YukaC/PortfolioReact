import CopyButton from "@/components/CopyButton";
import Reveal from "@/components/Reveal";
import SplitHeading from "@/components/SplitHeading";
import SwapArrow from "@/components/SwapArrow";
import { CONTACT_EMAIL } from "@/data/constants";
import { translator } from "@/i18n/index.js";

/**
 * Contact - one address, offered plainly.
 *
 * The giant mail reads as the action and it is a plain `mailto:` link, so the
 * section works without a script; the copy button shadows it for readers who
 * would rather paste than open a mail client (docs/audit.md §16.2: server + a
 * `CopyButton` island).
 */
const Contact = ({ locale = "en" }) => {
  const { t } = translator(locale);

  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    t("contact.mailSubject"),
  )}`;

  return (
    <section
      id="contact"
      className="section-y w-full"
      aria-labelledby="contact-heading"
    >
      <div className="site-shell">
        <Reveal className="eyebrow">{t("contact.eyebrow")}</Reveal>
        <SplitHeading
          as="h2"
          id="contact-heading"
          text={t("contact.title")}
          accent={t("contact.accent")}
          delayMs={80}
        />
        <Reveal as="p" className="lead" delayMs={160}>
          {t("contact.lead")}
        </Reveal>

        <Reveal delayMs={220}>
          <a className="bigmail focus-ring" href={mailto}>
            <span>{CONTACT_EMAIL}</span>
            <SwapArrow direction="d" size={28} />
          </a>

          <CopyButton />
        </Reveal>
      </div>
    </section>
  );
};

export default Contact;
