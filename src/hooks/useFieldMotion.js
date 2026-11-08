import { useEffect } from "react";
import { BREAKPOINT, isAtMost } from "@/lib/breakpoints";
import { MOTION_MEDIA } from "@/motion/config";
import { damp } from "@/motion/damp";
import {
  prefersReducedMotion,
  subscribeReducedMotion,
} from "@/motion/prefersReducedMotion";
import { getScrollPosition } from "@/motion/smoothScroll";

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/**
 * Smoothing rates in 1/s, not per-frame factors.
 *
 * These were `SCROLL_LERP 0.11`, `TILT_LERP 0.07` and `POINTER_LERP 0.14`
 * multiplied into the remaining distance once per frame, so the trail depended
 * on the refresh rate (audit.md §10 P0-2, P2-5's sibling). Each surviving factor
 * is now `lambda = -60 · ln(1 - f)` at 60 fps:
 *
 *   scroll  0.11 → gone: the scroll layer owns that value, this file reads it
 *   tilt    0.07 → 4.35  .field-blob, .hero-ornament
 *   pointer 0.14 → 9.05  .field-glow
 */
const TILT_LAMBDA = 4.35;
const POINTER_LAMBDA = 9.05;
const SETTLE = 0.05;
const DEFAULT_DT = 1 / 60;
/** A dropped frame or a backgrounded tab eases in as one 60 fps frame instead
    of arriving in a lurch. */
const MAX_DT = 1 / 20;
/** The document height moves without a window resize (fonts, a filter narrowing
    the list, a late image), and both the resize event and the layout observer
    fire every frame while it happens. Re-measuring is cheap but re-binding the
    channels is not, so the work waits for the box to settle. */
const MEASURE_DEBOUNCE_MS = 160;

/**
 * The motion channel, scoped to the elements that read it.
 *
 * Writing the seven custom properties on <html> invalidated style for the whole
 * document every frame, which is the dominant measured cost of the scroll
 * (odd/tasks/archive/scroll-perf-pass.md). Each channel is now written only on its
 * readers, resolved when the loop (re)starts, and skipped when the formatted
 * value did not change.
 *
 *   --scy  smoothed scroll offset (px)   .hero-copy; its split words inherit it
 *   --p    reading progress 0..1         .field-blob x3, .field-progress > span
 *   --hf   hero fade 1..0 over 3/4 vh    .hero-copy
 *   --px   pointer x, -0.5..0.5          .field-blob x3, .hero-ornament
 *   --py   pointer y, -0.5..0.5          .field-blob x3, .hero-ornament
 *   --mx   raw pointer x (px)            .field-glow
 *   --my   raw pointer y (px)            .field-glow
 *
 * The scroll channels are read from the smooth layer, never re-interpolated
 * here: two lerps in series over one value is what put the field 0.5–0.7 s
 * behind the content it sits under (audit.md §10 P0-2).
 *
 * The `:root` defaults in globals.css stay: they are the settled state, so a
 * reader that never receives a write — or a reader with no JS at all — is still
 * composed.
 */
const CHANNELS = {
  scy: { prop: "--scy", precision: 1, selectors: [".hero-copy"] },
  p: {
    prop: "--p",
    precision: 4,
    selectors: [".field-blob", ".field-progress > span"],
  },
  hf: { prop: "--hf", precision: 3, selectors: [".hero-copy"] },
  px: {
    prop: "--px",
    precision: 3,
    selectors: [".field-blob", ".hero-ornament"],
  },
  py: {
    prop: "--py",
    precision: 3,
    selectors: [".field-blob", ".hero-ornament"],
  },
  mx: { prop: "--mx", precision: 1, selectors: [".field-glow"] },
  my: { prop: "--my", precision: 1, selectors: [".field-glow"] },
};

/**
 * Which channels have a reader right now.
 *
 * A custom property written on `.hero-copy` is inherited by every split word, so a
 * channel nobody reads there still dirties the whole hero subtree on every scroll
 * event. The binding is therefore resolved against the conditions the stylesheet
 * actually uses — and they are not the same one:
 *
 *   --scy  `.hero-copy` stops reading it under `max-wide` (globals.css §hero), the
 *          split words `.w` only under `pointer-coarse`. A phone at 390 px reads
 *          neither; a narrow *desktop* window still drifts, by `0.056 × the offset`
 *          (`.w`'s `--k` at the fourth word, -0.014 each), which is 22 px at 400 px
 *          of scroll.
 *   --hf   only `.hero-copy`'s `opacity` reads it, and `max-wide` pins that to 1.
 *   --p    not listed: the progress bar reads it at every width.
 */
const readsAt = (wide, fine) => ({ scy: wide || fine, hf: wide });

/** Readers, resolved once per loop start: one query per channel, deduped. */
const bindChannels = (fine) => {
  /* Asked through `src/lib/breakpoints.js`, the one place a script reads a width:
     `isAtMost(wide)` is the `max-wide` condition the stylesheet switches at, so the
     channels and the CSS that reads them can never disagree. A rotation, a resize
     or a pointer change re-binds through `scheduleMeasure(true)` and
     `bindPointer()`. */
  const reads = readsAt(!isAtMost(BREAKPOINT.wide), fine);
  return Object.fromEntries(
    Object.entries(CHANNELS)
      .filter(([name]) => reads[name] !== false)
      .map(([name, { prop, precision, selectors }]) => {
        const elements = new Set();
        for (const selector of selectors) {
          for (const element of document.querySelectorAll(selector)) {
            elements.add(element);
          }
        }
        return [name, { prop, precision, elements: [...elements], last: null }];
      }),
  );
};

/**
 * One write per channel that actually changed, at the precision the CSS was
 * tuned for. Dropping the unchanged values is what keeps a still page from
 * recalculating style 60 times a second and lets the loop end silently.
 */
const write = (channel, value) => {
  // A channel that is not bound at this width has nothing to write to.
  if (!channel) return;
  const text = value.toFixed(channel.precision);
  if (text === channel.last) return;
  channel.last = text;
  for (const element of channel.elements) {
    element.style.setProperty(channel.prop, text);
  }
};

/**
 * The field's motion channel.
 *
 * Two writers, one per question: the scroll channels are written where the
 * scroll is reported (the value is already smoothed by its single owner, so
 * there is nothing to interpolate), and the pointer channels are damped in one
 * rAF loop that only runs while the pointer is still travelling. Under reduced
 * motion neither writes and the channel is left at its settled values.
 */
export function useFieldMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const pointerQuery = window.matchMedia(MOTION_MEDIA.finePointer);
    let channels = bindChannels(pointerQuery.matches);

    // Viewport and scroll extent are measured on a resize and on a real layout
    // change, never inside the frame: reading them per frame forced layout.
    let viewport = window.innerHeight;
    let viewportWidth = window.innerWidth;
    let maxScroll = 1;
    const measure = () => {
      viewport = window.innerHeight;
      viewportWidth = window.innerWidth;
      maxScroll = Math.max(1, root.scrollHeight - viewport);
    };

    const settle = () => {
      write(channels.scy, 0);
      write(channels.p, 0);
      write(channels.hf, 1);
      write(channels.px, 0);
      write(channels.py, 0);
      write(channels.mx, -999);
      write(channels.my, -999);
    };

    let raf = 0;
    let running = false;
    let lastFrameTime = 0;
    let pointerBound = false;
    let measureTimer = 0;
    let pendingRebind = false;

    let targetPointerX = 0;
    let targetPointerY = 0;
    let smoothedPointerX = 0;
    let smoothedPointerY = 0;
    let targetMouseX = -999;
    let targetMouseY = -999;
    let smoothedMouseX = -999;
    let smoothedMouseY = -999;

    const frame = (now) => {
      const dt = lastFrameTime
        ? Math.min((now - lastFrameTime) / 1000, MAX_DT)
        : DEFAULT_DT;
      lastFrameTime = now;

      smoothedPointerX = damp(smoothedPointerX, targetPointerX, TILT_LAMBDA, dt);
      smoothedPointerY = damp(smoothedPointerY, targetPointerY, TILT_LAMBDA, dt);
      if (smoothedMouseX < -900) {
        smoothedMouseX = targetMouseX;
        smoothedMouseY = targetMouseY;
      }
      smoothedMouseX = damp(smoothedMouseX, targetMouseX, POINTER_LAMBDA, dt);
      smoothedMouseY = damp(smoothedMouseY, targetMouseY, POINTER_LAMBDA, dt);

      write(channels.px, smoothedPointerX);
      write(channels.py, smoothedPointerY);
      write(channels.mx, smoothedMouseX);
      write(channels.my, smoothedMouseY);

      const remaining =
        Math.abs(targetPointerX - smoothedPointerX) +
        Math.abs(targetPointerY - smoothedPointerY) +
        Math.abs(targetMouseX - smoothedMouseX) +
        Math.abs(targetMouseY - smoothedMouseY);

      if (remaining > SETTLE) {
        raf = requestAnimationFrame(frame);
      } else {
        running = false;
        // The next kick starts a fresh interval instead of inheriting the gap.
        lastFrameTime = 0;
      }
    };

    const kick = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };

    /* The scroll channels are written where the scroll arrives, not in the rAF
       loop: the value is already smoothed by the one owner, so there is nothing
       to interpolate, and a scroll handler that writes one already-computed
       value is the shortest path from the reader's gesture to the field (one
       frame instead of two). The loop is left to the pointer layers, which is
       also why a scroll no longer wakes them up. */
    const writeScroll = () => {
      const scroll = getScrollPosition();
      write(channels.scy, scroll);
      write(channels.p, clamp01(scroll / maxScroll));
      write(channels.hf, clamp01(1 - scroll / (viewport * 0.75)));
    };

    const onScroll = () => writeScroll();

    // The measured viewport is also what a pointer event divides by: reading
    // it here would force a layout on every event, right after the loop dirtied
    // style, which is the per-frame layout this rewrite exists to remove.
    const onPointerMove = (event) => {
      targetPointerX = event.clientX / viewportWidth - 0.5;
      targetPointerY = event.clientY / viewport - 0.5;
      targetMouseX = event.clientX;
      targetMouseY = event.clientY;
      kick();
    };

    /* A coarse pointer has nothing to point with, and the layers it drives
       (.field-glow, .hero-ornament) are `display: none` there — the listeners
       were a per-event cost for a channel nobody reads (audit.md §10 P2-5). The
       capability is watched, not sampled once: a tablet that gains a mouse gets
       the channel, and a hybrid that loses it returns to the settled values. */
    const bindPointer = (fine) => {
      if (fine === pointerBound) return;
      pointerBound = fine;
      /* The split words are the other reader of `--scy` and they stop with the
         pointer, so the channel is re-bound with it instead of staying written for
         a subtree that no longer moves. */
      channels = bindChannels(fine);
      if (fine) {
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        return;
      }
      window.removeEventListener("pointermove", onPointerMove);
      targetPointerX = 0;
      targetPointerY = 0;
      targetMouseX = -999;
      targetMouseY = -999;
      kick();
    };

    const onPointerCapability = (event) => bindPointer(event.matches);

    const scheduleMeasure = (rebind = false) => {
      pendingRebind = pendingRebind || rebind;
      if (measureTimer) clearTimeout(measureTimer);
      measureTimer = window.setTimeout(() => {
        measureTimer = 0;
        measure();
        if (pendingRebind) {
          pendingRebind = false;
          channels = bindChannels(pointerQuery.matches);
        }
        // The extent and the viewport changed: the scroll channels are wrong
        // even though nobody scrolled.
        writeScroll();
        kick();
      }, MEASURE_DEBOUNCE_MS);
    };

    // The document height moves without a window resize (fonts, images, the
    // intro settling, a filter narrowing the list). Watching the layout box
    // costs one observer instead of one forced layout per frame, and the
    // measurement it triggers is coalesced so a resize drag does not re-measure
    // — or re-bind the channels — sixty times a second (audit.md §10 P2-6).
    const layoutObserver =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => scheduleMeasure())
        : null;

    const onResize = () => scheduleMeasure(true);

    const stop = () => {
      cancelAnimationFrame(raf);
      running = false;
      lastFrameTime = 0;
      if (measureTimer) {
        clearTimeout(measureTimer);
        measureTimer = 0;
      }
      pendingRebind = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      pointerQuery.removeEventListener("change", onPointerCapability);
      if (pointerBound) {
        window.removeEventListener("pointermove", onPointerMove);
        pointerBound = false;
      }
      layoutObserver?.disconnect();
    };

    const start = () => {
      stop();
      measure();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize);
      pointerQuery.addEventListener("change", onPointerCapability);
      bindPointer(pointerQuery.matches);
      layoutObserver?.observe(document.body);
      // A page restored mid-document is already scrolled: the field starts where
      // the reader is, not at the top.
      writeScroll();
      kick();
    };

    const sync = (isReduced) => {
      if (isReduced) {
        stop();
        settle();
        return;
      }
      start();
    };

    sync(prefersReducedMotion());
    const unsubscribe = subscribeReducedMotion(sync);

    return () => {
      unsubscribe();
      stop();
    };
  }, []);
}
