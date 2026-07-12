import { useEffect, useRef } from "react";
import { SKILLS } from "@/data/constants";
import Icon from "@/components/Icon";
import { useInView } from "@/hooks/useInView";

/** Two identical tracks — CSS loops with translateX(-50%). */
const DUPLICATED_SKILLS = [...SKILLS, ...SKILLS];

/**
 * SkillsTicker - Infinite horizontal scrolling skills section
 * Uses CSS animation for smooth, performant animation
 */
const SkillsTicker = () => {
  const [cardRef, isRevealed] = useInView();
  const tickerRef = useRef(null);

  useEffect(() => {
    const el = tickerRef.current;
    const card = cardRef.current;
    if (!el || !card) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncPlayState = (isVisible) => {
      if (reduceMotion.matches) {
        el.style.animationPlayState = "paused";
        return;
      }
      el.style.animationPlayState = isVisible ? "running" : "paused";
    };

    el.style.animationPlayState = "paused";

    const observer = new IntersectionObserver(
      ([entry]) => {
        syncPlayState(entry.isIntersecting);
      },
      { threshold: 0.1 },
    );

    observer.observe(card);

    const onMotionChange = () => {
      if (reduceMotion.matches) {
        el.style.animationPlayState = "paused";
      }
    };
    reduceMotion.addEventListener("change", onMotionChange);

    return () => {
      observer.disconnect();
      reduceMotion.removeEventListener("change", onMotionChange);
    };
  }, [cardRef]);

  return (
    <section className="w-full py-12 px-4 sm:px-6 lg:px-8" aria-label="Technical skills">
      <div
        ref={cardRef}
        className={`reveal rounded-2xl border border-[var(--color-border)] bg-surface overflow-hidden py-10 ${
          isRevealed ? "reveal-visible" : ""
        }`}
      >
        <div className="mb-6 px-6">
          <p className="text-xs font-bold text-primary/60 uppercase tracking-widest">
            Core Technologies
          </p>
        </div>

        <div className="relative flex w-full overflow-hidden ticker-mask">
          <div
            ref={tickerRef}
            className="flex animateTicker gap-12 sm:gap-24 items-center w-max"
            aria-hidden="true"
          >
            {DUPLICATED_SKILLS.map((skill, index) => (
              <div
                key={`${skill.name}-${index}`}
                className="flex items-center gap-3 font-heading font-medium text-2xl text-text-muted whitespace-nowrap min-w-max group/skill cursor-default hover:text-amber-glow transition-colors"
              >
                <Icon
                  name={skill.icon}
                  className="text-primary group-hover/skill:text-amber-glow transition-colors"
                />
                {skill.name}
              </div>
            ))}
          </div>
        </div>

        <ul className="sr-only">
          {SKILLS.map((skill) => (
            <li key={skill.name}>{skill.name}</li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default SkillsTicker;
