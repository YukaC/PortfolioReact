import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { scrollToSectionByHash } from "@/utils/scroll-to-section";

/** Tiny neutral blur for next/image placeholders (avoids CLS flash). */
const HERO_BLUR =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9">
      <rect width="100%" height="100%" fill="#2a2430"/>
    </svg>`,
  );

/**
 * HeroSection - Main landing section with intro and code terminal
 */
const HeroSection = () => {
  const [isActive, setIsActive] = useState(false);
  const imageCardRef = useRef(null);

  const toggleActive = () => setIsActive((prev) => !prev);

  // Mobile has no hover — tap outside restores grayscale (desktop hover still works).
  useEffect(() => {
    if (!isActive) return undefined;

    const dismissIfOutside = (event) => {
      if (imageCardRef.current?.contains(event.target)) return;
      setIsActive(false);
    };

    document.addEventListener("pointerdown", dismissIfOutside);
    return () => document.removeEventListener("pointerdown", dismissIfOutside);
  }, [isActive]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleActive();
    }
  };

  const handleCtaClick = (e, href) => {
    e.preventDefault();
    scrollToSectionByHash(href);
  };

  return (
    <section
      className="w-full min-h-screen flex flex-col justify-center px-6 pt-20 relative"
      id="home"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Text Content */}
        <div className="flex flex-col gap-6 order-2 lg:order-1">
          <div className="hero-enter hero-enter-delay-1 inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-available/15 border border-available/30 text-available text-xs font-bold uppercase tracking-wide">
            <span
              className="w-2 h-2 rounded-full bg-available animate-pulse-slow"
              aria-hidden="true"
            />
            Available for new projects
          </div>

          <h1 className="hero-enter hero-enter-delay-2">
            Crafting <span className="text-primary italic">smooth</span> digital
            compositions.
          </h1>

          <p className="hero-enter hero-enter-delay-3 text-lg sm:text-xl text-text-muted max-w-lg leading-relaxed">
            I&apos;m Agustin Ciucani, a Full-Stack Developer from Buenos Aires,
            Argentina. I build dynamic, responsive interfaces with React and
            Tailwind CSS, focused on clean code and great user experiences.
          </p>

          <div className="hero-enter hero-enter-delay-4 flex flex-col sm:flex-row gap-4 mt-4">
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
              Let&apos;s Connect
            </a>
          </div>
        </div>

        {/* Hero Image with Code Terminal */}
        <div className="hero-enter hero-enter-delay-5 relative order-1 lg:order-2 h-[400px] lg:h-[600px] w-full flex items-center justify-center">
          <div
            className="absolute inset-6 bg-gradient-to-tr from-secondary/30 via-transparent to-primary/10 rounded-full blur-[50px] opacity-40 pointer-events-none"
            aria-hidden="true"
          />

          <div
            ref={imageCardRef}
            className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-[var(--color-border)] bg-surface group cursor-pointer"
            onClick={toggleActive}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            aria-label="Toggle profile image focus"
          >
            {/* Filter snaps (no filter transition); transform on own layer — no exit flash */}
            <div
              className={`absolute inset-0 transition-opacity duration-500 ease-out
                ${isActive ? "opacity-100 grayscale-0" : "opacity-60 grayscale group-hover:opacity-100 group-hover:grayscale-0"}`}
            >
              <div
                className={`absolute inset-0 transition-transform duration-500 ease-out
                  ${isActive ? "scale-105" : "scale-100 group-hover:scale-105"}`}
              >
                <Image
                  src="/profilePic.webp"
                  alt="Agustin Ciucani profile"
                  fill
                  priority
                  fetchPriority="high"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  placeholder="blur"
                  blurDataURL={HERO_BLUR}
                  className="object-cover"
                />
              </div>
            </div>

            <div
              className={`absolute inset-0 bg-gradient-to-t from-bg-main via-bg-main/70 to-bg-main/40 transition-opacity duration-500 pointer-events-none
                ${isActive ? "opacity-70" : "opacity-100 group-hover:opacity-70"}`}
              aria-hidden="true"
            />

            <div
              className={`absolute bottom-4 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 transition-opacity duration-500 pointer-events-none
              ${isActive ? "opacity-80" : "opacity-100 group-hover:opacity-80"}`}
            >
              <div className="bg-black/60 border border-white/10 p-5 sm:p-5 max-sm:p-3 rounded-xl font-mono text-sm max-sm:text-[0.7rem]">
                <div className="flex gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>

                <div className="text-gray-300 leading-relaxed">
                  <span className="text-secondary">const</span> developer ={" "}
                  {"{"}
                  <br />
                  &nbsp;&nbsp;name:{" "}
                  <span className="text-primary">
                    &apos;Agustin Ciucani&apos;
                  </span>
                  ,
                  <br />
                  &nbsp;&nbsp;role:{" "}
                  <span className="text-primary">
                    &apos;Full-Stack Developer&apos;
                  </span>
                  ,<br />
                  &nbsp;&nbsp;stack: [
                  <span className="text-primary">&apos;React&apos;</span>,{" "}
                  <span className="text-primary">&apos;JavaScript&apos;</span>,{" "}
                  <span className="text-primary">&apos;Tailwind&apos;</span>]
                  <br />
                  {"}"};
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
