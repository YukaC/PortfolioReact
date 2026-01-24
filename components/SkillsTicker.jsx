import { useMemo } from "react";
import { SKILLS } from "../src/data/constants";

/**
 * SkillsTicker - Infinite horizontal scrolling skills section
 * Uses CSS animation for smooth, performant animation
 */
const SkillsTicker = () => {
  // Duplicate skills for seamless loop - Memoized to prevent re-calculation
  const duplicatedSkills = useMemo(() => [...SKILLS, ...SKILLS], []);

  return (
    <section
      className="w-full py-12 border-y border-[var(--color-border)] bg-bg-light/50 dark:bg-white/[0.02] overflow-hidden"
      aria-label="Technical skills"
    >
      <div className="max-w-container mx-auto mb-6 px-6">
        <h3 className="text-xs font-bold text-primary/60 uppercase tracking-widest">
          Core Technologies
        </h3>
      </div>

      <div className="relative flex w-full overflow-hidden">
        <div
          className="flex animateTicker gap-12 sm:gap-24 items-center"
          aria-hidden="true"
        >
          {duplicatedSkills.map((skill, index) => (
            <div
              key={`${skill.name}-${index}`}
              className="skillsTickerItem group/skill cursor-default hover:text-amber-glow transition-colors"
            >
              <span
                className="material-symbols-outlined text-primary group-hover/skill:text-amber-glow transition-colors"
                aria-hidden="true"
              >
                {skill.icon}
              </span>
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
