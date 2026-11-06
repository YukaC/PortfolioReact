import Lenis from "lenis";
import { prefersReducedMotion, subscribeReducedMotion } from "./prefersReducedMotion";
import { gsap, registerMotion, ScrollTrigger } from "./register";

/* One owner of the smoothed scroll (audit.md §10 P0-2).

The instance used to be created with `lerp: 0.07` **and** `duration: 0.55`:
Lenis ignores `duration` when `lerp` is present, so the pair looked like a
balanced configuration and was really one value plus a lie. Exactly one
smoothing parameter is passed now, and every reader of the scroll (the field
channel, ScrollTrigger via `update`) consumes this instance's own value instead
of re-interpolating it. */
const SCROLL_LERP = 0.07;

/* A window resize fires every frame while a window edge is dragged, and on iOS
it also fires when the URL bar collapses mid-gesture. A `ScrollTrigger.refresh`
re-measures every trigger, so refreshing per event stutters exactly when the
reader is moving (audit.md §10 P2-6). The refresh waits for the resize to stop.

`ignoreMobileResize` is not the answer for the URL bar here: it only gates the
listener ScrollTrigger registers itself (`gsap/ScrollTrigger.js:395-397`), not
the one below. */
const REFRESH_DEBOUNCE_MS = 200;

/* A fling is a scroll nobody is reading through: the smoothed layer is
travelling faster than an entrance can finish inside it, which is how a
revealed block ends up still rising from `opacity: 0` while the reader is
already on it (owner report: "al hacer flick rápido/agresivo, el texto
desaparece por instantes"). While the class is on, the stylesheet reveals a
node at once instead of playing `--duration-reveal` under a reader who has gone
past it (globals.css §reveal).

The threshold is a speed, in px per second, not a distance per frame: a delta
per frame means a different thing on a 60 Hz and a 144 Hz screen, and this one
answer must be the same on both. Two values make it a latch — enter at the
higher speed, leave at the lower — so a fling does not chatter the class on and
off as the smoothed value eases out. */
const FLING_CLASS = "fling";
const FLING_ENTER_PX_PER_S = 2200;
const FLING_EXIT_PX_PER_S = 900;
/* The layer reports one scroll event per frame while it moves, so a gap this
   long means it has settled. Without it, a scroll stopped by a locked layer
   would leave the class on with no further event to take it off. 250 ms and not
   a frame: this repo's own phone measurements put p95 frames at 84-109 ms and a
   long task at 240 ms (odd/tasks/mobile-motion-perf.md L5, L13), so a tighter
   gap reads a fling as "settled" exactly when the reader needs the class — and
   a fling that keeps the class a quarter of a second too long costs nothing. */
const FLING_GAP_MS = 250;

let lenisInstance = null;
let tickerCallback = null;
let refreshTimer = 0;
let lastFlingPosition = 0;
let lastFlingTime = 0;
let flingWatchdog = 0;

export function getLenis() {
  return lenisInstance;
}

/**
 * The scroll position the smooth layer has settled on.
 *
 * This is the single source of truth for the motion channel: with Lenis mounted
 * it is the value Lenis reports (already smoothed, frame-rate independent), and
 * without it — reduced motion, or a script that runs before the layer mounts —
 * it is the native offset. Reading it here keeps `useFieldMotion` from applying
 * a second lerp on top of a value that is already interpolated.
 */
export function getScrollPosition() {
  if (typeof window === "undefined") return 0;
  return lenisInstance ? lenisInstance.scroll : window.scrollY;
}

export function startSmoothScroll() {
  if (typeof window === "undefined") return () => {};

  registerMotion();

  const teardown = () => {
    stopSmoothScroll();
  };

  const syncPreference = (isReduced) => {
    if (isReduced) {
      stopSmoothScroll();
      document.documentElement.style.scrollBehavior = "auto";
      return;
    }
    mountLenis();
  };

  syncPreference(prefersReducedMotion());
  const unsubscribe = subscribeReducedMotion(syncPreference);

  ScrollTrigger.config({ ignoreMobileResize: true });

  let lastWidth = window.innerWidth;
  const onResize = () => {
    /* Only a width change can move a trigger. The height-only resize a phone
    reports when the URL bar shows or hides is the case an app handler must let
    go of entirely: `refresh()` with no argument is a FORCED refresh, and its
    first act is to jump the scroll to 0 and restore a position recorded on the
    main thread (`gsap/ScrollTrigger.js:483-546`). During a gesture that stops
    the native fling and re-anchors the page behind the reader's thumb — the
    hero → footer → hero jump of the 8 nov recording
    (odd/tasks/mobile-motion-perf.md L17). `refresh(true)` is the debounced path
    ScrollTrigger's own listener takes, and it never runs for a height change. */
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      refreshTimer = 0;
      ScrollTrigger.refresh(true);
    }, REFRESH_DEBOUNCE_MS);
  };
  window.addEventListener("resize", onResize);

  return () => {
    unsubscribe();
    window.removeEventListener("resize", onResize);
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = 0;
    }
    teardown();
  };
}

function mountLenis() {
  if (lenisInstance) return;

  document.documentElement.style.scrollBehavior = "auto";

  const lenis = new Lenis({
    autoRaf: false,
    lerp: SCROLL_LERP,
  });

  lenis.on("scroll", ScrollTrigger.update);
  lenis.on("scroll", syncFling);
  lastFlingPosition = lenis.scroll;
  lastFlingTime = 0;

  tickerCallback = (time) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(tickerCallback);
  gsap.ticker.lagSmoothing(0);

  lenisInstance = lenis;
}

function stopSmoothScroll() {
  if (tickerCallback) {
    gsap.ticker.remove(tickerCallback);
    tickerCallback = null;
  }
  gsap.ticker.lagSmoothing(500, 33);

  if (lenisInstance) {
    lenisInstance.off("scroll", syncFling);
    lenisInstance.destroy();
    lenisInstance = null;
  }

  // A stopped layer is never flinging, and the class may not outlive it.
  clearFling();
  lastFlingTime = 0;

  /* Same rule as the resize handler: a forced refresh re-anchors the scroll,
     and this one runs on a reduced-motion flip, which can land mid-gesture. */
  ScrollTrigger.refresh(true);
}

/**
 * Takes the class off, and disarms the watchdog that would have taken it off.
 */
const clearFling = () => {
  if (flingWatchdog) {
    clearTimeout(flingWatchdog);
    flingWatchdog = 0;
  }
  if (typeof document !== "undefined") {
    document.documentElement.classList.remove(FLING_CLASS);
  }
};

/**
 * The latch is evaluated from scroll events, so silence is the one case it
 * cannot see: a locked layer, a backgrounded tab, a gesture the browser
 * cancels. The watchdog re-checks the gap on a timer while the class is on and
 * drops it once the events have stopped — one timer, armed when the class goes
 * on, re-armed only while the fling is still reporting.
 */
const armFlingWatchdog = () => {
  if (flingWatchdog) clearTimeout(flingWatchdog);
  flingWatchdog = window.setTimeout(() => {
    flingWatchdog = 0;
    if (!document.documentElement.classList.contains(FLING_CLASS)) return;
    if (performance.now() - lastFlingTime <= FLING_GAP_MS) {
      armFlingWatchdog();
      return;
    }
    document.documentElement.classList.remove(FLING_CLASS);
  }, FLING_GAP_MS);
};

/**
 * Writes `fling` on `<html>` while the scroll is a fling, and takes it off as
 * soon as the smoothed value is back at reading speed.
 *
 * Rides the scroll event the layer already emits — no listener and no loop of
 * its own, and the class only reaches the document when it changes, so a still
 * page costs nothing and a fling costs two class writes.
 */
const syncFling = () => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const position = lenisInstance ? lenisInstance.scroll : window.scrollY;
  const now = performance.now();
  const elapsed = lastFlingTime ? now - lastFlingTime : 0;

  if (elapsed > 0) {
    const speed = (Math.abs(position - lastFlingPosition) / elapsed) * 1000;
    const threshold = root.classList.contains(FLING_CLASS)
      ? FLING_EXIT_PX_PER_S
      : FLING_ENTER_PX_PER_S;
    const idle = elapsed > FLING_GAP_MS;
    const flinging = !idle && speed > threshold;
    if (flinging !== root.classList.contains(FLING_CLASS)) {
      root.classList.toggle(FLING_CLASS, flinging);
      if (flinging) armFlingWatchdog();
    }
  }

  lastFlingPosition = position;
  lastFlingTime = now;
};

export function lockSmoothScroll() {
  // The layer is being stopped on purpose, so no event will arrive to correct a
  // latch that was on: the class goes with it.
  clearFling();
  lenisInstance?.stop();
}

export function unlockSmoothScroll() {
  lenisInstance?.start();
}
