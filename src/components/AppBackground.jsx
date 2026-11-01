import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  WATCHDOG_FRAMES,
  readTierEnv,
  resolveTier,
  watchdogTier,
} from "@/lib/quality-tier";
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
   odd/tasks/mobile-field-parity.md.

   What the tiers buy is a neighbour of that decision, not a replacement: `lite`
   and `static` are the same fraction of a smaller budget, chosen when the device
   cannot hold the frame (audit.md §18.6), and `static` is the cheapest canvas
   that still draws the field. */
const SIM_QUALITY = {
  full: { resolution: 0.32, iterationsPoisson: 12 },
  lite: { resolution: 0.22, iterationsPoisson: 8 },
  static: { resolution: 0.16, iterationsPoisson: 6 },
};

/* A phone on 3G would spend 181 KB of `three` to mount a field whose first frame
   it cannot paint anyway: the CSS field below already covers those seconds, and
   it is the same field the page shows until the chunk lands. So the live dye
   waits for a connection that can afford it, and mounts later if the connection
   improves. No NetworkInformation API means no guessing: the field mounts.

   This is a separate question from the quality tier. The tier says how much the
   canvas may spend once it exists; this says whether the 181 KB download is a
   promise the reader consented to. `saveData` therefore answers both (a static
   tier and no download), which is what §18.6 asks for; a coarse pointer only
   answers the first one, because in this run the device gate over the canvas is
   deliberately still off (see the comment on `tier` below). */
const SLOW_EFFECTIVE_TYPES = new Set(["slow-2g", "2g", "3g"]);

function getConnection() {
  return typeof navigator === "undefined" ? null : navigator.connection;
}

function connectionAllowsField() {
  const connection = getConnection();
  if (!connection) return true;
  if (connection.saveData) return false;
  return !SLOW_EFFECTIVE_TYPES.has(connection.effectiveType);
}

/** DPR follows the tier: a background is not worth 3 device pixels per CSS pixel,
    and on a workstation the cap is 2 (§18.6). */
function pixelRatioFor(tier) {
  if (typeof window === "undefined" || tier !== "full") return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}

/**
 * Samples `count` frame intervals and hands them back once.
 *
 * Frames are the measurement because the tier question is "can this device hold
 * a 24 ms frame", and no user agent string answers that: the same laptop renders
 * in 8 ms on one GPU path and 87 ms in software (audit.md §10 P0-3). Returns its
 * own cancel so an unmount never leaves a rAF loop behind.
 */
function sampleFrames(count, onSample) {
  const intervals = [];
  let previous = 0;
  let raf = 0;
  const step = (now) => {
    if (previous) intervals.push(now - previous);
    previous = now;
    if (intervals.length >= count) {
      onSample(intervals);
      return;
    }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
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
 *
 * Cost is a tier, not a switch (S3). `tier` starts as the device's answer and
 * only the watchdog moves it, one step down at a time. It is deliberately NOT a
 * device gate over the canvas yet: audit.md §19.3 records that removing the
 * canvas before the coral lattice with cell-aligned flares lives in CSS lost the
 * visual identity, and commit `8164756` was reverted for it. That gate, together
 * with `coverGrid()` leaving the shader, belongs to task T6 — which is why
 * `static` here still renders a canvas, with the cheapest simulation and no DPR
 * boost of its own.
 */
const AppBackground = () => {
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  /* `null` until the field is about to mount: the tier is a decision about a
     browser, and the server does not have one. */
  const [tier, setTier] = useState(null);
  const [connectionAllows, setConnectionAllows] = useState(connectionAllowsField);
  const [canUseWebgl, setCanUseWebgl] = useState(false);
  /* WebGL can be advertised and still refuse a context, or lose it later. When
     that happens the canvas draws nothing, so the field falls back to the CSS
     lattice for good instead of showing an empty background. */
  const [webglFailed, setWebglFailed] = useState(false);

  const handleUnavailable = useCallback(() => {
    setWebglFailed(true);
    setCanUseWebgl(false);
  }, []);

  useEffect(() => {
    const applyMotionPreference = (isReduced) => setIsReducedMotion(isReduced);
    applyMotionPreference(prefersReducedMotion());
    const offMotion = subscribeReducedMotion(applyMotionPreference);

    // The connection is re-read rather than sampled once: a phone that walks out
    // of a dead zone should get the live field without a reload. It only ever
    // reopens the download and the canvas; the tier is not re-resolved, because
    // a session never promotes (S3).
    const connection = getConnection();
    const applyConnection = () => setConnectionAllows(connectionAllowsField());
    connection?.addEventListener?.("change", applyConnection);

    return () => {
      offMotion();
      connection?.removeEventListener?.("change", applyConnection);
    };
  }, []);

  const simQuality = tier && connectionAllows ? SIM_QUALITY[tier] : null;
  const fieldMounted =
    Boolean(simQuality) && canUseWebgl && !isReducedMotion && !webglFailed;

  /* The 181 KB of `three` is not spent until the page is idle, and the tier is
     read in that same window: both are questions about this device, and both
     matter only when the canvas is about to exist. `current ?? …` is what keeps
     the session one-way — a reader who was downgraded by the watchdog is never
     re-probed back up. */
  useEffect(() => {
    if (isReducedMotion || !connectionAllows) return undefined;
    const enableWebgl = () => {
      const env = readTierEnv();
      if (!env || !connectionAllowsField()) return;
      setTier((current) => current ?? resolveTier(env));
      setCanUseWebgl(true);
    };
    if (typeof requestIdleCallback === "function") {
      const idleId = requestIdleCallback(enableWebgl, { timeout: 400 });
      return () => cancelIdleCallback(idleId);
    }
    const timeoutId = window.setTimeout(enableWebgl, 200);
    return () => window.clearTimeout(timeoutId);
  }, [isReducedMotion, connectionAllows]);

  /* The watchdog: 60 frames once the canvas is up, and another 60 after the
     first scroll, which is when the simulation stops being a still image. It
     can only take the tier down a step, and the second sample cannot undo the
     first — the point is that the reader keeps one quality for the whole
     session instead of watching the field change its mind. */
  useEffect(() => {
    if (!fieldMounted) return undefined;

    let cancel = sampleFrames(WATCHDOG_FRAMES, (frames) => {
      setTier((current) => watchdogTier(current, frames));
    });

    let scrolled = false;
    const onFirstScroll = () => {
      if (scrolled) return;
      scrolled = true;
      window.removeEventListener("scroll", onFirstScroll);
      cancel();
      cancel = sampleFrames(WATCHDOG_FRAMES, (frames) => {
        setTier((current) => watchdogTier(current, frames));
      });
    };
    window.addEventListener("scroll", onFirstScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onFirstScroll);
      cancel();
    };
  }, [fieldMounted]);

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
      {fieldMounted ? (
        <div className="absolute inset-0">
          <LiquidEther
            onUnavailable={handleUnavailable}
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
            /* The three tier knobs of §18.6. `LiquidEther` still hardcodes
               `pixelRatio = 1`, `powerPreference: "high-performance"` and the
               always-on idle breath inside its own renderer, and that file is
               not part of this work unit: until it accepts these three props
               the tier is honoured by the simulation quality alone. The exact
               patch is in the T3 handoff (work item 3, "could not verify"). */
            pixelRatio={pixelRatioFor(tier)}
            powerPreference="default"
            idleBreath={tier !== "static"}
          />
        </div>
      ) : null}
      {isReducedMotion || !canUseWebgl || webglFailed ? (
        <div className="bocanada-sparks absolute inset-0" />
      ) : null}
      <div className="field-glow" />
      <div className="field-grain" />
    </div>
  );
};

export default AppBackground;
