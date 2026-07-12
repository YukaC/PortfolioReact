import { useEffect, useRef } from "react";
import { SKILLS } from "@/data/constants";
import Icon from "@/components/Icon";

// Hoisted outside component - created once, reused on every render
// Using 4 copies ensures seamless infinite loop animation
const DUPLICATED_SKILLS = [...SKILLS, ...SKILLS, ...SKILLS, ...SKILLS];

/**
 * SkillsTicker - Infinite horizontal scrolling skills section
 * Uses CSS animation for smooth, performant animation
 */
const SkillsTicker = () => {
  const tickerRef = useRef(null);

  useEffect(() => {
    const el = tickerRef.current;
    if (!el) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncPlayState = (isVisible) => {
      if (reduceMotion.matches) {
        el.style.animationPlayState = "paused";
        return;
      }
      el.style.animationPlayState = isVisible ? "running" : "paused";
    };

    // Start paused until we know visibility
    el.style.animationPlayState = "paused";

    const observer = new IntersectionObserver(
      ([entry]) => {
        syncPlayState(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "0px" },
    );

    observer.observe(el);

    const onMotionChange = () => {
      // Re-evaluate: if reduced motion, stay paused; else rely on last IO callback via re-observe
      if (reduceMotion.matches) {
        el.style.animationPlayState = "paused";
      }
    };
    reduceMotion.addEventListener("change", onMotionChange);

    return () => {
      observer.disconnect();
      reduceMotion.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <section
      className="w-full py-12 border-y border-(--color-border) bg-bg-light/50 dark:bg-white/2 overflow-hidden"
      aria-label="Technical skills"
    >
      <div className="max-w-container mx-auto mb-6 px-6">
        <p className="text-xs font-bold text-primary/60 uppercase tracking-widest">
          Core Technologies
        </p>
      </div>

      <div className="relative flex w-full overflow-hidden">
        <div
          ref={tickerRef}
          className="flex animateTicker gap-12 sm:gap-24 items-center"
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

      {/* Screen reader accessible list */}
      <ul className="sr-only">
        {SKILLS.map((skill) => (
          <li key={skill.name}>{skill.name}</li>
        ))}
      </ul>
    </section>
  );
};

export default SkillsTicker;
