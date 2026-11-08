import HeroActions from "@/components/HeroActions";
import SplitHeading from "@/components/SplitHeading";
import { TECH_TAGS } from "@/data/constants";
import { translator } from "@/i18n/index.js";

/**
 * HeroSection - the practice statement, carried by type.
 *
 * No card: a status line, the heading, the subtitle, the lead, two CTAs and the
 * two tag rows. The depth cluster on the right is ornament only — it answers the
 * pointer and the scroll in layers, so the page still breathes without a panel
 * cutting the welcome in half.
 *
 * The `h1` is the name with the role as its second line, inside the heading: the
 * outline then reads "Agustín Ciucani desarrollador full-stack" as one entry, and
 * the grey line is the secondary-type token rather than a separate paragraph. The
 * sentence that used to be the headline is the subtitle now, and it keeps the
 * word-by-word split and the sky accent — `SplitHeading` renders it as a heading
 * of its own (`h2`), because it keeps the plain sentence as `aria-label` and marks
 * its split words `aria-hidden`, and only an element that can carry a name is
 * allowed to do that: as a `<p>` the subtitle would be silent to a screen reader.
 * The page still has exactly one `h1`.
 *
 * The two tag rows are the hero half of the band's vocabulary (`Marquee` renders
 * the same two lists at display size): one `stackline` recipe, two lines, the tech
 * names from the shared constant and the focus words from the dictionary.
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

          <h1
            className="hero-title"
            data-r="paint"
            style={{ "--d": "120ms" }}
          >
            <span className="block">{t("hero.name")}</span>
            {/* The role is a subtitle, not a second headline: it keeps the `h1`
                pairing the brief asks for but drops to the lead size in the body
                face, so the sentence below can carry more weight than it. */}
            <span className="mt-2 block text-lead font-normal tracking-normal text-dim">
              {t("hero.role")}
            </span>
          </h1>

          <SplitHeading
            as="h2"
            className="font-heading text-statement text-paper"
            text={t("hero.title")}
            accent={t("hero.accent")}
            reveal="paint"
            delayMs={320}
          />

          <p className="lead mt-4" data-r="paint" style={{ "--d": "520ms" }}>
            {t("hero.lead")}
          </p>

          <div className="relative mt-10">
            <div>
              <HeroActions />

              {/* One recipe, two rows: the tech names are not copy (`TECH_TAGS`),
                  the focus words are. Each row is its own line so the separator
                  never opens a wrapped line. */}
              <div
                className="stackline"
                data-r="paint"
                style={{ "--d": "760ms" }}
              >
                <p className="min-[72rem]:whitespace-nowrap">
                  {TECH_TAGS.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </p>
                <p className="mt-1.5 min-[72rem]:whitespace-nowrap">
                  {t("hero.focus").map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </p>
              </div>
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
