import { useEffect, useId, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Icon from "@/components/Icon";
import Magnetic from "@/components/Magnetic";
import { GITHUB_USERNAME } from "@/data/projects";
import { scrollToSectionByHash } from "@/utils/scroll-to-section";

const ROTATE_MS = 5000;

const PROJECT_BLUR =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9">
      <rect width="100%" height="100%" fill="#131d33"/>
    </svg>`,
  );

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
  return false;
}

const FALLBACK_FEATURED = [
  {
    name: "PortfolioReact",
    title: "Professional Portfolio",
    description:
      "This site. Next.js SSG/ISR, a Tailwind design system, and a WebGL easter egg.",
    tags: ["React", "Next.js", "Tailwind CSS"],
    imgSrc: "/img3.webp",
    alt: "Portfolio Screenshot",
    repoLink: `https://github.com/${GITHUB_USERNAME}/PortfolioReact`,
  },
];

/**
 * HeroSection - Practice landing hero.
 *
 * Copy + one work CTA on the left; a glass card on the right that rotates
 * through pinned GitHub repos (screenshot + title). Controls share the site
 * button language (btn-icon / btn-nav radius) and include a pause control
 * for WCAG 2.2.2.
 */
const HeroSection = ({ projects = [] }) => {
  const featured = projects.length > 0 ? projects : FALLBACK_FEATURED;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHoverPaused, setIsHoverPaused] = useState(false);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const reduceMotion = useSyncExternalStore(
    subscribeReduceMotion,
    getReduceMotionSnapshot,
    getReduceMotionServerSnapshot,
  );
  const slidePanelId = useId();

  const projectCount = featured.length;
  const active = featured[activeIndex % projectCount];
  const isRotationPaused = isUserPaused || isHoverPaused || reduceMotion;

  useEffect(() => {
    if (isRotationPaused || projectCount <= 1) return undefined;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % projectCount);
    }, ROTATE_MS);

    return () => clearInterval(timer);
  }, [isRotationPaused, projectCount, activeIndex]);

  const goToIndex = (index) => {
    if (projectCount <= 0) return;
    setActiveIndex((index + projectCount) % projectCount);
  };

  const handleCtaClick = (e, href) => {
    e.preventDefault();
    scrollToSectionByHash(href);
  };

  const handleCardBlur = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsHoverPaused(false);
  };

  const handleCarouselKeyDown = (e) => {
    if (projectCount <= 1) return;
    if (e.target.closest("a[href]")) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToIndex(activeIndex - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goToIndex(activeIndex + 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      goToIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      goToIndex(projectCount - 1);
    }
  };

  const liveStatus = isUserPaused
    ? `${active.title}, ${activeIndex + 1} of ${projectCount}, paused`
    : `${active.title}, ${activeIndex + 1} of ${projectCount}`;

  return (
    <section
      className="relative w-full min-h-[100dvh] overflow-hidden"
      id="home"
    >
      <div className="site-shell grid min-h-[100dvh] grid-cols-1 content-start gap-10 pt-24 pb-16 md:gap-12 md:pb-20 lg:grid-cols-12 lg:items-center lg:gap-x-16">
        <div className="copy-veil flex flex-col gap-6 lg:col-span-6">
          <h1
            data-intro
            className="text-balance text-[clamp(2.25rem,4.4vw,3.4rem)] leading-[1.14]"
          >
            Turning Real Problems Into{" "}
            <span className="headline-accent">Working Software</span>
          </h1>

          <p data-intro className="max-w-md text-lg leading-relaxed text-white/60">
            Agustin Ciucani. Full-stack developer in Buenos Aires. I ship
            React and Next.js products people can actually use.
          </p>

          <div data-intro className="mt-2">
            <Magnetic>
              <a
                href="#portfolio"
                className="btn-primary focus-ring"
                onClick={(e) => handleCtaClick(e, "#portfolio")}
              >
                See work
              </a>
            </Magnetic>
          </div>
        </div>

        <div data-intro className="lg:col-span-5 lg:col-start-8">
          <div
            className="glass-card overflow-hidden"
            onMouseEnter={() => setIsHoverPaused(true)}
            onMouseLeave={() => setIsHoverPaused(false)}
            onFocus={() => setIsHoverPaused(true)}
            onBlur={handleCardBlur}
          >
            {active.imgSrc ? (
              <div className="relative aspect-video overflow-hidden bg-deep">
                <Image
                  key={active.imgSrc}
                  src={active.imgSrc}
                  alt={active.alt ?? `${active.title} screenshot`}
                  width={1280}
                  height={720}
                  quality={70}
                  priority={activeIndex === 0}
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  placeholder="blur"
                  blurDataURL={PROJECT_BLUR}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}

            <div className="relative p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-white/60">
                  Live from GitHub
                </p>
                <Icon name="github" size={18} className="text-white/60" />
              </div>

              <div
                className="mt-4"
                role="region"
                aria-roledescription="carousel"
                aria-label="Featured GitHub projects"
                onKeyDown={handleCarouselKeyDown}
              >
                <p aria-live="polite" aria-atomic="true" className="sr-only">
                  {liveStatus}
                </p>

                <div
                  id={slidePanelId}
                  key={active.name}
                  className="repo-card-enter min-h-[7.5rem] sm:min-h-[6.75rem]"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${activeIndex + 1} of ${projectCount}`}
                >
                  <a
                    href={active.repoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/repo focus-ring inline-flex items-start gap-1.5 rounded-sm font-heading text-xl text-white hover:text-white/70 sm:text-2xl"
                  >
                    {active.title}
                    <Icon
                      name="arrow_forward"
                      size={18}
                      className="mt-1 shrink-0 opacity-0 transition-transform duration-200 ease-out group-hover/repo:translate-x-0.5 group-hover/repo:opacity-100"
                    />
                  </a>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/60">
                    {active.outcome ?? active.description}
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t border-white/20 pt-4">
                  <div
                    className="glass-nest inline-flex flex-wrap items-center gap-1 p-1"
                    role="group"
                    aria-label="Featured project controls"
                  >
                    <button
                      type="button"
                      className="btn-icon focus-ring"
                      onClick={() => goToIndex(activeIndex - 1)}
                      disabled={projectCount <= 1}
                      aria-label="Previous project"
                      aria-controls={slidePanelId}
                    >
                      <Icon name="arrow_back" size={16} />
                    </button>

                    <div
                      className="flex flex-wrap items-center"
                      role="group"
                      aria-label="Featured project selector"
                    >
                      {featured.map((project, index) => (
                        <button
                          key={project.name}
                          type="button"
                          className="carousel-dot focus-ring"
                          onClick={() => goToIndex(index)}
                          aria-label={`Show ${project.title}`}
                          aria-controls={slidePanelId}
                          aria-current={
                            index === activeIndex ? "true" : undefined
                          }
                        >
                          <span className="carousel-dot-pip" />
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="btn-icon focus-ring"
                      onClick={() => goToIndex(activeIndex + 1)}
                      disabled={projectCount <= 1}
                      aria-label="Next project"
                      aria-controls={slidePanelId}
                    >
                      <Icon name="arrow_forward" size={16} />
                    </button>

                    {reduceMotion ? null : (
                      <button
                        type="button"
                        className="btn-icon focus-ring"
                        onClick={() => setIsUserPaused((paused) => !paused)}
                        aria-label={
                          isUserPaused
                            ? "Play featured projects"
                            : "Pause featured projects"
                        }
                        aria-pressed={isUserPaused}
                        aria-controls={slidePanelId}
                      >
                        <Icon
                          name={isUserPaused ? "play" : "pause"}
                          size={16}
                        />
                      </button>
                    )}
                  </div>

                  <a
                    href={`https://github.com/${GITHUB_USERNAME}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-underline focus-ring inline-flex items-center gap-1.5 rounded-sm text-sm text-white/60 hover:text-white"
                  >
                    github.com/{GITHUB_USERNAME}
                    <span className="sr-only"> (opens in a new tab)</span>
                    <Icon name="arrow_forward" size={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
