"use client";

import Magnetic from "@/components/Magnetic";
import SwapArrow from "@/components/SwapArrow";
import { useT } from "@/i18n/LocaleProvider";
import { scrollToSectionByHash } from "@/utils/scroll-to-section";

/**
 * The hero's two calls to action, and the whole reason the hero needs a script.
 *
 * `Magnetic` follows the pointer with a spring and both anchors scroll to their
 * section through Lenis instead of jumping — two effects, one island, ~1 KB. The
 * statement, the split headline, the lead, the stack line and the ornament
 * cluster are markup and CSS, so `HeroSection` renders on the server and this is
 * all that hydrates (audit.md §16.2).
 */
const HeroActions = () => {
  const { t } = useT();

  const handleClick = (e, href) => {
    e.preventDefault();
    scrollToSectionByHash(href);
  };

  return (
    <div className="hero-actions" data-r="paint" style={{ "--d": "640ms" }}>
      <Magnetic>
        <a
          href="#portfolio"
          className="btn btn-solid focus-ring"
          onClick={(e) => handleClick(e, "#portfolio")}
        >
          {t("hero.seeWork")}
          <SwapArrow direction="r" />
        </a>
      </Magnetic>
      <a
        href="#contact"
        className="btn focus-ring"
        onClick={(e) => handleClick(e, "#contact")}
      >
        {t("hero.getInTouch")}
      </a>
    </div>
  );
};

export default HeroActions;
