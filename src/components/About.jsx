import { useEffect, useRef } from "react";
import Image from "next/image";
import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";
import SplitHeading from "@/components/SplitHeading";
import SwapArrow from "@/components/SwapArrow";
import {
  EDUCATION,
  PERSON_JOB_TITLE,
  PERSON_LOCALITY,
  SITE_NAME,
  SKILLS,
  SOCIAL_LINKS,
} from "@/data/constants";
import { prefersReducedMotion } from "@/motion/prefersReducedMotion";
import { registerMotion, ScrollTrigger } from "@/motion/register";

const PROFILE_BLUR =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAACjlBMVEXx8PXw7/Tx7/bx8Pbz8ff9+//q5u23sbazrbLKxcv7+f/z8Pft6/Lt6/Hr6/Dq6fDy8fXy8Pfv7vSvqa1IPz4wJSMjGxk7MzOUjpLh3uXx7vXt6vHs6/Hy8fbw7/X8/f+lnJ8fExEQDAwYExMRDQ0QDAsIAQBRS0vv7PPs6fHr6vDz8vfy8ff+/f9yamsQBwVcPzeQZFVsRz1KMSsSCwhAOjrw7fTv7PTt6fHy8vj///9/e4BqSkD/0Lj/xa3pp43koopfPzVcV1n9+v/u6/Lz8vj9/f/Du77DloTDoJXWq5vhr5ypgHOWalykmJj49//u6/Ps6vHz8/j08vj29/7u0szDl4d+WU+ccGKZcGNgQjuPZ1vKqqTy8fju7PP08/j2+f/u0MnnsZzeqJXosJ7OloW8hnTBinfQq6T09f3v6/Pz8/f29f3x6u7wxrb1wrDWoZCoeWrIjnvHkn/bzs/19Pzt6vLr6vH18vnz9f3fvbLRmoSpcGWNV0+PXk6nf3Ln5Ovr6fH4+f/YysmzgG3cn429gHF7UEKsnJ39/P/q5+7x7/Xv7fPy8Pb//P/3+P/Xw8CxgW56WU9jRj51T0O2nZjo6PH/+//u7fPn5u7o5+7w7vX8+f739fq/vshSWHGjf3b8wKOsf295Uke0f2ytd2JGQlGZmqjk4er29Pvr6PD29fuzs8FWWXEiJT8ZID1bUV3uuaDqsJfFi3TNk3qAYFkRFSsSFSs2OE2IiZnX1t9qboMjKUcdIjwpLUcxNlEgKENPRlSQcW2PbmlbSk8bHzQhJj0jJz0dIjoYHTc4O1IzOlUpLkogJDooLEcrMEsrL0keJkEVHTcXHjYWHTYiJj4fIzsiKEAkKUEcITjvs/CJAAABG0lEQVQY0wEQAe/+AAABAgMEBQYHCAkKCwwNDg8AEAARBBITFBUWFxgZGhscDwAdHR4fICEiIyQlJicaKCkqACssAy0uLzAxMjM0NTY3OCkAKzkeOjs8PT4/QEFCQxtEOABFRQRGR0hJSktMTU5PG1BRAFJSU1RVVldYWVpbXF1eUCkAX0VTYGFiY2RlZmdoaWpQUQBSa0VsbW5vcHFyc3R1RHZ3AEVFUnh5ent8fX5/gBEodoEABCxFEoKDhIWGh4iJilBRDwCLjI2Oj5CRkpOUlZaXmJmaAJucnZ6foKGio6SlpqeoqaoAq6ytrq+wsbKztLW2t7i5ugC7vL2+v8DBwsPExcbHyMnKAMvMzc7P0NHS09TG1dbX2Nn+H2RDDsWRswAAAABJRU5ErkJggg==";

const STATEMENT =
  "I take on interfaces, dashboards, PWAs, and full-stack product work in React and Next.js. Accessible, responsive, and safe to click.";
const STATEMENT_WORDS = STATEMENT.split(/\s+/);

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/**
 * About - how the work happens, and where it was learned.
 *
 * The statement lights up word by word as it crosses the viewport and the
 * education timeline draws itself down the rail; both are scroll driven, so
 * the section reads as one gesture. The portrait lives here now that the hero
 * belongs to the type.
 */
const About = () => {
  const statementRef = useRef(null);
  const timelineRef = useRef(null);

  useEffect(() => {
    const statement = statementRef.current;
    const timeline = timelineRef.current;
    if (!statement || !timeline) return undefined;
    if (prefersReducedMotion()) return undefined;

    registerMotion();

    const words = [...statement.querySelectorAll(".sw")];
    const items = [...timeline.querySelectorAll(".timeline-item")];

    // Viewport height is read once per resize instead of once per scrub frame,
    // and both scrubs remember what they last wrote so a frame that changes
    // nothing does not invalidate style.
    let viewportHeight = window.innerHeight;
    const measureViewport = () => {
      viewportHeight = window.innerHeight;
    };
    window.addEventListener("resize", measureViewport);

    const lastOpacity = words.map(() => null);
    const lastColor = words.map(() => null);
    let lastRailProgress = null;

    const wordTrigger = ScrollTrigger.create({
      trigger: statement,
      start: "top 82%",
      end: "bottom 48%",
      scrub: true,
      onUpdate(self) {
        const reached = self.progress * (words.length + 3);
        words.forEach((word, index) => {
          const fill = clamp01(reached - index);
          const opacity = (0.16 + 0.84 * fill).toFixed(3);
          if (lastOpacity[index] !== opacity) {
            lastOpacity[index] = opacity;
            word.style.opacity = opacity;
          }
          const color = fill > 0 && fill < 1 ? "var(--color-sky)" : "";
          if (lastColor[index] !== color) {
            lastColor[index] = color;
            word.style.color = color;
          }
        });
      },
    });

    const railTrigger = ScrollTrigger.create({
      trigger: timeline,
      start: "top 72%",
      end: "bottom 60%",
      scrub: true,
      onRefresh: measureViewport,
      onUpdate(self) {
        const progress = self.progress.toFixed(3);
        if (progress !== lastRailProgress) {
          lastRailProgress = progress;
          timeline.style.setProperty("--tlp", progress);
        }
        const line = viewportHeight * 0.72;
        items.forEach((item) => {
          const isOn = item.getBoundingClientRect().top < line;
          if (item.classList.contains("is-on") !== isOn) {
            item.classList.toggle("is-on", isOn);
          }
        });
      },
    });

    return () => {
      window.removeEventListener("resize", measureViewport);
      wordTrigger.kill();
      railTrigger.kill();
    };
  }, []);

  return (
    <section
      id="about"
      className="section-y w-full"
      aria-labelledby="about-heading"
    >
      <div className="site-shell">
        <Reveal className="eyebrow">About</Reveal>
        <SplitHeading
          as="h2"
          id="about-heading"
          text="How I work, and where I learned"
          accent="learned"
          delayMs={80}
        />

        <p className="statement" ref={statementRef} aria-label={STATEMENT}>
          {STATEMENT_WORDS.map((word, index) => (
            <span key={`${word}-${index}`}>
              <span className="sw" aria-hidden="true">
                {word}
              </span>
              {index < STATEMENT_WORDS.length - 1 ? " " : null}
            </span>
          ))}
        </p>

        <div className="about-grid">
          <Reveal>
            <div className="about-portrait">
              <Image
                src="/profile-hero.webp"
                alt={`${SITE_NAME} portrait`}
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
                  {PERSON_JOB_TITLE} · {PERSON_LOCALITY}
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
                    aria-label={`${link.name} (opens in a new tab)`}
                  >
                    <Icon name={link.platform} size={16} />
                  </a>
                ))}
              </div>
            </div>

            <h3 className="about-h3">How I like to work</h3>

            <div className="about-copy">
              <p>
                <strong>Production work in React, Next.js, and Tailwind.</strong>{" "}
                Accessible, responsive, and safe to click.
              </p>
              <p>
                Off the clock I listen to music, tinker with a Ford Fiesta 95,
                and play guitar.
              </p>
            </div>

            <ul className="skill-chips" aria-label="Skills">
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
                <span data-t="See the source">See the source</span>
              </span>
              <SwapArrow direction="d" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Reveal>

          <Reveal delayMs={150}>
            <h3 className="about-h3">Education</h3>
            <ol className="timeline" ref={timelineRef} aria-label="Education">
              {EDUCATION.map((item) => (
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
    </section>
  );
};

export default About;
