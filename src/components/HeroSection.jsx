import HeroActions from "@/components/HeroActions";
import SplitHeading from "@/components/SplitHeading";
import { translator } from "@/i18n/index.js";

const STACK = ["React", "Next.js", "Tailwind", "Python", "PostgreSQL"];

/**
 * HeroSection - the practice statement, carried by type.
 *
 * No card: a status line, the headline split word by word, the lead, two CTAs
 * and the stack line. The depth cluster on the right is ornament only — it
 * answers the pointer and the scroll in layers, so the page still breathes
 * without a panel cutting the welcome in half.
 *
 * A Server Component (audit.md §16.2): every word above the fold is copy and
 * CSS, and the reveal that used to hide it until hydration is a stylesheet
 * state now. Only the CTAs hydrate — `HeroActions` — because a smooth-scroll
 * handler is the one thing markup cannot do; their motion is the page's own
 * button motion (`.lb` roll plus `SwapArrow`), not a hero-only effect.
 */
const HeroSection = ({ locale = "en" }) => {
  const { t } = translator(locale);

  return (
    <section
      id="home"
      className="relative flex min-h-svh items-center pt-[8.125rem] pb-[4.375rem]"
    >
      <div className="site-shell">
        <div className="hero-copy">
          {/* `status` is not decoration: it is the class the stylesheet's dot
              and its pulse hang off (`.status i` + `.status i::before`, and the
              reduced-motion reset that silences both). The layout and the type
              stay inline utilities; without the class the `<i>` is an empty box
              and the live indicator disappears. */}
          <span
            className="status inline-flex items-center gap-2.5 text-[0.8125rem] text-mut"
            data-r="paint"
          >
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

          <div className="relative mt-10">
            <div>
              <HeroActions />

              <p
                className="stackline"
                data-r="paint"
                style={{ "--d": "760ms" }}
              >
                {STACK.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </p>
            </div>

            <div
              className="absolute right-0 bottom-0 h-72 w-[min(32%,24rem)] pointer-events-none max-wide:hidden"
              aria-hidden="true"
            >
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
