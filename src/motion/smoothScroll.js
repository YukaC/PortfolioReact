import Lenis from "lenis";
import { prefersReducedMotion, subscribeReducedMotion } from "./prefersReducedMotion";
import { gsap, registerMotion } from "./register";

/* One owner of the smoothed scroll (docs/audit.md §10 P0-2).

The instance used to be created with `lerp: 0.07` **and** `duration: 0.55`:
Lenis ignores `duration` when `lerp` is present, so the pair looked like a
balanced configuration and was really one value plus a lie. Exactly one
smoothing parameter is passed now, and every reader of the scroll consumes this
instance's own value instead of re-interpolating it: the field channel reads
`lenis.scroll`, and the scroll ranges are notified from this instance's own
`scroll` event, so the page keeps one scroll source. */
const SCROLL_LERP = 0.07;

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
   long task at 240 ms, so a tighter
   gap reads a fling as "settled" exactly when the reader needs the class — and
   a fling that keeps the class a quarter of a second too long costs nothing. */
const FLING_GAP_MS = 250;

/* A coarse pointer never got smoothing from Lenis: with its defaults it copies the
native scroll instead of interpolating it, so the phone paid for `lenis.raf` on the
GSAP ticker every frame, plus `onNativeScroll` → `onScroll` per scroll event, to
reproduce a position the browser had already settled. On that
pointer this module mounts one passive listener instead, which keeps the two things
every other reader asks it for — the position and the `fling` latch — and reads
`window.scrollY` once per event, in one place. Asked the way `useRevealOnEnter.js`
and `quality-tier.js` ask it, and once: the answer only changes when the OS flips
the pointer. */
const coarsePointer = () => {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
};

let lenisInstance = null;
let tickerCallback = null;
/* The native path's cache: the offset the last scroll event reported. Kept here so
   no reader has to ask the document again inside a handler (`getScrollPosition`). */
let nativeScrollY = 0;
let nativeListener = null;
let lastFlingPosition = 0;
let lastFlingTime = 0;
let flingWatchdog = 0;

/* The readers of the scroll offset that are not the field channel: the page's
scroll ranges (`src/motion/scrollProgress.js`). One module-level set, notified
inside the listeners this module already installs — the Lenis `scroll` event on
the smoothed path and the one passive `scroll` listener on the native one — so
the page keeps exactly one scroll source however many ranges exist, and none of
them owns a frame.

A subscription is bookkeeping only: it mounts nothing and, at rest, runs nothing.
The scroll layer starts listening when `startSmoothScroll()` runs, the same way
the ranges start resolving when their elements mount. */
const scrollSubscribers = new Set();

/* The listener that keeps the subscribers fed when the page has no scroll layer:
under reduced motion nothing is mounted, and the islands' trim at mount only
covers a page loaded with the preference already on. A session that flips it
half-way still has running ranges, and they have to keep answering — the source
ScrollTrigger used to be. Mounted only while no other source exists, so the
smoothed path never notifies twice. */
let fallbackListener = null;

function notifyScroll() {
  scrollSubscribers.forEach((fn) => fn());
}

function syncScrollSource() {
  if (typeof window === "undefined") return;
  const needed = scrollSubscribers.size > 0 && !lenisInstance && !nativeListener;
  if (needed && !fallbackListener) {
    fallbackListener = () => notifyScroll();
    window.addEventListener("scroll", fallbackListener, { passive: true });
  } else if (!needed && fallbackListener) {
    window.removeEventListener("scroll", fallbackListener);
    fallbackListener = null;
  }
}

/**
 * Calls `fn` on every scroll the page reports. Returns the unsubscribe.
 */
export function subscribeScroll(fn) {
  if (typeof fn !== "function") return () => {};
  scrollSubscribers.add(fn);
  syncScrollSource();
  return () => {
    scrollSubscribers.delete(fn);
    syncScrollSource();
  };
}

export function getLenis() {
  return lenisInstance;
}

/**
 * The scroll position the page has settled on.
 *
 * This is the single source of truth for the motion channel: with Lenis mounted it
 * is the value Lenis reports (already smoothed, frame-rate independent); on a
 * coarse pointer it is the offset the one native listener cached, so a reader that
 * asks once per frame never touches the document; and before either is mounted —
 * reduced motion, or a script that runs first — it is the native offset. Reading it
 * here keeps `useFieldMotion` from applying a second lerp on top of a value that is
 * already interpolated.
 */
export function getScrollPosition() {
  if (typeof window === "undefined") return 0;
  if (lenisInstance) return lenisInstance.scroll;
  return nativeListener ? nativeScrollY : window.scrollY;
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
    mountScroll();
  };

  /* A reload hands back the offset the reader had before it, and that is a scroll
     nobody asked for on the page they just opened: the 8 nov recording shows a page
     that loads ~16 px down — a sliver of the progress bar, the hero a hair higher,
     the ghost CTA crossing the fold — and snaps to the top on the first gesture. */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (!window.location.hash) window.scrollTo(0, 0);

  syncPreference(prefersReducedMotion());
  const unsubscribe = subscribeReducedMotion(syncPreference);

  /* The resize policy that used to live here — width-only, debounced — is now
     `src/motion/scrollProgress.js`'s: it is the module that caches geometry, so
     it is the module that decides when geometry is stale. */
  return () => {
    unsubscribe();
    teardown();
  };
}

function mountScroll() {
  if (lenisInstance || nativeListener) return;

  document.documentElement.style.scrollBehavior = "auto";

  if (coarsePointer()) {
    mountNative();
    return;
  }

  mountLenis();
}

/**
 * The coarse path: one passive listener and no ticker.
 *
 * It keeps the cached position `getScrollPosition()` answers from, but not the
 * `fling` latch. The drawer's lock here is the `overflow: hidden` the Navbar puts
 * on <html> and <body>: `lockSmoothScroll()` only stops Lenis, which this path
 * never mounts. And no latch because on a coarse pointer nothing reads
 * the class (the reveal never hides there), and each toggle on <html> re-styled
 * 418 elements, ~20 ms on the moto g82, at the start and end of every flick.
 */
function mountNative() {
  nativeScrollY = window.scrollY;

  nativeListener = () => {
    nativeScrollY = window.scrollY;
    notifyScroll();
  };
  window.addEventListener("scroll", nativeListener, { passive: true });
  syncScrollSource();
}

function mountLenis() {
  if (lenisInstance) return;

  const lenis = new Lenis({
    autoRaf: false,
    lerp: SCROLL_LERP,
  });

  /* The ranges first, the latch second: the same order the two readers were fed
     in when a trigger owned the update, so the fling class is decided against
     the position the ranges just used. */
  lenis.on("scroll", notifyScroll);
  lenis.on("scroll", syncFling);
  lastFlingPosition = lenis.scroll;
  lastFlingTime = 0;

  tickerCallback = (time) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(tickerCallback);
  gsap.ticker.lagSmoothing(0);

  lenisInstance = lenis;
  syncScrollSource();
}

function stopSmoothScroll() {
  if (tickerCallback) {
    gsap.ticker.remove(tickerCallback);
    tickerCallback = null;
  }
  gsap.ticker.lagSmoothing(500, 33);

  if (nativeListener) {
    window.removeEventListener("scroll", nativeListener);
    nativeListener = null;
  }

  if (lenisInstance) {
    lenisInstance.off("scroll", notifyScroll);
    lenisInstance.off("scroll", syncFling);
    lenisInstance.destroy();
    lenisInstance = null;
  }

  // A stopped layer is never flinging, and the class may not outlive it.
  clearFling();
  lastFlingTime = 0;

  // With no layer left, the subscribers fall back to the passive listener.
  syncScrollSource();
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
  const position = getScrollPosition();
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
