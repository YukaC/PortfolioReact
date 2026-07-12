import { useState } from "react";
import Image from "next/image";

/**
 * HeroSection - Main landing section with intro and code terminal
 */
const HeroSection = () => {
  const [isActive, setIsActive] = useState(false);

  const toggleActive = () => setIsActive((prev) => !prev);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleActive();
    }
  };

  return (
    <section
      className="w-full max-w-container min-h-screen flex flex-col justify-center px-6 pt-20 relative"
      id="home"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Text Content */}
        <div className="flex flex-col gap-6 order-2 lg:order-1">
          {/* Status Badge */}
          <div className="inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wide">
            <span
              className="w-2 h-2 rounded-full bg-primary animate-pulse-slow"
              aria-hidden="true"
            ></span>
            Available for new projects
          </div>

          {/* Headline */}
          <h1>
            Crafting <span className="text-primary italic">smooth</span> digital
            compositions.
          </h1>

          {/* Description */}
          <p className="text-lg sm:text-xl text-text-muted max-w-lg leading-relaxed">
            I&apos;m Agustin Ciucani, a Full-Stack Developer from Buenos Aires,
            Argentina. I build dynamic, responsive interfaces with React and
            Tailwind CSS, focused on clean code and great user experiences.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <a href="#portfolio" className="btn-primary focus-ring">
              See Projects
            </a>
            <a href="#contact" className="btn-ghost focus-ring">
              Let&apos;s Connect
            </a>
          </div>
        </div>

        {/* Hero Image with Code Terminal */}
        <div className="relative order-1 lg:order-2 h-[400px] lg:h-[600px] w-full flex items-center justify-center">
          {/* Background Glow — radial-gradient, no CSS blur */}
          <div
            className="absolute inset-0 rounded-full opacity-40 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--color-secondary) 50%, transparent), transparent 70%)",
            }}
            aria-hidden="true"
          />

          {/* Main Container */}
          <div
            className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-[var(--color-border)] bg-surface group cursor-pointer"
            onClick={toggleActive}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            aria-label="Toggle profile image focus"
          >
            {/* Background Image - optimized and prioritized for LCP (no grayscale filter) */}
            <Image
              src="/profilePic.webp"
              alt="Agustin Ciucani profile"
              fill
              priority
              fetchPriority="high"
              sizes="(max-width: 1024px) 100vw, 50vw"
              className={`object-cover transition-transform duration-500 ease-out 
                ${isActive ? "scale-105" : "group-hover:scale-105"}`}
            />

            {/* Solid overlay for muted look — replaces grayscale filter on LCP */}
            <div
              className={`absolute inset-0 bg-bg-main/55 transition-opacity duration-500 pointer-events-none
                ${isActive ? "opacity-20" : "group-hover:opacity-20"}`}
              aria-hidden="true"
            />

            {/* Bottom gradient for terminal readability */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-bg-main via-bg-main/40 to-transparent pointer-events-none"
              aria-hidden="true"
            />

            {/* Code Terminal */}
            <div
              className={`absolute bottom-4 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 transition-opacity duration-500 pointer-events-none
              ${isActive ? "opacity-80" : "group-hover:opacity-80"}`}
            >
              <div className="bg-black/80 border border-white/10 p-5 sm:p-5 max-sm:p-3 rounded-xl font-mono text-sm max-sm:text-[0.7rem]">
                {/* Terminal Dots */}
                <div className="flex gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>

                {/* Code Content */}
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
