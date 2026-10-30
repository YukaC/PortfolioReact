import { useEffect, useRef, useState } from "react";
import Reveal from "@/components/Reveal";
import SplitHeading from "@/components/SplitHeading";
import SwapArrow from "@/components/SwapArrow";
import { CONTACT_EMAIL } from "@/data/constants";
import { useT } from "@/i18n/LocaleProvider";

/**
 * Contact - one address, offered plainly.
 *
 * The giant mail reads as the action; the copy button shadows it for readers
 * who would rather paste than open a mail client. The confirmation is
 * announced through a live region, not just by the label that rolls.
 */
const Contact = () => {
  const { t } = useT();
  const [status, setStatus] = useState("idle");
  const resetRef = useRef(0);

  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    t("contact.mailSubject"),
  )}`;

  useEffect(() => () => window.clearTimeout(resetRef.current), []);

  const copyAddress = async () => {
    window.clearTimeout(resetRef.current);
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setStatus("copied");
    } catch {
      setStatus("manual");
    }
    resetRef.current = window.setTimeout(() => setStatus("idle"), 1800);
  };

  const label =
    status === "copied"
      ? t("contact.copied")
      : status === "manual"
        ? t("contact.manual")
        : t("contact.copy");

  const announcement =
    status === "copied"
      ? t("contact.copiedAnnouncement")
      : status === "manual"
        ? t("contact.manualAnnouncement")
        : "";

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

          <div className="contact-actions">
            <button
              id="copy-address"
              type="button"
              className={`btn focus-ring${status === "copied" ? " btn-ok" : ""}`}
              onClick={copyAddress}
            >
              <span className="lb">
                <span data-t={label}>{label}</span>
              </span>
            </button>
          </div>

          <p className="sr-only" role="status">
            {announcement}
          </p>
        </Reveal>
      </div>
    </section>
  );
};

export default Contact;
