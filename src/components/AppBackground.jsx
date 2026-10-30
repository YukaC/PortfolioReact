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

/* Events that mean "this reader is deliberately using the page", so the shader
   can compile right away. A scroll is deliberately NOT in this list: see
   SCROLL_END_MS. */
const ENGAGEMENT_EVENTS = ["touchstart", "pointerdown", "keydown"];

/* A scroll starts a gesture that the reader is watching. Mounting the field on
   the first scroll event put three's eval plus the shader compile (measured at
   177-228 ms on a 4x-throttled phone) inside that gesture, which is exactly the
   hitch that reads as "the reveal animations are lagging": the scroll stumbles
   and the next reveal lands late. So a scroll only arms a timer and the field
   mounts once the reader has stopped. */
const SCROLL_EVENTS = ["scroll", "wheel", "touchmove"];
const SCROLL_END_MS = 180;

/* After `load`, how long the field may keep asking for an idle slice before it
   mounts anyway, and the fallback when the browser has no requestIdleCallback. */
const FIELD_MOUNT_DEADLINE_MS = 1200;
const FIELD_MOUNT_FALLBACK_MS = 600;
/* A visitor who reads and never touches anything still gets the live field: the
   smoke is part of the identity, not a reward for scrolling. */
const FIELD_EAGER_MS = 5000;

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

    /* The field is ornament, so it is never allowed to bid for the first second
       and never for a frame the reader is scrolling.

       Measured with scripts/measure-vitals.mjs (390x844, CPU 4x): three's module
       eval plus the shader compile is 380 ms of blocking work in two long tasks.
       Mounting it on the first idle slot put that on top of hydration — the part
       the reader is actually waiting for — and a scroll that landed in that
       window stuttered. So the mount waits for either the first real engagement
       (a scroll, a wheel, a touch, a key) or FIELD_EAGER_MS of a visitor who is
       only reading, then takes an idle slice. The CSS field below already paints
       the same colours, so nothing looks missing while it waits. */
    const enableWebgl = () => setCanUseWebgl(true);
    let timer = 0;
    let idleId = 0;
    let eagerTimer = 0;
    let scrollEndTimer = 0;
    let engaged = false;
    let lastScrollAt = -Infinity;

    /* Compiled only in a real gap between gestures: `requestIdleCallback` can
       report the deadline while the reader is scrolling, and mounting there put
       the 177-228 ms compile inside the gesture anyway. `lastScrollAt` is the
       arbiter, so a busy scroll keeps deferring instead of stalling. */
    const mountWhenQuiet = () => {
      if (performance.now() - lastScrollAt < SCROLL_END_MS) {
        window.clearTimeout(scrollEndTimer);
        scrollEndTimer = window.setTimeout(mountWhenQuiet, SCROLL_END_MS);
        return;
      }
      if (typeof requestIdleCallback === "function") {
        idleId = requestIdleCallback(
          () => {
            if (performance.now() - lastScrollAt < SCROLL_END_MS) {
              mountWhenQuiet();
              return;
            }
            enableWebgl();
          },
          { timeout: FIELD_MOUNT_DEADLINE_MS },
        );
        return;
      }
      timer = window.setTimeout(enableWebgl, FIELD_MOUNT_FALLBACK_MS);
    };

    const release = () => {
      for (const type of [...ENGAGEMENT_EVENTS, ...SCROLL_EVENTS]) {
        window.removeEventListener(type, onEngage, { capture: true });
        window.removeEventListener(type, onScroll, { capture: true });
      }
      window.clearTimeout(eagerTimer);
      window.clearTimeout(scrollEndTimer);
    };

    const onEngage = () => {
      if (engaged) return;
      engaged = true;
      release();
      mountWhenQuiet();
    };

    // A scroll does not mount anything by itself: it only says "not yet, the
    // reader is mid-gesture". The field lands once the scroll comes to rest.
    const onScroll = () => {
      lastScrollAt = performance.now();
      if (engaged) return;
      window.clearTimeout(scrollEndTimer);
      scrollEndTimer = window.setTimeout(onEngage, SCROLL_END_MS);
    };

    for (const type of ENGAGEMENT_EVENTS) {
      window.addEventListener(type, onEngage, { capture: true, passive: true });
    }
    for (const type of SCROLL_EVENTS) {
      window.addEventListener(type, onScroll, { capture: true, passive: true });
    }
    eagerTimer = window.setTimeout(onScroll, FIELD_EAGER_MS);

    return () => {
      release();
      if (idleId) cancelIdleCallback(idleId);
      if (timer) window.clearTimeout(timer);
    };
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
