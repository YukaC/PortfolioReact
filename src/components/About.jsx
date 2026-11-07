import Image from "next/image";
import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";
import SplitHeading from "@/components/SplitHeading";
import SwapArrow from "@/components/SwapArrow";
import AboutScroll from "@/components/AboutScroll";
import {
  EDUCATION,
  PERSON_LOCALITY,
  SITE_NAME,
  SKILLS,
  SOCIAL_LINKS,
} from "@/data/constants";
import { translator } from "@/i18n/index.js";

const PROFILE_BLUR =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAACjlBMVEXx8PXw7/Tx7/bx8Pbz8ff9+//q5u23sbazrbLKxcv7+f/z8Pft6/Lt6/Hr6/Dq6fDy8fXy8Pfv7vSvqa1IPz4wJSMjGxk7MzOUjpLh3uXx7vXt6vHs6/Hy8fbw7/X8/f+lnJ8fExEQDAwYExMRDQ0QDAsIAQBRS0vv7PPs6fHr6vDz8vfy8ff+/f9yamsQBwVcPzeQZFVsRz1KMSsSCwhAOjrw7fTv7PTt6fHy8vj///9/e4BqSkD/0Lj/xa3pp43koopfPzVcV1n9+v/u6/Lz8vj9/f/Du77DloTDoJXWq5vhr5ypgHOWalykmJj49//u6/Ps6vHz8/j08vj29/7u0szDl4d+WU+ccGKZcGNgQjuPZ1vKqqTy8fju7PP08/j2+f/u0MnnsZzeqJXosJ7OloW8hnTBinfQq6T09f3v6/Pz8/f29f3x6u7wxrb1wrDWoZCoeWrIjnvHkn/bzs/19Pzt6vLr6vL18vnz9f3fvbLRmoSpcGWNV0+PXk6nf3Ln5Ovr6fH4+f/YysmzgG3cn429gHF7UEKsnJ39/P/q5+7x7/Xv7fPy8Pb//P/3+P/Xw8CxgW56WU9jRj51T0O2nZjo6PH/+//u7fPn5u7o5+7w7vX8+f739fq/vshSWHGjf3b8wKOsf295Uke0f2ytd2JGQlGZmqjk4er29Pvr6PD29fuzs8FWWXEiJT8ZID1bUV3uuaDqsJfFi3TNk3qAYFkRFSsRFSs2OE2IiZnX1t9qboMjKUcdIjwpLUcxNlEgKENPRlSQcW2PbmlbSk8bHzQhJj0jJz0dIjoYHTc4O1IzOlUpLkogJDooLEcrMEsrL0keJkEVHTcXHjYWHTYiJj4fIzsiKEAkKUEcITjvs/CJAAABG0lEQVQY0wEQAe/+AAABAgMEBQYHCAkKCwwNDg8AEAARBBITFBUWFxgZGhscDwAdHR4fICEiIyQlJicaKCkqACssAy0uLzAxMjM0NTY3OCkAKzkeOjs8PT4/QEFCQxtEOABFRQRGR0hJSktMTU5PG1BRAFJSU1RVVldYWVpbXF1eUCkAX0VTYGFiY2RlZmdoaWpQUQBSa0VsbW5vcHFyc3R1RHZ3AEVFUnh5ent8fX5/gBEodoEABCxFEoKDhIWGh4iJilBRDwCLjI2Oj5CRkpOUlZaXmJmaAJucnZ6foKGio6SlpqeoqaoAq6ytrq+wsbKztLW2t7i5ugC7vL2+v8DBwsPExcbHyMnKAMvMzc7P0NHS09TG1dbX2Nn+H2RDDsWRswAAAABJRU5ErkJggg==";

/**
 * The work subsection's code block. It is source, not copy: `rol`, `stack` and
 * `entrega` are what the owner wrote, so it is not translated per locale and it
 * is not interpolated from anything.
 */
const ABOUT_CODE = `const agustin = {
  rol: 'full-stack',
  stack: ['React', 'Next.js', 'Node', 'Python'],
  entrega: 'de punta a punta'
};`;

/**
 * About - how the work happens, and where it was learned.
 *
 * The statement lights up word by word as it crosses the viewport and the
 * education timeline draws itself down the rail; both are scroll driven, so
 * the section reads as one gesture. The portrait lives here now that the hero
 * belongs to the type.
 *
 * The timeline prefers `about.education` from the dictionary and falls back to
 * `EDUCATION` from `src/data/constants.js` when the translated array is missing
 * or empty, so a locale that lost the array still draws four entries. The
 * dictionary is the display copy (the visible range carries an en dash and the
 * fourth entry has no detail line); the constant is the copy the JSON-LD graph
 * and `llms.txt` publish, and it needs the ASCII range the date parser splits.
 *
 * A Server Component (audit.md §16.2): the statement, the chips, the portrait
 * and the timeline are copy, and all the scroll does is set two custom
 * properties on them. `AboutScroll` is the island that owns that — it finds the
 * two nodes and scrubs them, so the section itself ships no script.
 */
const About = ({ locale = "en" }) => {
  const { t } = translator(locale);

  const statement = t("about.statement");
  const statementWords = statement.split(/\s+/);
  const translatedEducation = t("about.education");
  const educationItems =
    Array.isArray(translatedEducation) && translatedEducation.length > 0
      ? translatedEducation
      : EDUCATION;

  return (
    <section
      id="about"
      className="section-y w-full"
      aria-labelledby="about-heading"
    >
      <div className="site-shell">
        <Reveal className="eyebrow">{t("about.eyebrow")}</Reveal>
        <SplitHeading
          as="h2"
          id="about-heading"
          text={t("about.title")}
          accent={t("about.accent")}
          delayMs={80}
        />

        <p className="statement" aria-label={statement}>
          {statementWords.map((word, index) => (
            <span key={`${word}-${index}`}>
              <span className="sw" aria-hidden="true">
                {word}
              </span>
              {index < statementWords.length - 1 ? " " : null}
            </span>
          ))}
        </p>

        <div className="mt-14 grid grid-cols-1 gap-[clamp(2.5rem,8vw,6.875rem)] wide:grid-cols-2">
          <Reveal>
            <div className="about-portrait">
              <Image
                src="/profile-hero.webp"
                alt={t("about.portraitAlt", { name: SITE_NAME })}
                width={112}
                height={112}
                quality={70}
                loading="lazy"
                placeholder="blur"
                blurDataURL={PROFILE_BLUR}
                sizes="56px"
                className="object-cover"
              />
              <div>
                <p className="about-portrait-name">{SITE_NAME}</p>
                <p className="about-portrait-role">
                  {t("about.role")} · {PERSON_LOCALITY}
                </p>
              </div>
              <div className="about-socials">
                {SOCIAL_LINKS.map((link) => (
                  <a
                    key={link.platform}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring"
                    aria-label={t("about.socialAria", { name: link.name })}
                  >
                    <Icon name={link.platform} size={16} />
                  </a>
                ))}
              </div>
            </div>

            <h3 className="about-h3">{t("about.workTitle")}</h3>

            {/* Source, so it keeps its own framing: one mono block on the
                field, the same tokens the chips and the meta rows use. */}
            <pre className="mb-7 overflow-x-auto rounded-card border border-white/10 bg-white/5 p-4 font-mono text-meta text-mut [line-height:1.7]"><code>{ABOUT_CODE}</code></pre>

            <div className="about-copy">
              <p>{t("about.workP1")}</p>
              <p>{t("about.workP2")}</p>
            </div>

            <ul className="skill-chips" aria-label={t("about.skillsLabel")}>
              {SKILLS.map((skill) => (
                <li key={skill.name}>
                  <span>{skill.name}</span>
                </li>
              ))}
            </ul>

            <a
              href="https://github.com/YukaC"
              target="_blank"
              rel="noopener noreferrer"
              className="btn focus-ring"
            >
              <span className="lb">
                <span data-t={t("about.source")}>{t("about.source")}</span>
              </span>
              <SwapArrow direction="d" />
              <span className="sr-only">{t("a11y.newTab")}</span>
            </a>
          </Reveal>

          <Reveal delayMs={150}>
            <h3 className="about-h3">{t("about.educationTitle")}</h3>
            <ol
              className="timeline"
              aria-label={t("about.educationTitle")}
            >
              {educationItems.map((item) => (
                <li key={item.title} className="timeline-item">
                  <span className="timeline-period">{item.period}</span>
                  <h4 className="timeline-title">{item.title}</h4>
                  <span className="timeline-org">{item.company}</span>
                  {/* The last entry has no detail line: the brief gives none,
                      and an empty paragraph would leave a gap in the rail. */}
                  {item.description ? (
                    <p className="timeline-desc">{item.description}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </div>

      <AboutScroll />
    </section>
  );
};

export default About;
