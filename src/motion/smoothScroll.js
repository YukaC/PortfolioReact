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
reader is moving (audit.md §10 P2-6). The refresh waits for the resize to stop;
`ignoreMobileResize` drops the URL-bar case before it ever reaches us. */
const REFRESH_DEBOUNCE_MS = 200;

let lenisInstance = null;
let tickerCallback = null;
let refreshTimer = 0;

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

  const onResize = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      refreshTimer = 0;
      ScrollTrigger.refresh();
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
    lenisInstance.destroy();
    lenisInstance = null;
  }

  ScrollTrigger.refresh();
}

export function lockSmoothScroll() {
  lenisInstance?.stop();
}

export function unlockSmoothScroll() {
  lenisInstance?.start();
}
