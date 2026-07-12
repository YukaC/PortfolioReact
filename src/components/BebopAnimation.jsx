import { memo, useEffect, useRef } from "react";
import { ANIMATION_PHASES } from "@/data/constants";
import { prefersBebopReducedMotion } from "@/data/bebopShip";
import BebopShip from "@/components/BebopShip";
import styles from "@/components/bebop/bebop.module.css";

/**
 * BebopAnimation - Encapsulates the Easter Egg animation UI
 * @param {string} phase - The current phase of the animation
 * @param {() => void} onDismiss - Callback to close the animation early
 * @param {() => void} [onShipReady]
 * @param {() => void} [onShipFailed]
 * @param {React.RefObject<HTMLElement | null>} [restoreFocusRef] - Footer trigger to refocus on close
 */
const BebopAnimation = memo(
  ({ phase, onDismiss, onShipReady, onShipFailed, restoreFocusRef }) => {
    const overlayRef = useRef(null);
    const reducedMotion = prefersBebopReducedMotion();

    // Keep ship mounted through ENDCARD + CRT_OFF so CSS can fade opacity
    // 1→0 instead of hard-unmounting (SPEC V33). CRT_OFF still runs
    // crtPowerOff on the overlay. Skip WebGL entirely under reduced-motion.
    const showShip =
      !reducedMotion &&
      (phase === ANIMATION_PHASES.SHIP ||
        phase === ANIMATION_PHASES.ENDCARD ||
        phase === ANIMATION_PHASES.CRT_OFF);

    // Stable across ENDCARD→CRT_OFF so fadeOut does not restart (V33).
    const shipExiting =
      phase === ANIMATION_PHASES.ENDCARD ||
      phase === ANIMATION_PHASES.CRT_OFF;

    // RAF only needed while the fly-by timeline is running.
    const shipPlaying = phase === ANIMATION_PHASES.SHIP;

    // Focus trap + restore on unmount (Footer unmounts us when phase→IDLE,
    // so phase===IDLE restore was dead code).
    useEffect(() => {
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
        const trigger = restoreFocusRef?.current;
        if (trigger && typeof trigger.focus === "function") {
          try {
            trigger.focus({ preventScroll: true });
          } catch {
            trigger.focus();
          }
        }
      };
    }, [onDismiss, restoreFocusRef]);

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
        ? styles.crtOn
        : phase === ANIMATION_PHASES.CRT_OFF
          ? styles.crtOff
          : phase === ANIMATION_PHASES.SHIP
            ? styles.phaseShip
            : "";

    return (
      <div
        ref={overlayRef}
        className={[styles.bebopIntroOverlay, overlayPhaseClass]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Cowboy Bebop Easter Egg Animation"
        tabIndex={-1}
      >
        <button
          type="button"
          onClick={onDismiss}
          className={styles.bebopSkipButton}
        >
          Skip
        </button>

        {/* CRT noise/grid/glow — disabled via CSS during phaseShip (GPU). */}
        <div className={styles.bebopCrtNoise} aria-hidden="true" />
        <div className={styles.bebopCrtGrid} aria-hidden="true" />
        <div className={styles.bebopCrtGlow} aria-hidden="true" />

        {isCountdown ? (
          <div className={styles.bebopCountdown}>
            <span className={styles.bebopCountdownNumber} key={phase}>
              {phase.split("_")[1]}
            </span>
          </div>
        ) : null}

        {isJam ? (
          <div
            className={[
              styles.bebopJamContainer,
              phase === ANIMATION_PHASES.FADE_TO_BLACK ? styles.fadeOut : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="relative">
              <span
                className={`${styles.bebopJamText} ${styles.bebopJamMeasure}`}
                aria-hidden="true"
              >
                Let&apos;s Jam...
              </span>
              <span
                className={`${styles.bebopJamText} ${styles.bebopJamTypewriter}`}
              >
                Let&apos;s Jam...
              </span>
            </div>
          </div>
        ) : null}

        {showShip ? (
          <div
            className={[
              styles.bebopEndcardContainer,
              shipExiting ? styles.shipFadeOut : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <BebopShip
              active
              playing={shipPlaying}
              onReady={onShipReady}
              onFailed={onShipFailed}
            />
          </div>
        ) : null}
      </div>
    );
  },
);

BebopAnimation.displayName = "BebopAnimation";

export default BebopAnimation;
