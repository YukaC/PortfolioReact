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

const BOCANADA_SMOKE_COLORS = ["#0a4a9a", "#7ec8e8", "#f5fcff"];

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
 * Bocanada field: CSS cobalt always; WebGL dye follows the pointer.
 * Lattice lives in the shader; CSS sparks are the reduced-motion stand-in.
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
    if (!simQuality) {
      setCanUseWebgl(false);
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
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#02122d]"
      aria-hidden="true"
    >
      <div className="bocanada-field absolute inset-0" />
      {canUseWebgl && simQuality ? (
        <div className="absolute inset-0">
          <LiquidEther
            className="h-full w-full"
            colors={BOCANADA_SMOKE_COLORS}
            backgroundColor="#02122d"
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
    </div>
  );
};

export default AppBackground;
