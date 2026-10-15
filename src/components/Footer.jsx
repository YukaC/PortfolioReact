import { useCallback } from "react";
import dynamic from "next/dynamic";
import { SOCIAL_LINKS } from "@/data/constants";
import { useBebopAnimation } from "@/hooks/useBebopAnimation";
import SiteLogo from "./SiteLogo";

const BebopAnimation = dynamic(() => import("./BebopAnimation"), {
  ssr: false,
});

const Footer = () => {
  const currentYear = new Date().getFullYear();
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

  const setTriggerRef = useCallback(
    (node) => {
      triggerElRef.current = node;
    },
    [triggerElRef],
  );

  return (
    <footer className="section-rule relative w-full overflow-hidden">
      {isActive ? (
        <BebopAnimation
          phase={phase}
          onDismiss={dismissAnimation}
          onShipReady={handleShipReady}
          onShipFailed={handleShipFailed}
          restoreFocusRef={triggerElRef}
        />
      ) : null}

      <div className="footer-beam" aria-hidden="true" />

      <div className="site-shell relative py-8 md:py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <SiteLogo className="h-8 w-auto opacity-80" />

          <nav aria-label="Social media links">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-underline focus-ring text-sm text-fog hover:text-paper"
                  >
                    {link.name}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <p className="text-sm text-fog">© {currentYear} Agustin Ciucani</p>
        </div>

        <p
          ref={setTriggerRef}
          tabIndex={0}
          role="button"
          className="relative z-10 mt-6 max-w-fit cursor-help py-1 font-mono text-[11px] text-fog/35 select-none touch-none transition-colors duration-200 ease-out hover:text-ice focus:outline-none focus-visible:text-ice focus-visible:ring-2 focus-visible:ring-ice"
          title="Hold for 1.5 seconds..."
          aria-label="Hold for 1.5 seconds to play the easter egg"
          onMouseEnter={handleTriggerEnter}
          onMouseLeave={handleTriggerLeave}
          onPointerDown={handleTriggerPointerDown}
          onPointerUp={handleTriggerPointerUp}
          onPointerCancel={handleTriggerPointerUp}
          onContextMenu={(e) => e.preventDefault()}
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

      <p className="footer-wordmark site-shell" aria-hidden="true">
        CIUCANI
      </p>
    </footer>
  );
};

export default Footer;
