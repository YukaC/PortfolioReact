import { useEffect, useRef, useState } from "react";
import Reveal from "@/components/Reveal";
import SplitHeading from "@/components/SplitHeading";
import SwapArrow from "@/components/SwapArrow";
import { CONTACT_EMAIL } from "@/data/constants";
import { useT } from "@/i18n/LocaleProvider";

/**
 * Selection-based copy for origins without the Async Clipboard API.
 *
 * Restores whatever the reader had selected, because the trick moves the
 * selection to a hidden textarea for the duration of the call.
 */
function legacyCopy(text) {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.setAttribute("aria-hidden", "true");
    area.style.cssText =
      "position:fixed;top:0;left:-9999px;width:1px;height:1px;opacity:0";
    document.body.appendChild(area);

    const selection = document.getSelection();
    const previous =
      selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    area.select();
    area.setSelectionRange(0, text.length);
    const copied = document.execCommand("copy");

    area.remove();
    if (previous && selection) {
      selection.removeAllRanges();
      selection.addRange(previous);
    }

    return copied;
  } catch {
    return false;
  }
}

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

  /**
   * Copy the address, with a path that survives an insecure origin.
   *
   * `navigator.clipboard` only exists in a secure context, so a phone opening the
   * dev server over the LAN (`http://192.168.x.x:3000`) has no Async Clipboard
   * API at all and every click fell through to "select it above". The legacy
   * textarea + `execCommand` path works there, and it runs before any `await` so
   * the click still counts as the user gesture the browser asks for.
   */
  const copyAddress = () => {
    window.clearTimeout(resetRef.current);

    const settle = (next) => {
      setStatus(next);
      resetRef.current = window.setTimeout(() => setStatus("idle"), 1800);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(CONTACT_EMAIL).then(
        () => settle("copied"),
        () => settle(legacyCopy(CONTACT_EMAIL) ? "copied" : "manual"),
      );
      return;
    }

    settle(legacyCopy(CONTACT_EMAIL) ? "copied" : "manual");
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

          {/* Copying needs a script. The giant `mailto:` above already offers
              the address, so this button is hidden rather than lying to a
              scriptless visitor (audit.md §10 P1-7). */}
          <div className="contact-actions js-only">
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
