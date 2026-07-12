import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { SOCIAL_LINKS } from "@/data/constants";
import { useBebopAnimation } from "@/hooks/useBebopAnimation";
import Icon from "./Icon";

const BebopAnimation = dynamic(() => import("./BebopAnimation"), {
  ssr: false,
});

/**
 * Footer - Site footer with social links and easter egg
 */
const Footer = () => {
  const [currentYear] = useState(() => new Date().getFullYear().toString());
  const {
    phase,
    isActive,
    dismissAnimation,
    handleTriggerEnter,
    handleTriggerLeave,
    handleTriggerPointerDown,
    handleTriggerPointerUp,
    handleShipReady,
    handleShipFailed,
    triggerElRef,
  } = useBebopAnimation();

  // Share the phrase node with the hook + BebopAnimation for focus restore.
  const setTriggerRef = useCallback(
    (node) => {
      triggerElRef.current = node;
    },
    [triggerElRef],
  );

  return (
    <footer className="w-full border-t border-(--color-border) bg-bg-light/50 dark:bg-white/1 pt-16 pb-8 relative overflow-hidden">
      {isActive ? (
        <BebopAnimation
          phase={phase}
          onDismiss={dismissAnimation}
          onShipReady={handleShipReady}
          onShipFailed={handleShipFailed}
          restoreFocusRef={triggerElRef}
        />
      ) : null}

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
                  className="block text-text-muted hover:text-amber-glow hover:scale-110 transition-all duration-300 focus-ring rounded"
                  aria-label={`Visit ${link.name} profile`}
                >
                  <Icon name={link.platform} className="h-8 w-8" size={32} />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="w-full flex justify-center mt-12 mb-4">
        <p
          ref={setTriggerRef}
          tabIndex={0}
          role="button"
          className="opacity-15 hover:opacity-100 hover:text-amber-glow hover:scale-105 hover:drop-shadow-[0_0_15px_rgba(212,175,55,0.6)] transition-all duration-500 select-none cursor-help font-mono text-xs italic focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary"
          title="Hold for 1.5 seconds..."
          onMouseEnter={handleTriggerEnter}
          onMouseLeave={handleTriggerLeave}
          onPointerDown={handleTriggerPointerDown}
          onPointerUp={handleTriggerPointerUp}
          onPointerCancel={handleTriggerPointerUp}
          onPointerLeave={handleTriggerPointerUp}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleTriggerEnter(e);
            }
          }}
          onKeyUp={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleTriggerLeave();
            }
          }}
        >
          I think it&apos;s time to blow this scene.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
