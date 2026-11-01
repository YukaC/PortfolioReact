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
 * About - how the work happens, and where it was learned.
 *
 * The statement lights up word by word as it crosses the viewport and the
 * education timeline draws itself down the rail; both are scroll driven, so
 * the section reads as one gesture. The portrait lives here now that the hero
 * belongs to the type.
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
  const educationItems = EDUCATION.map((item, index) => ({
    ...item,
    ...(Array.isArray(translatedEducation) ? translatedEducation[index] : null),
  }));

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

            <div className="about-copy">
              <p>
                <strong>{t("about.introStrong")}</strong> {t("about.introRest")}
              </p>
              <p>{t("about.offClock")}</p>
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
                  <p className="timeline-desc">{item.description}</p>
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
