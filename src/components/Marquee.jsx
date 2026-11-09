import MarqueeMotion from "@/components/MarqueeMotion";
import { TECH_TAGS } from "@/data/constants";
import { translator } from "@/i18n/index.js";

/**
 * Technology band.
 *
 * Both tracks are the hero's own tag rows at display size: the tech names from
 * `TECH_TAGS` (language-neutral, so they are a constant) outlined, and the focus
 * words from the dictionary in the sky accent. One vocabulary on the page, two
 * scales.
 *
 * Two tracks travelling in opposite directions whose speed follows the scroll
 * velocity, with the whole band skewing as it accelerates. Decorative: it is
 * hidden from assistive tech and stops under reduced motion (the tracks stay
 * laid out, just still).
 *
 * The markup is a Server Component (docs/audit.md §16.2); the loop is the
 * `MarqueeMotion` island. Without a script the two tracks are simply laid out in
 * order — which is what they already look like under reduced motion.
 */
const Marquee = ({ locale = "en" }) => {
  const { t } = translator(locale);

  const rows = [
    { words: TECH_TAGS, dir: -1, variant: "mq-outline" },
    { words: t("hero.focus"), dir: 1, variant: "mq-accent" },
  ];

  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-inner">
        {rows.map((row) => (
          <div
            key={row.variant}
            className={`mq ${row.variant}`}
            data-mq=""
            data-dir={row.dir}
          >
            {[0, 1].map((copy) => (
              <div className="mq-track" key={copy}>
                {row.words.map((word) => (
                  <span key={word}>{word}</span>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
      <MarqueeMotion />
    </div>
  );
};

export default Marquee;
