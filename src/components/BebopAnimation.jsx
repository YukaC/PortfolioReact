import { memo, useEffect, useRef } from "react";
import { ANIMATION_PHASES } from "@/data/constants";
import BebopShip from "@/components/BebopShip";

/**
 * BebopAnimation - Encapsulates the Easter Egg animation UI
 * @param {string} phase - The current phase of the animation
 * @param {() => void} onDismiss - Callback to close the animation early
 */
const BebopAnimation = memo(({ phase, onDismiss, onShipReady }) => {
  const overlayRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  // Keep ship mounted through ENDCARD + CRT_OFF so CSS can fade opacity
  // 1→0 instead of hard-unmounting (SPEC V33). CRT_OFF still runs
  // crtPowerOff on the overlay.
  const showShip =
    phase === ANIMATION_PHASES.SHIP ||
    phase === ANIMATION_PHASES.ENDCARD ||
    phase === ANIMATION_PHASES.CRT_OFF;

  // Stable across ENDCARD→CRT_OFF so fadeOut does not restart (V33).
  const shipExiting =
    phase === ANIMATION_PHASES.ENDCARD ||
    phase === ANIMATION_PHASES.CRT_OFF;

  useEffect(() => {
    if (phase === ANIMATION_PHASES.IDLE) {
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
        previousActiveElementRef.current = null;
      }
      return;
    }

    if (!previousActiveElementRef.current) {
      previousActiveElementRef.current = document.activeElement;
    }

    const handleTabKey = (e) => {
      if (e.key !== "Tab") return;

      const focusableElements = overlayRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (!focusableElements || focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss?.();
      }
    };

    const overlay = overlayRef.current;
    if (overlay) {
      overlay.addEventListener("keydown", handleTabKey);
      overlay.addEventListener("keydown", handleEscape);
      overlay.focus();
    }

    return () => {
      if (overlay) {
        overlay.removeEventListener("keydown", handleTabKey);
        overlay.removeEventListener("keydown", handleEscape);
      }
    };
  }, [phase, onDismiss]);

  if (phase === ANIMATION_PHASES.IDLE) return null;

  const isCountdown =
    phase === ANIMATION_PHASES.COUNTDOWN_3 ||
    phase === ANIMATION_PHASES.COUNTDOWN_2 ||
    phase === ANIMATION_PHASES.COUNTDOWN_1;

  const isJam =
    phase === ANIMATION_PHASES.JAM ||
    phase === ANIMATION_PHASES.FADE_TO_BLACK;

  const overlayPhaseClass =
    phase === ANIMATION_PHASES.CRT_ON
      ? "crtOn"
      : phase === ANIMATION_PHASES.CRT_OFF
        ? "crtOff"
        : phase === ANIMATION_PHASES.SHIP
          ? "phaseShip"
          : "";

  return (
    <div
      ref={overlayRef}
      className={`bebopIntroOverlay ${overlayPhaseClass}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-label="Cowboy Bebop Easter Egg Animation"
      tabIndex={-1}
    >
      <button
        type="button"
        onClick={onDismiss}
        className="bebopSkipButton"
      >
        Skip
      </button>

      {/* CRT noise/grid/glow se mantienen durante toda la secuencia,
          incluida la nave — mismo estilo que el intro. */}
      <div className="bebopCrtNoise" aria-hidden="true" />
      <div className="bebopCrtGrid" aria-hidden="true" />
      <div className="bebopCrtGlow" aria-hidden="true" />

      {isCountdown ? (
        <div className="bebopCountdown">
          <span className="bebopCountdownNumber" key={phase}>
            {phase.split("_")[1]}
          </span>
        </div>
      ) : null}

      {isJam ? (
        <div
          className={`bebopJamContainer ${
            phase === ANIMATION_PHASES.FADE_TO_BLACK ? "fadeOut" : ""
          }`}
        >
          <div className="relative">
            <span className="bebopJamText bebopJamMeasure" aria-hidden="true">
              Let&apos;s Jam...
            </span>
            <span className="bebopJamText bebopJamTypewriter">
              Let&apos;s Jam...
            </span>
          </div>
        </div>
      ) : null}

      {showShip ? (
        <div
          className={`bebopEndcardContainer${
            shipExiting ? " shipFadeOut" : ""
          }`}
        >
          <BebopShip active onReady={onShipReady} />
        </div>
      ) : null}
    </div>
  );
});

BebopAnimation.displayName = "BebopAnimation";

export default BebopAnimation;
