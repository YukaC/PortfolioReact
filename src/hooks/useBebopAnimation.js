import { useState, useEffect, useRef, useCallback } from "react";
import { ANIMATION_PHASES, PHASE_TIMINGS } from "@/data/bebop-timings";
import {
  prefetchBebopAssets,
  getBebopDebugMode,
  prefersBebopReducedMotion,
} from "@/data/bebopShip";

const HOVER_DELAY_MS = 1500;

/**
 * Ceiling wait for the WebGL scene to signal (via handleShipReady) that its
 * gsap timeline actually started playing before we force the ENDCARD
 * transition regardless. Cold start (server restart / hard reload) has to
 * pay for webpack compiling the `BebopShipScene` chunk + GLTF fetch + first
 * shader compile for the Bloom/Halftone passes — that can lag well past
 * PHASE_TIMINGS.SHIP. Anchored to phase duration + warm headroom (SPEC B19).
 */
const SHIP_READY_FALLBACK_MS = PHASE_TIMINGS.SHIP + 10000;

/**
 * State machine for the Cowboy Bebop footer easter egg.
 */
export function useBebopAnimation() {
  const [phase, setPhase] = useState(ANIMATION_PHASES.IDLE);
  const phaseRef = useRef(phase);
  const phaseTimerRef = useRef(null);
  const hoverTimerRef = useRef(null);
  const shipReadyHandledRef = useRef(false);
  const triggerElRef = useRef(null);

  const isActive = phase !== ANIMATION_PHASES.IDLE;

  // Sync for timers/callbacks — must be render-time so same-tick readers see latest.
  // eslint-disable-next-line react-hooks/refs -- intentional phase mirror for async handlers
  phaseRef.current = phase;

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

  const restoreTriggerFocus = useCallback(() => {
    const el = triggerElRef.current;
    if (el && typeof el.focus === "function") {
      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }
    }
  }, []);

  const dismissAnimation = useCallback(() => {
    clearPhaseTimer();
    clearHoverTimer();
    setPhase(ANIMATION_PHASES.IDLE);
    // Focus restore runs from BebopAnimation unmount + Footer coordination;
    // also restore here in case overlay already gone.
    queueMicrotask(restoreTriggerFocus);
  }, [clearPhaseTimer, clearHoverTimer, restoreTriggerFocus]);

  const startAnimation = useCallback(() => {
    if (phaseRef.current !== ANIMATION_PHASES.IDLE) return;
    // Skip WebGL/GSAP — short static endcard path.
    if (prefersBebopReducedMotion()) {
      setPhase(ANIMATION_PHASES.ENDCARD);
      return;
    }
    setPhase(ANIMATION_PHASES.CRT_ON);
  }, []);

  const debugMode = getBebopDebugMode();
  const isShipDebug = debugMode === "ship";
  const isFullDebug = debugMode === "full";

  // Idle auto-prefetch removed for lab Perf (TBT/TTI) — warm remains on
  // hover + CRT_ON (and bebopDebug). V35.

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
        // Re-warm during intro — covers users who skipped hover.
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

  // Called by BebopScene once GLTF is visible + timeline actually starts —
  // anchors SHIP→ENDCARD to real playback start (SPEC B19).
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

  /** Prefetch / WebGL failure — skip fly-by, go straight to endcard. */
  const handleShipFailed = useCallback(() => {
    if (phaseRef.current !== ANIMATION_PHASES.SHIP) return;
    if (shipReadyHandledRef.current) return;
    shipReadyHandledRef.current = true;
    clearPhaseTimer();
    setPhase(ANIMATION_PHASES.ENDCARD);
  }, [clearPhaseTimer]);

  useEffect(() => {
    if (!isActive) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isActive]);

  const armTrigger = useCallback(
    (el) => {
      if (phaseRef.current !== ANIMATION_PHASES.IDLE) return;
      if (el) triggerElRef.current = el;
      prefetchBebopAssets().catch(() => {});
      void import("@/components/BebopAnimation");
      clearHoverTimer();
      hoverTimerRef.current = setTimeout(startAnimation, HOVER_DELAY_MS);
    },
    [startAnimation, clearHoverTimer],
  );

  const handleTriggerEnter = useCallback(
    (e) => {
      armTrigger(e?.currentTarget ?? null);
    },
    [armTrigger],
  );

  const handleTriggerLeave = useCallback(() => {
    clearHoverTimer();
  }, [clearHoverTimer]);

  /** Touch / pen hold — mouse uses hover enter/leave instead. */
  const handleTriggerPointerDown = useCallback(
    (e) => {
      if (e.pointerType === "mouse") return;
      // Block scroll + keep events on this node while holding (mobile).
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* older browsers — arm anyway */
      }
      armTrigger(e.currentTarget);
    },
    [armTrigger],
  );

  const handleTriggerPointerUp = useCallback(
    (e) => {
      if (e.pointerType === "mouse") return;
      if (e.currentTarget?.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      clearHoverTimer();
    },
    [clearHoverTimer],
  );

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
    handleTriggerPointerDown,
    handleTriggerPointerUp,
    handleShipReady,
    handleShipFailed,
    triggerElRef,
    restoreTriggerFocus,
  };
}
