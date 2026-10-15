import { useEffect, useState, useSyncExternalStore } from "react";
import Icon from "@/components/Icon";
import { SKILLS } from "@/data/constants";
import { GITHUB_USERNAME } from "@/data/projects";
import { scrollToSectionByHash } from "@/utils/scroll-to-section";

const ROTATE_MS = 5000;

const reduceMotionQuery =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

function subscribeReduceMotion(onChange) {
  reduceMotionQuery?.addEventListener("change", onChange);
  return () => reduceMotionQuery?.removeEventListener("change", onChange);
}

function getReduceMotionSnapshot() {
  return reduceMotionQuery?.matches ?? false;
}

function getReduceMotionServerSnapshot() {
  // Server render has no matchMedia — motion-sensitive default is "animate";
  // the client snapshot corrects it right after hydration.
  return false;
}

/**
 * Defensive fallback — ISR normally guarantees `projects`, but the hero must
 * render standalone (storybook-ish previews, edge cases).
 */
const FALLBACK_FEATURED = [
  {
    name: "PortfolioReact",
    title: "Professional Portfolio",
    description:
      "This site — Next.js SSG/ISR, a Tailwind design system, and a WebGL easter egg.",
    tags: ["React", "Next.js", "Tailwind CSS"],
    repoLink: `https://github.com/${GITHUB_USERNAME}/PortfolioReact`,
  },
];

/**
 * HeroSection - Trust-first landing hero.
 *
 * Copy + CTAs on the left; a glassmorphism card on the right that adapts to
 * the GitHub profile: it rotates through the pinned repos scraped at build
 * time (ISR) and links back to the profile. Tech strip replaces a generic
 * "trusted by" logo row.
 */
const HeroSection = ({ projects = [] }) => {
  const featured = projects.length > 0 ? projects : FALLBACK_FEATURED;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const reduceMotion = useSyncExternalStore(
    subscribeReduceMotion,
    getReduceMotionSnapshot,
    getReduceMotionServerSnapshot,
  );

  // Auto-rotate the featured repo. Paused on hover/focus, reduced motion,
  // or when there is nothing to rotate. `activeIndex` in deps restarts the
  // countdown after a manual dot selection.
  useEffect(() => {
    if (isPaused || reduceMotion || featured.length <= 1) return undefined;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featured.length);
    }, ROTATE_MS);

    return () => clearInterval(timer);
  }, [isPaused, reduceMotion, featured.length, activeIndex]);

  const handleCtaClick = (e, href) => {
    e.preventDefault();
    scrollToSectionByHash(href);
  };

  const handleCardBlur = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsPaused(false);
  };

  const active = featured[activeIndex % featured.length];

  return (
    <section
      className="w-full min-h-screen flex items-center px-6 pt-24 pb-16 relative overflow-hidden"
      id="home"
    >
      {/* Ambient color fields — depth behind the glass, quiet on the copy side */}
      <div
        className="absolute top-1/4 -right-24 w-[36rem] h-[36rem] rounded-full bg-primary/20 blur-[120px] opacity-60 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-secondary/25 blur-[110px] opacity-40 pointer-events-none"
        aria-hidden="true"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full">
        {/* Copy */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="hero-enter hero-enter-delay-1 inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-available/15 border border-available/30 text-available text-xs font-bold uppercase tracking-wide">
            <span
              className="w-2 h-2 rounded-full bg-available animate-pulse-slow"
              aria-hidden="true"
            />
            Available for new projects
          </div>

          <h1 className="hero-enter hero-enter-delay-2">
            Turning Real Problems Into{" "}
            <span className="text-gradient-accent">Working Software</span>
          </h1>

          <p className="hero-enter hero-enter-delay-3 text-lg sm:text-xl text-text-muted max-w-xl leading-relaxed">
            {"I'm Agustin Ciucani, a Full-Stack Developer from Buenos Aires, " +
              "Argentina. I ship dynamic, responsive products with React and " +
              "Tailwind CSS — real tools for real workflows, not just polished " +
              "demos."}
          </p>

          <div className="hero-enter hero-enter-delay-4 flex flex-col sm:flex-row gap-4 mt-2">
            <a
              href="#portfolio"
              className="btn-primary focus-ring"
              onClick={(e) => handleCtaClick(e, "#portfolio")}
            >
              See Projects
            </a>
            <a
              href="#contact"
              className="btn-ghost focus-ring"
              onClick={(e) => handleCtaClick(e, "#contact")}
            >
              {"Let's Connect"}
            </a>
          </div>

          {/* Tech strip — what the work is actually built with */}
          <div className="hero-enter hero-enter-delay-5 mt-6">
            <p className="text-xs font-bold text-primary/60 uppercase tracking-widest mb-3">
              Built with
            </p>
            <ul className="flex flex-wrap gap-2">
              {SKILLS.map((skill) => (
                <li
                  key={skill.name}
                  className="glass-pill flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm text-text-muted hover:text-amber-glow hover:border-primary/40 transition-colors cursor-default"
                >
                  <Icon
                    name={skill.icon}
                    size={15}
                    className="text-primary"
                  />
                  {skill.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Glass card — live from GitHub */}
        <div className="lg:col-span-5 hero-enter hero-enter-delay-5 relative">
          <div
            className="glass-card rounded-3xl p-6 sm:p-8 overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={handleCardBlur}
          >
            <div
              className="glass-noise absolute inset-0 opacity-30 rounded-3xl"
              aria-hidden="true"
            />

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full bg-available animate-pulse-slow"
                  aria-hidden="true"
                />
                <span className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-text-muted">
                  Live from GitHub
                </span>
              </div>
              <Icon
                name="github"
                size={18}
                className="text-text-muted"
              />
            </div>

            {/* Reserves height so rotating repos don't shift the footer */}
            <div className="relative mt-6 min-h-[10.5rem] sm:min-h-[9rem]">
              <div key={active.name} className="repo-card-enter">
                <a
                  href={active.repoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/repo inline-flex items-start gap-1.5 font-heading text-xl sm:text-2xl text-text hover:text-amber-glow transition-colors focus-ring rounded-sm"
                >
                  {active.title}
                  <Icon
                    name="arrow_forward"
                    size={18}
                    className="mt-1 opacity-0 -translate-x-1 group-hover/repo:opacity-100 group-hover/repo:translate-x-0 transition-all shrink-0"
                  />
                </a>
                <p className="mt-2 text-sm sm:text-[0.95rem] leading-relaxed text-text-muted line-clamp-3">
                  {active.description}
                </p>
                {active.tags?.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {active.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[0.65rem] text-text-muted"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="relative mt-6 pt-5 border-t border-white/10 flex items-center justify-between gap-4">
              <div
                className="flex items-center gap-1.5"
                role="group"
                aria-label="Featured project selector"
              >
                {featured.map((project, index) => (
                  <button
                    key={project.name}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Show ${project.title}`}
                    aria-current={index === activeIndex}
                    className={`h-1.5 rounded-full transition-all focus-ring ${
                      index === activeIndex
                        ? "w-6 bg-primary"
                        : "w-1.5 bg-white/20 hover:bg-white/40"
                    }`}
                  />
                ))}
              </div>

              <a
                href={`https://github.com/${GITHUB_USERNAME}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-xs text-text-muted hover:text-amber-glow transition-colors focus-ring rounded-sm"
              >
                github.com/{GITHUB_USERNAME}
                <Icon name="arrow_forward" size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
