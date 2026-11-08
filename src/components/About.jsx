"use client";

import Icon from "@/components/Icon";
import AboutScroll from "@/components/AboutScroll";
import ProfileCard from "@/components/ProfileCard";
import { EDUCATION, SKILLS } from "@/data/constants";
import { GITHUB_USERNAME } from "@/data/projects";
import { translator } from "@/i18n/index.js";

/**
 * About - who writes the code, and where it was learned.
 *
 * Type first, and no entrance: the heading is set at `text-h3` in the heading
 * face and nothing in the section splits, rises or waits for a reveal, so the
 * copy is simply there — as it is for a reader whose script never runs. The
 * identity card takes the right column at `wide`, and drops under the copy when
 * the grid collapses, with the education rail below it.
 *
 * The education rail is the one thing that still moves, and it moves with the
 * scroll: `AboutScroll` scrubs `--tlp` over `.timeline` and lights each item as
 * it crosses the reading line, exactly as it did when the section also carried
 * the giant statement. The rail is now the only node that island finds.
 *
 * The timeline prefers `about.education` from the dictionary and falls back to
 * `EDUCATION` from `src/data/constants.js` when the translated array is missing
 * or empty, so a locale that lost the array still draws four entries. The
 * dictionary is the display copy (the visible range carries an en dash and the
 * fourth entry has no detail line); the constant is the copy the JSON-LD graph
 * and `llms.txt` publish, and it needs the ASCII range the date parser splits.
 *
 * A Client Component for one reason: `ProfileCard` carries hooks and has to stay
 * byte-exact, so it cannot declare the boundary itself, and a hook reached from
 * a Server Component throws at render. Everything the section prints is still
 * in the prerendered HTML — the card's client work is the pointer tilt, the flip
 * and the reduced-motion query.
 */
const About = ({ locale = "en" }) => {
  const { t } = translator(locale);

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
        <div className="grid grid-cols-1 gap-10 wide:grid-cols-2">
          <div>
            <p className="eyebrow">{t("about.eyebrow")}</p>
            <h2
              id="about-heading"
              className="mt-3 font-heading text-h3 text-paper"
            >
              {t("about.title")}
            </h2>
            <p className="mt-2 font-mono text-meta text-dim">
              {t("about.role")}
            </p>

            <p className="lead mt-6">{t("about.workP1")}</p>
            <p className="mt-4 text-mut">{t("about.workP2")}</p>

            <ul className="skill-chips" aria-label={t("about.skillsLabel")}>
              {SKILLS.map((skill) => (
                <li key={skill.name}>
                  <span>{skill.name}</span>
                </li>
              ))}
            </ul>

            <a
              href={`https://github.com/${GITHUB_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline focus-ring inline-flex items-center gap-1.5 text-sm text-white/75 hover:text-white"
            >
              {t("about.source")}
              <Icon name="arrow_forward" size={12} />
              <span className="sr-only">{t("a11y.newTab")}</span>
            </a>
          </div>

          <div>
            <ProfileCard />
          </div>
        </div>
      </div>

      {/* The studies sit under BOTH columns, not beside the copy: the rail reads
          as its own block, and `AboutScroll` still finds `.timeline` by class. */}
      <div className="site-shell mt-16 wide:mt-20">
        <h3 className="about-h3">{t("about.educationTitle")}</h3>
        <ol className="timeline" aria-label={t("about.educationTitle")}>
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
      </div>

      <AboutScroll />
    </section>
  );
};

export default About;
