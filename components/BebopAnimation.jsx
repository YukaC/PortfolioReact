import Image from "next/image";
import { ANIMATION_PHASES } from "../src/data/constants";

/**
 * BebopAnimation - Encapsulates the Easter Egg animation UI
 * @param {string} phase - The current phase of the animation
 */
const BebopAnimation = ({ phase }) => {
  if (phase === ANIMATION_PHASES.IDLE) return null;

  return (
    <div
      className={`bebopIntroOverlay ${
        phase === ANIMATION_PHASES.CRT_ON ? "crtOn" : ""
      } ${phase === ANIMATION_PHASES.CRT_OFF ? "crtOff" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Cowboy Bebop Easter Egg Animation"
    >
      {/* CRT Advanced Effects Layers */}
      <div className="bebopCrtNoise" aria-hidden="true" />
      <div className="bebopCrtGrid" aria-hidden="true" />
      <div className="bebopCrtGlow" aria-hidden="true" />

      {/* Countdown Phase */}
      {(phase === ANIMATION_PHASES.COUNTDOWN_3 ||
        phase === ANIMATION_PHASES.COUNTDOWN_2 ||
        phase === ANIMATION_PHASES.COUNTDOWN_1) && (
        <div className="bebopCountdown">
          <span className="bebopCountdownNumber" key={phase}>
            {phase.split("_")[1]}
          </span>
        </div>
      )}

      {/* Let's Jam Phase - Persist during FADE_TO_BLACK */}
      {(phase === ANIMATION_PHASES.JAM ||
        phase === ANIMATION_PHASES.FADE_TO_BLACK) && (
        <div className="bebopJamContainer">
          <div className="relative">
            <span className="bebopJamText opacity-0 pointer-events-none select-none !animate-none">
              Let&apos;s Jam...
            </span>
            <span className="bebopJamText absolute top-0 left-0">
              Let&apos;s Jam...
            </span>
          </div>
        </div>
      )}

      {/* Ship flying across + End Card Phase */}
      {(phase === ANIMATION_PHASES.SHIP ||
        phase === ANIMATION_PHASES.ENDCARD ||
        phase === ANIMATION_PHASES.CRT_OFF) && (
        <div className="bebopEndcardContainer">
          <span className="bebopEndcardText">SEE YOU SPACE COWBOY...</span>

          <div className="bebopShipSystem">
            <div className="bebopTrailLine" />
            {phase === ANIMATION_PHASES.SHIP && (
              <Image
                src="/swordfish.png"
                alt="Swordfish II"
                width={200}
                height={100}
                className="bebopSwordfishFlying"
                priority // Preload ship image
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BebopAnimation;
