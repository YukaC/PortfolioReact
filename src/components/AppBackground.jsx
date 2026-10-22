import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  prefersReducedMotion,
  subscribeReducedMotion,
} from "@/motion/prefersReducedMotion";

const LiquidEther = dynamic(() => import("@/components/LiquidEther"), {
  ssr: false,
  loading: () => null,
});

const BOCANADA_SMOKE_COLORS = ["#0a4a9a", "#66b3e2", "#eaf6ff"];
const FIELD_INK = "#060b1a";

function getSimQuality() {
  if (typeof navigator !== "undefined" && navigator.connection?.saveData) {
    return null;
  }
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  const isNarrow = window.innerWidth < 768;
  if (isCoarse || isNarrow) {
    return { resolution: 0.22, iterationsPoisson: 8 };
  }
  return { resolution: 0.32, iterationsPoisson: 12 };
}

/**
 * Bocanada field, retoned for the glass-motion system.
 *
 * Layers, back to front: the navy cobalt sky, three hue-shifting blobs driven
 * by reading progress, the WebGL dye (smoke + the coral lattice and its spring
 * flares live in the shader), the cursor light, then grain.
 *
 * The coral lattice never leaves: without WebGL, or under reduced motion, the
 * CSS stand-in paints the same dots.
 */
const AppBackground = () => {
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [simQuality, setSimQuality] = useState(null);
  const [canUseWebgl, setCanUseWebgl] = useState(false);

  useEffect(() => {
    const applyMotionPreference = (isReduced) => {
      setIsReducedMotion(isReduced);
      if (isReduced) {
        setSimQuality(null);
        setCanUseWebgl(false);
        return;
      }
      setSimQuality(getSimQuality());
    };
    applyMotionPreference(prefersReducedMotion());
    return subscribeReducedMotion(applyMotionPreference);
  }, []);

  useEffect(() => {
    // simQuality === null only arrives via the motion-preference effect above,
    // which already resets canUseWebgl alongside it — nothing to reset here.
    if (!simQuality) {
      return undefined;
    }
    const enableWebgl = () => setCanUseWebgl(true);
    if (typeof requestIdleCallback === "function") {
      const idleId = requestIdleCallback(enableWebgl, { timeout: 400 });
      return () => cancelIdleCallback(idleId);
    }
    const timeoutId = window.setTimeout(enableWebgl, 200);
    return () => window.clearTimeout(timeoutId);
  }, [simQuality]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ backgroundColor: FIELD_INK }}
      aria-hidden="true"
    >
      <div className="bocanada-field absolute inset-0" />
      <div className="field-blob field-blob-1" />
      <div className="field-blob field-blob-2" />
      <div className="field-blob field-blob-3" />
      {canUseWebgl && simQuality ? (
        <div className="absolute inset-0">
          <LiquidEther
            className="h-full w-full"
            colors={BOCANADA_SMOKE_COLORS}
            backgroundColor={FIELD_INK}
            lightMode={false}
            isViscous={false}
            BFECC={false}
            mouseForce={10}
            cursorSize={110}
            autoDemo={false}
            autoSpeed={0.2}
            autoIntensity={1.25}
            takeoverDuration={0.35}
            autoResumeDelay={1600}
            autoRampDuration={0.85}
            resolution={simQuality.resolution}
            iterationsPoisson={simQuality.iterationsPoisson}
          />
        </div>
      ) : null}
      {isReducedMotion || !canUseWebgl ? (
        <div className="bocanada-sparks absolute inset-0" />
      ) : null}
      <div className="field-glow" />
      <div className="field-grain" />
    </div>
  );
};

export default AppBackground;
