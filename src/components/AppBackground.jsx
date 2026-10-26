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

/* The dye's detail is set by its simulation render targets, which are the canvas
   size times `resolution`. One pair of constants therefore means the same thing
   on every device: the same fraction of the viewport, so the smoke reads with the
   same fluidity. A phone gets a smaller grid in absolute pixels (125x270 against a
   desktop's 460x288) and is cheaper for it, so there is nothing for a separate
   profile to buy — the old `0.22 / 8` coarse branch put 86x186 targets behind a
   390x844 screen and is what made the mobile field look flat. See
   odd/tasks/mobile-field-parity.md. */
const SIM_QUALITY = { resolution: 0.32, iterationsPoisson: 12 };

/* A phone on 3G would spend 181 KB of `three` to mount a field whose first frame
   it cannot paint anyway: the CSS field below already covers those seconds, and
   it is the same field the page shows until the chunk lands. So the live dye
   waits for a connection that can afford it, and mounts later if the connection
   improves. No NetworkInformation API means no guessing: the field mounts. */
const SLOW_EFFECTIVE_TYPES = new Set(["slow-2g", "2g", "3g"]);

function getConnection() {
  return typeof navigator === "undefined" ? null : navigator.connection;
}

function getSimQuality() {
  const connection = getConnection();
  if (!connection) {
    return SIM_QUALITY;
  }
  if (connection.saveData) {
    return null;
  }
  return SLOW_EFFECTIVE_TYPES.has(connection.effectiveType) ? null : SIM_QUALITY;
}

/**
 * One blob of the field: the hue is two fixed gradients cross-faded by
 * `opacity` (see `.field-blob` in globals.css), inside the element that
 * `useFieldMotion` translates with the reading progress.
 */
const FieldBlob = ({ index }) => (
  <div className={`field-blob field-blob-${index}`}>
    <span className="field-blob-layer field-blob-start" />
    <span className="field-blob-layer field-blob-end" />
  </div>
);

/**
 * Bocanada field, retoned for the glass-motion system.
 *
 * Layers, back to front: the navy cobalt sky, three blobs whose hue travels
 * with the reading progress, the WebGL dye (smoke + the coral lattice and its
 * spring flares live in the shader), the cursor light, then grain.
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
    const offMotion = subscribeReducedMotion(applyMotionPreference);

    // The connection is re-read rather than sampled once: a phone that walks out
    // of a dead zone should get the live field without a reload.
    const connection = getConnection();
    const applyConnection = () => {
      if (prefersReducedMotion()) return;
      const next = getSimQuality();
      setSimQuality(next);
      if (!next) setCanUseWebgl(false);
    };
    connection?.addEventListener?.("change", applyConnection);

    return () => {
      offMotion();
      connection?.removeEventListener?.("change", applyConnection);
    };
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
      <FieldBlob index={1} />
      <FieldBlob index={2} />
      <FieldBlob index={3} />
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
