import { progressAt, resolveRange } from "@/lib/scroll-range";
import { subscribeScroll } from "./smoothScroll";

/* The page's scroll progress, without a loop of its own.

Four reads of the scroll used to be GSAP ScrollTrigger instances: the About
statement, the About rail, the footer rise and the nav's fine-pointer state.
None of them was a pin and all of them were `scrub: true`, which means
ScrollTrigger had nothing to smooth — it existed to resolve two document
offsets and divide. It also started a `requestAnimationFrame` keep-alive and a
`setInterval(250)` on every page, and those requested a main frame forever while
nobody was reading: the reason every composited animation on the site cost a
main-thread pass per vsync even at rest.

So the ranges resolve their geometry once per layout change and are fed by the
scroll events the page already produces — Lenis's own `scroll` on the smoothed
path, one passive listener on the native one, through `subscribeScroll`. At rest
this module owns no frame, no interval and no timer.

One module-level hub, not one per range: however many ranges exist, the page
gets one `resize` listener, one `load` listener, one `document.fonts.ready`
hand-off, one `ResizeObserver(document.body)` and one scroll subscription.

Measured nodes carry no transform of their own (the page's reveal translates
`[data-r]` nodes, and none of these is one), so `rect.top + window.scrollY` is
the layout box in document coordinates — the same box ScrollTrigger resolved its
triggers against. It is cached; a rect read inside a scroll handler is a forced
layout per event.
*/

/* A window resize fires every frame while an edge is dragged, and on a phone it
   also fires when the URL bar collapses mid-gesture. The re-measure waits for
   the resize to stop: settling a range is a rect read per range, and a burst of
   those inside a gesture is exactly the stutter this module exists to remove. */
const REFRESH_DEBOUNCE_MS = 200;

const ranges = new Set();
let lastWidth = 0;
let refreshTimer = 0;
let bodyObserver = null;
let unsubscribeScroll = null;

const scrollHeight = () =>
  (document.scrollingElement ?? document.documentElement).scrollHeight;
/* The layout box in document coordinates, never the viewport-relative copy: a
   range resolves to the same two offsets at every scroll position. */
const measureBox = (element) => {
  const rect = element.getBoundingClientRect();
  return { top: rect.top + window.scrollY, height: rect.height };
};

function measureRange(range, viewportHeight) {
  range.box = measureBox(range.element);
  range.resolved = resolveRange({
    box: range.box,
    start: range.start,
    end: range.end,
    viewportHeight,
  });
  // Before the update: a reader of the new progress (the rail's `.is-on` line)
  // re-reads everything the layout change moved, not only the range's own box.
  range.onMeasure?.({ viewportHeight });
}

/**
 * Writes the current progress of every range, from the offset the browser
 * reports at notification time.
 *
 * `window.scrollY` and not a cached copy: a range's reader uses the same number
 * for its own comparisons (the rail's reading line), so one event must carry one
 * value. Nothing here schedules work — the scroll source already did.
 */
const updateRange = (range, scrollY) => {
  const progress = progressAt(range.resolved, scrollY);
  /* Reported on change, like the scrubs this replaced: a range that has not
     started yet is at 0, and the CSS default is the state the page ships
     (`--fp: 1`). Writing that zero would hide the footer's wordmark while its
     top is still below the fold, and it would be a write per event for a value
     that did not move. */
  if (progress === range.lastProgress) return;
  range.lastProgress = progress;
  range.onUpdate?.(progress);
};

/**
 * Writes the current progress of every range, from the offset the browser
 * reports at notification time.
 *
 * `window.scrollY` and not a cached copy: a range's reader uses the same number
 * for its own comparisons (the rail's reading line), so one event must carry one
 * value. Nothing here schedules work — the scroll source already did.
 */
const updateAll = () => {
  const scrollY = window.scrollY;
  ranges.forEach((range) => updateRange(range, scrollY));
};

const measureAll = () => {
  if (!ranges.size) return;
  const viewportHeight = window.innerHeight;
  ranges.forEach((range) => measureRange(range, viewportHeight));
  // `onMeasure` has run for every range by now; the update follows it, never
  // the other way round.
  updateAll();
};

const settle = () => {
  refreshTimer = 0;
  measureAll();
};

/* The burst pattern the Navbar already uses for the same problem: the observer
   reports one entry per frame of a burst (a work filter, a late image, the serif
   landing), and the debounce turns it into one pass. */
const settleAfterBurst = () => {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(settle, REFRESH_DEBOUNCE_MS);
};

const onResize = () => {
  /* Only a width change can move a range. The height-only resize a phone reports
     when the URL bar shows or hides arrives on scroll frames, and re-measuring
     per event there costs a rect read inside a gesture for a layout that did not
     move; the body observer below is what catches the document actually
     changing size. */
  if (window.innerWidth === lastWidth) return;
  lastWidth = window.innerWidth;
  settleAfterBurst();
};

function installHub() {
  if (unsubscribeScroll) return;

  lastWidth = window.innerWidth;
  window.addEventListener("resize", onResize);
  window.addEventListener("load", measureAll);
  /* A webfont that lands after the first measurement reflows every range below
     it, and a stale cache lights the wrong item: the review of 6 nov 2026
     flagged exactly that. `fonts.ready` is the one signal for it. The promise
     cannot be unsubscribed, so `measureAll` is a no-op once the last range is
     gone. */
  if (document.fonts?.ready) document.fonts.ready.then(measureAll).catch(() => {});

  bodyObserver = new ResizeObserver(settleAfterBurst);
  bodyObserver.observe(document.body);

  unsubscribeScroll = subscribeScroll(updateAll);
}

function teardownHub() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = 0;
  if (bodyObserver) {
    bodyObserver.disconnect();
    bodyObserver = null;
  }
  window.removeEventListener("resize", onResize);
  window.removeEventListener("load", measureAll);
  if (unsubscribeScroll) {
    unsubscribeScroll();
    unsubscribeScroll = null;
  }
  lastWidth = 0;
}

/**
 * Tracks one element against a scroll range.
 *
 * `onUpdate(progress)` runs when the progress changes, plus once on mount when
 * the reader is already inside the range; `onMeasure({ viewportHeight })` runs
 * before it whenever the geometry was re-measured. Returns
 * `{ measure, update, destroy }` — `destroy` takes the range out of the hub and,
 * for the last one, removes every listener, timer and observer as well.
 */
export function createScrollRange({ element, start, end, onUpdate, onMeasure }) {
  if (typeof window === "undefined" || !element) {
    return { measure: () => {}, update: () => {}, destroy: () => {} };
  }

  const range = {
    element,
    start,
    end,
    onUpdate,
    onMeasure,
    box: { top: 0, height: 0 },
    resolved: { startY: 0, endY: 0 },
    // The progress a scrub starts at: nothing reported until the offset moves.
    lastProgress: 0,
  };

  ranges.add(range);
  installHub();

  // Measure, then report the position the reader is at: a page restored
  // mid-document is already part-way through, and gets its progress before the
  // first scroll event arrives. At the top of the page this reports nothing.
  measureRange(range, window.innerHeight);
  updateRange(range, window.scrollY);

  return {
    measure: () => measureRange(range, window.innerHeight),
    update: () => updateAll(),
    destroy: () => {
      if (!ranges.delete(range)) return;
      if (!ranges.size) teardownHub();
    },
  };
}
