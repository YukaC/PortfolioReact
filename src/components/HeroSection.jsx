import Magnetic from "@/components/Magnetic";
import SplitHeading from "@/components/SplitHeading";
import SwapArrow from "@/components/SwapArrow";
import { useT } from "@/i18n/LocaleProvider";
import { scrollToSectionByHash } from "@/utils/scroll-to-section";

const STACK = ["React", "Next.js", "Tailwind", "Python", "PostgreSQL"];

/**
 * HeroSection - the practice statement, carried by type.
 *
 * No card: a status line, the headline split word by word, the lead, two CTAs
 * and the stack line. The depth cluster on the right is ornament only — it
 * answers the pointer and the scroll in layers, so the page still breathes
 * without a panel cutting the welcome in half.
 */
const HeroSection = () => {
  const { t } = useT();

  const handleCtaClick = (e, href) => {
    e.preventDefault();
    scrollToSectionByHash(href);
  };

  return (
    <section id="home" className="hero">
      <div className="site-shell">
        <div className="hero-copy">
          <span className="status" data-r="paint">
            <i aria-hidden="true" />
            {t("hero.status")}
          </span>

          <SplitHeading
            as="h1"
            className="hero-title"
            text={t("hero.title")}
            accent={t("hero.accent")}
            parallax
            reveal="paint"
            delayMs={120}
          />

          <p className="lead" data-r="paint" style={{ "--d": "520ms" }}>
            {t("hero.lead")}
          </p>

          <div className="hero-foot">
            <div>
              <div className="hero-actions" data-r="paint" style={{ "--d": "640ms" }}>
                <Magnetic>
                  <a
                    href="#portfolio"
                    className="btn btn-solid focus-ring"
                    onClick={(e) => handleCtaClick(e, "#portfolio")}
                  >
                    {t("hero.seeWork")}
                    <SwapArrow direction="r" />
                  </a>
                </Magnetic>
                <a
                  href="#contact"
                  className="btn focus-ring"
                  onClick={(e) => handleCtaClick(e, "#contact")}
                >
                  {t("hero.getInTouch")}
                </a>
              </div>

              <p className="stackline" data-r="paint" style={{ "--d": "760ms" }}>
                {STACK.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </p>
            </div>

            <div className="hero-ornament" aria-hidden="true">
              <i className="orn orn-orb" style={{ "--od": "1.6" }} />
              <i className="orn orn-ring" style={{ "--od": "-0.9" }} />
              <i className="orn orn-spark" style={{ "--od": "2.6" }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
