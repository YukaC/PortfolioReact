import { useState, useEffect, useRef, useCallback } from "react";
import BebopAnimation from "./BebopAnimation";
import {
  SOCIAL_LINKS,
  ANIMATION_PHASES,
  PHASE_TIMINGS,
} from "../src/data/constants";

/**
 * Footer - Site footer with social links and easter egg
 */
const Footer = () => {
  const [phase, setPhase] = useState(ANIMATION_PHASES.IDLE);
  const [currentYear, setCurrentYear] = useState("");
  const timerRef = useRef(null);
  const phaseTimerRef = useRef(null);

  const startAnimation = useCallback(() => {
    setPhase(ANIMATION_PHASES.CRT_ON);
  }, []);

  // Handle current year hydration
  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
  }, []);

  // Handle phase transitions
  useEffect(() => {
    if (phase === ANIMATION_PHASES.IDLE) return;

    const scheduleNextPhase = (nextPhase, delay) => {
      phaseTimerRef.current = setTimeout(() => {
        setPhase(nextPhase);
      }, delay);
    };

    switch (phase) {
      case ANIMATION_PHASES.CRT_ON:
        scheduleNextPhase(ANIMATION_PHASES.COUNTDOWN_3, PHASE_TIMINGS.CRT_ON);
        break;
      case ANIMATION_PHASES.COUNTDOWN_3:
        scheduleNextPhase(
          ANIMATION_PHASES.COUNTDOWN_2,
          PHASE_TIMINGS.COUNTDOWN,
        );
        break;
      case ANIMATION_PHASES.COUNTDOWN_2:
        scheduleNextPhase(
          ANIMATION_PHASES.COUNTDOWN_1,
          PHASE_TIMINGS.COUNTDOWN,
        );
        break;
      case ANIMATION_PHASES.COUNTDOWN_1:
        scheduleNextPhase(ANIMATION_PHASES.JAM, PHASE_TIMINGS.COUNTDOWN);
        break;
      case ANIMATION_PHASES.JAM:
        scheduleNextPhase(ANIMATION_PHASES.FADE_TO_BLACK, PHASE_TIMINGS.JAM);
        break;
      case ANIMATION_PHASES.FADE_TO_BLACK:
        scheduleNextPhase(ANIMATION_PHASES.SHIP, PHASE_TIMINGS.FADE);
        break;
      case ANIMATION_PHASES.SHIP:
        scheduleNextPhase(ANIMATION_PHASES.ENDCARD, PHASE_TIMINGS.SHIP);
        break;
      case ANIMATION_PHASES.ENDCARD:
        scheduleNextPhase(ANIMATION_PHASES.CRT_OFF, PHASE_TIMINGS.ENDCARD);
        break;
      case ANIMATION_PHASES.CRT_OFF:
        phaseTimerRef.current = setTimeout(() => {
          setPhase(ANIMATION_PHASES.IDLE);
        }, PHASE_TIMINGS.CRT_OFF);
        break;
      default:
        break;
    }

    return () => {
      if (phaseTimerRef.current) {
        clearTimeout(phaseTimerRef.current);
      }
    };
  }, [phase]);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      startAnimation();
    }, 1000);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, []);

  // Icon Mapper for Social Links
  const getIcon = (platform) => {
    switch (platform) {
      case "github":
        return (
          <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        );
      case "linkedin":
        return (
          <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
          </svg>
        );
      case "instagram":
        return (
          <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <footer className="w-full border-t border-[var(--color-border)] bg-bg-light/50 dark:bg-white/[0.01] pt-16 pb-8 relative overflow-hidden">
      <BebopAnimation phase={phase} />

      <div className="max-w-container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-center md:text-left">
          <span className="block font-heading font-bold text-xl mb-1">
            Agustin Ciucani
          </span>
          <p className="text-xs text-text-muted uppercase tracking-widest">
            © {currentYear} • Built with Soul & Code
          </p>
        </div>

        <nav aria-label="Social media links">
          <ul className="flex items-center gap-6">
            {SOCIAL_LINKS.map((link) => (
              <li key={link.name}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-text-muted hover:text-[#ffbf00] hover:scale-110 transition-all duration-300"
                  aria-label={`Visit ${link.name} profile`}
                >
                  {getIcon(link.platform)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="w-full flex justify-center mt-12 mb-4">
        <p
          className="easterEgg select-none cursor-help relative hover:text-amber-glow transition-all duration-300"
          title="Hold for 3 seconds..."
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          3, 2, 1, Let&apos;s Jam.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
