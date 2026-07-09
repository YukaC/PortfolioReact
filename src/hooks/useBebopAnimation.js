import { useState, useEffect, useRef, useCallback } from "react";
import { ANIMATION_PHASES, PHASE_TIMINGS } from "@/data/constants";
import { prefetchBebopAssets } from "@/data/bebopShip";

const HOVER_DELAY_MS = 1500;
/** Idle warm after page load — overlap LCP, hide cold-start lag (V34). */
const IDLE_PREFETCH_MS = 1800;

/**
 * Ceiling wait for the WebGL scene to signal (via handleShipReady) that its
 * gsap timeline actually started playing before we force the ENDCARD
 * transition regardless. Cold start (server restart / hard reload) has to
 * pay for webpack compiling the `BebopShipScene` chunk + GLTF fetch + first
 * shader compile for the Bloom/Halftone passes — that can lag well past
 * PHASE_TIMINGS.SHIP, and a *fixed* timer anchored to phase-entry (the old
 * behavior) would cut the fly-by short / close the CRT fade before the ship
 * finished. See SPEC.md B19.
 */
const SHIP_READY_FALLBACK_MS = 4000;

/**
 * State machine for the Cowboy Bebop footer easter egg.
 */
export function useBebopAnimation() {
  const [phase, setPhase] = useState(ANIMATION_PHASES.IDLE);
  const phaseRef = useRef(phase);
  const phaseTimerRef = useRef(null);
  const hoverTimerRef = useRef(null);
  const shipReadyHandledRef = useRef(false);

  phaseRef.current = phase;
  const isActive = phase !== ANIMATION_PHASES.IDLE;

  const clearPhaseTimer = useCallback(() => {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  }, []);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const dismissAnimation = useCallback(() => {
    clearPhaseTimer();
    clearHoverTimer();
    setPhase(ANIMATION_PHASES.IDLE);
  }, [clearPhaseTimer, clearHoverTimer]);

  const startAnimation = useCallback(() => {
    if (phaseRef.current !== ANIMATION_PHASES.IDLE) return;
    setPhase(ANIMATION_PHASES.CRT_ON);
  }, []);

  const bebopDebugParam =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("bebopDebug")
      : null;
  // Dev QA: /?bebopDebug=ship skips CRT/countdown and freezes on WebGL fly-by
  const isShipDebug = bebopDebugParam === "ship";
  // Dev QA: /?bebopDebug=full runs the entire real state machine (no hover
  // needed) — used to verify SHIP→ENDCARD timing isn't cut short on cold
  // start (see SPEC B19).
  const isFullDebug = bebopDebugParam === "full";

  // Warm GLTF + BebopShipScene chunk after idle — hard reload / first visit
  // used to pay webpack+fetch only when SHIP mounted (visible lag). V34.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let idleId = 0;
    let timeoutId = 0;
    const warm = () => {
      prefetchBebopAssets().catch(() => {});
    };
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(warm, { timeout: IDLE_PREFETCH_MS });
    } else {
      timeoutId = window.setTimeout(warm, IDLE_PREFETCH_MS);
    }
    return () => {
      if (idleId && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!isShipDebug) return undefined;
    if (phaseRef.current !== ANIMATION_PHASES.IDLE) return undefined;
    prefetchBebopAssets().catch(() => {});
    const id = setTimeout(() => setPhase(ANIMATION_PHASES.SHIP), 200);
    return () => clearTimeout(id);
  }, [isShipDebug]);

  useEffect(() => {
    if (!isFullDebug) return undefined;
    if (phaseRef.current !== ANIMATION_PHASES.IDLE) return undefined;
    prefetchBebopAssets().catch(() => {});
    const id = setTimeout(startAnimation, 200);
    return () => clearTimeout(id);
  }, [isFullDebug, startAnimation]);

  useEffect(() => {
    if (phase === ANIMATION_PHASES.IDLE) return;

    const scheduleNextPhase = (nextPhase, delay) => {
      phaseTimerRef.current = setTimeout(() => {
        setPhase(nextPhase);
      }, delay);
    };

    switch (phase) {
      case ANIMATION_PHASES.CRT_ON:
        // Re-warm during intro — covers users who skipped idle/hover.
        prefetchBebopAssets().catch(() => {});
        scheduleNextPhase(ANIMATION_PHASES.COUNTDOWN_3, PHASE_TIMINGS.CRT_ON);
        break;
      case ANIMATION_PHASES.COUNTDOWN_3:
        scheduleNextPhase(
          ANIMATION_PHASES.COUNTDOWN_2,
          PHASE_TIMINGS.COUNTDOWN,
        );
        break;
      case ANIMATION_PHASES.COUNTDOWN_2:
        scheduleNextPhase(
          ANIMATION_PHASES.COUNTDOWN_1,
          PHASE_TIMINGS.COUNTDOWN,
        );
        break;
      case ANIMATION_PHASES.COUNTDOWN_1:
        scheduleNextPhase(ANIMATION_PHASES.JAM, PHASE_TIMINGS.COUNTDOWN);
        break;
      case ANIMATION_PHASES.JAM:
        scheduleNextPhase(ANIMATION_PHASES.FADE_TO_BLACK, PHASE_TIMINGS.JAM);
        break;
      case ANIMATION_PHASES.FADE_TO_BLACK:
        scheduleNextPhase(ANIMATION_PHASES.SHIP, PHASE_TIMINGS.FADE);
        break;
      case ANIMATION_PHASES.SHIP:
        // Freeze on SHIP while tuning camera/trail against the Tank! ref
        if (isShipDebug) break;
        // No fixed timer here on purpose — real transition is scheduled by
        // handleShipReady() once the WebGL timeline actually starts. This
        // is just a safety ceiling in case the ready signal never arrives
        // (e.g. GLTF load failure) so the easter egg can't hang forever.
        shipReadyHandledRef.current = false;
        phaseTimerRef.current = setTimeout(() => {
          if (!shipReadyHandledRef.current) {
            shipReadyHandledRef.current = true;
            setPhase(ANIMATION_PHASES.ENDCARD);
          }
        }, SHIP_READY_FALLBACK_MS);
        break;
      case ANIMATION_PHASES.ENDCARD:
        scheduleNextPhase(ANIMATION_PHASES.CRT_OFF, PHASE_TIMINGS.ENDCARD);
        break;
      case ANIMATION_PHASES.CRT_OFF:
        phaseTimerRef.current = setTimeout(() => {
          setPhase(ANIMATION_PHASES.IDLE);
        }, PHASE_TIMINGS.CRT_OFF);
        break;
      default:
        break;
    }

    return clearPhaseTimer;
  }, [phase, clearPhaseTimer, isShipDebug]);

  // Called by BebopScene once its gsap timeline actually starts (see
  // BebopShipScene.jsx `onReady`) — anchors the SHIP→ENDCARD delay to real
  // playback start instead of phase-entry, fixing the cold-start desync
  // where the fade-out closed before the fly-by finished (SPEC B19).
  const handleShipReady = useCallback(() => {
    if (phaseRef.current !== ANIMATION_PHASES.SHIP) return;
    if (isShipDebug) return; // debug freeze — never auto-advance
    if (shipReadyHandledRef.current) return;
    shipReadyHandledRef.current = true;
    clearPhaseTimer();
    phaseTimerRef.current = setTimeout(() => {
      setPhase(ANIMATION_PHASES.ENDCARD);
    }, PHASE_TIMINGS.SHIP);
  }, [clearPhaseTimer, isShipDebug]);

  useEffect(() => {
    if (!isActive) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isActive]);

  const handleTriggerEnter = useCallback(() => {
    if (phaseRef.current !== ANIMATION_PHASES.IDLE) return;
    prefetchBebopAssets().catch(() => {});
    void import("@/components/BebopAnimation");
    clearHoverTimer();
    hoverTimerRef.current = setTimeout(startAnimation, HOVER_DELAY_MS);
  }, [startAnimation, clearHoverTimer]);

  const handleTriggerLeave = useCallback(() => {
    clearHoverTimer();
  }, [clearHoverTimer]);

  useEffect(
    () => () => {
      clearPhaseTimer();
      clearHoverTimer();
      document.body.style.overflow = "";
    },
    [clearPhaseTimer, clearHoverTimer],
  );

  return {
    phase,
    isActive,
    startAnimation,
    dismissAnimation,
    handleTriggerEnter,
    handleTriggerLeave,
    handleShipReady,
  };
}
