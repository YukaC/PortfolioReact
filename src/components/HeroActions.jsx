"use client";

import SwapArrow from "@/components/SwapArrow";
import { useT } from "@/i18n/LocaleProvider";
import { scrollToSectionByHash } from "@/utils/scroll-to-section";

/**
 * The hero's two calls to action, and the whole reason the hero needs a script.
 *
 * Both anchors scroll to their section through Lenis instead of jumping, which
 * is the one thing markup cannot do — the island is that and nothing else. The
 * motion is the page's own button motion, shared with every other `.btn`
 * (`.lb` label roll plus the `SwapArrow` swap on `globals.css`): the hero used to
 * wrap its primary in `Magnetic`, and the drift read as a different button under
 * the same field. No CTA follows the pointer any more; the navbar's was the last
 * one and it went with the hero's.
 */
const HeroActions = () => {
  const { t } = useT();

  const handleClick = (e, href) => {
    e.preventDefault();
    scrollToSectionByHash(href);
  };

  return (
    <div
      className="mt-[2.375rem] flex flex-wrap gap-3"
      data-r="paint"
      style={{ "--d": "640ms" }}
    >
      <a
        href="#portfolio"
        className="btn btn-solid focus-ring"
        onClick={(e) => handleClick(e, "#portfolio")}
      >
        <span className="lb">
          <span data-t={t("hero.seeWork")}>{t("hero.seeWork")}</span>
        </span>
        <SwapArrow direction="r" />
      </a>
      <a
        href="#contact"
        className="btn focus-ring"
        onClick={(e) => handleClick(e, "#contact")}
      >
        <span className="lb">
          <span data-t={t("hero.getInTouch")}>{t("hero.getInTouch")}</span>
        </span>
        <SwapArrow direction="r" />
      </a>
    </div>
  );
};

export default HeroActions;
