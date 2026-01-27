import { useState } from "react";
import Image from "next/image";

/**
 * HeroSection - Main landing section with intro and code terminal
 */
const HeroSection = () => {
  const [isActive, setIsActive] = useState(false);

  const toggleActive = () => setIsActive(!isActive);

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
            <a
              href="#portfolio"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-bg-main font-bold rounded transition-all duration-300 hover:bg-amber-glow hover:text-[#19161c] hover:-translate-y-0.5 shadow-lg shadow-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main"
            >
              See Projects
            </a>
            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-secondary/10 text-primary font-bold rounded border border-secondary/20 transition-all duration-300 hover:bg-amber-glow hover:text-[#19161c] hover:border-amber-glow hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main"
            >
              Let&apos;s Connect
            </a>
          </div>
        </div>

        {/* Hero Image with Code Terminal */}
        <div className="relative order-1 lg:order-2 h-[400px] lg:h-[600px] w-full flex items-center justify-center">
          {/* Background Glow */}
          <div
            className="absolute inset-0 bg-gradient-to-tr from-secondary/30 via-transparent to-primary/10 rounded-full blur-[100px] opacity-40"
            aria-hidden="true"
          />

          {/* Main Container */}
          <div
            className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-[var(--color-border)] bg-surface group cursor-pointer"
            onClick={toggleActive}
          >
            {/* Background Image - optimized and prioritized for LCP */}
            <Image
              src="/profilePic.jpg"
              alt="Agustin Ciucani profile"
              fill
              priority
              fetchPriority="high"
              sizes="(max-width: 1024px) 100vw, 50vw"
              className={`object-cover transition-all duration-500 ease-out 
                ${isActive ? "opacity-100 grayscale-0 scale-105" : "opacity-60 grayscale group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105"}`}
              aria-hidden="true"
            />

            {/* Gradient Overlay - stronger by default, fades on hover/active */}
            <div
              className={`absolute inset-0 bg-gradient-to-t from-bg-main via-bg-main/70 to-bg-main/40 transition-all duration-500 
                ${isActive ? "via-bg-main/40 to-transparent" : "group-hover:via-bg-main/40 group-hover:to-transparent"}`}
              aria-hidden="true"
            />

            {/* Code Terminal - fades slightly on hover/active */}
            <div
              className={`absolute bottom-4 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 transition-opacity duration-500 
              ${isActive ? "opacity-80" : "group-hover:opacity-80"}`}
            >
              <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-5 sm:p-5 max-sm:p-3 rounded-xl font-mono text-sm max-sm:text-[0.7rem]">
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
