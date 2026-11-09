"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { FIELD_FLARES } from "@/lib/field-flares";
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
   390x844 screen and is what made the mobile field look flat.

   `static` has no entry: it does not mount the canvas at all (§18.6). The
   lattice and its flares are CSS, so a phone loses nothing the field's identity
   depends on, and the 181 KB of `three` stays undownloaded. */
const SIM_QUALITY = {
  full: { resolution: 0.32, iterationsPoisson: 12 },
  lite: { resolution: 0.22, iterationsPoisson: 8 },
};

/* A phone on 3G would spend 181 KB of `three` to mount a field whose first frame
   it cannot paint anyway: the CSS field below already covers those seconds, and
   it is the same field the page shows until the chunk lands. So the live dye
   waits for a connection that can afford it, and mounts later if the connection
   improves. No NetworkInformation API means no guessing: the field mounts.

   This is a separate question from the quality tier. The tier says how much the
   canvas may spend once it exists; this says whether the 181 KB download is a
   promise the reader consented to. `saveData` therefore answers both (a static
   tier and no download), which is what §18.6 asks for. */
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
 * in 8 ms on one GPU path and 87 ms in software (docs/audit.md §10 P0-3). Returns its
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
 * The 36 strikes of the identity layer, built once from the pre-generated table
 * (docs/audit.md §18.4, §19.2). They are plain markup:
 * integer cell coordinates in `--cx`/`--cy` — the stylesheet turns them into
 * `calc(var(--cx) * 48px + 24px)` so every flare lands on a dot centre, which a
 * viewport percentage cannot do (§19.3) — plus the phase, as a whole slot of the
 * breath (`calc(<slot> * var(--grid))`). The cycle is not here at all: it is
 * `--breath` in the stylesheet, one value for the whole field. Nothing here is
 * computed at runtime and nothing here needs hydration.
 */
const FLARE_ELEMENTS = FIELD_FLARES.map((flare) => (
  <i
    key={`${flare.cx}x${flare.cy}`}
    className="flare"
    style={{
      "--cx": String(flare.cx),
      "--cy": String(flare.cy),
      "--delay": `calc(${flare.slot} * var(--grid))`,
    }}
  />
));

/**
 * Bocanada field, in the two layers of docs/audit.md §18.2.
 *
 * **Layer 1, the identity**: the coral lattice (`.bocanada-lattice`, one tiled
 * raster) and its 36 flares (`.flare`). Both are CSS, both are always rendered,
 * and no state is allowed to change either: `active`, `frozen`, `static`,
 * reduced motion and no-WebGL all paint the same dots at the same 48 px origin,
 * because there is only one lattice left to paint (§18.2).
 *
 * **Layer 2, the smoke**: the WebGL dye, mounted only for the tiers that can
 * afford it and run at display rate by `LiquidEther` while the reader is active.
 * Once they have been still for 350 ms the plume stops being fed and disperses
 * into nothing over ~3.7 s, still at display rate, and only then is its loop
 * parked: 0 draws at rest. Both halves leave together — the dye thins through its
 * dissipation while the procedural haze fades out with it — so nothing is left at
 * the floor once the dispersal is over. Behind it: the navy cobalt sky and three
 * blobs whose hue travels with the reading progress; in front of it: the cursor
 * light and grain.
 *
 * Cost is still a tier (S3), and `tier` still only moves down. `static` no
 * longer mounts a canvas: that device gate is safe **now** and only now, because
 * the lattice with cell-aligned flares lives in CSS (§19.2, §19.3 — the earlier
 * attempt at exactly this was reverted in `8164756` for losing the identity).
 */
const AppBackground = () => {
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  /* `null` until the field is about to mount: the tier is a decision about a
     browser, and the server does not have one. */
  const [tier, setTier] = useState(null);
  const [connectionAllows, setConnectionAllows] = useState(connectionAllowsField);
  const [canUseWebgl, setCanUseWebgl] = useState(false);
  /* WebGL can be advertised and still refuse a context, or lose it later. When
     that happens the canvas draws nothing, so the field drops it for good and
     leaves the CSS lattice — which is always there — as the whole field. */
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

  const simQuality =
    tier && tier !== "static" && connectionAllows ? SIM_QUALITY[tier] : null;
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
            /* The two tier knobs of §18.6 that survive the split. `pixelRatio`
               is the DPR cap, `powerPreference` stays `default`: a background
               whose plume only disperses away in repose is not worth waking a
               discrete GPU for. */
            pixelRatio={pixelRatioFor(tier)}
            powerPreference="default"
          />
        </div>
      ) : null}
      {/* Over the canvas, because the dots are the top of the field: the shader
          stopped drawing its own grid in the same change, so this is the only
          lattice in every state (§18.2). */}
      <div className="bocanada-lattice" />
      <div className="bocanada-flares">{FLARE_ELEMENTS}</div>
      <div className="field-glow" />
      <div className="field-grain" />
    </div>
  );
};

export default AppBackground;
