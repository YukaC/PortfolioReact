import { useEffect } from "react";
import {
  prefersReducedMotion,
  subscribeReducedMotion,
} from "@/motion/prefersReducedMotion";

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const SCROLL_LERP = 0.11;
const TILT_LERP = 0.07;
const POINTER_LERP = 0.14;
const SETTLE = 0.05;

/**
 * The motion channel, scoped to the elements that read it.
 *
 * Writing the seven custom properties on <html> invalidated style for the whole
 * document every frame, which is the dominant measured cost of the scroll
 * (odd/tasks/scroll-perf-pass.md). Each channel is now written only on its
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

/** Readers, resolved once per loop start: one query per channel, deduped. */
const bindChannels = () =>
  Object.fromEntries(
    Object.entries(CHANNELS).map(([name, { prop, precision, selectors }]) => {
      const elements = new Set();
      for (const selector of selectors) {
        for (const element of document.querySelectorAll(selector)) {
          elements.add(element);
        }
      }
      return [name, { prop, precision, elements: [...elements], last: null }];
    }),
  );

/**
 * One write per channel that actually changed, at the precision the CSS was
 * tuned for. Dropping the unchanged values is what keeps a still page from
 * recalculating style 60 times a second and lets the loop end silently.
 */
const write = (channel, value) => {
  const text = value.toFixed(channel.precision);
  if (text === channel.last) return;
  channel.last = text;
  for (const element of channel.elements) {
    element.style.setProperty(channel.prop, text);
  }
};

/**
 * Single smoothing engine for the field.
 *
 * One rAF loop with inertia, the way the reference does it: layers trail the
 * scroll and the pointer instead of snapping to them. Under reduced motion the
 * loop never starts and the channel is left at its settled values.
 */
export function useFieldMotion() {
  useEffect(() => {
    const root = document.documentElement;
    let channels = bindChannels();

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
    let smoothedScroll = window.scrollY;
    let targetPointerX = 0;
    let targetPointerY = 0;
    let smoothedPointerX = 0;
    let smoothedPointerY = 0;
    let targetMouseX = -999;
    let targetMouseY = -999;
    let smoothedMouseX = -999;
    let smoothedMouseY = -999;

    const frame = () => {
      const scrollY = window.scrollY;
      smoothedScroll += (scrollY - smoothedScroll) * SCROLL_LERP;
      smoothedPointerX += (targetPointerX - smoothedPointerX) * TILT_LERP;
      smoothedPointerY += (targetPointerY - smoothedPointerY) * TILT_LERP;
      if (smoothedMouseX < -900) {
        smoothedMouseX = targetMouseX;
        smoothedMouseY = targetMouseY;
      }
      smoothedMouseX += (targetMouseX - smoothedMouseX) * POINTER_LERP;
      smoothedMouseY += (targetMouseY - smoothedMouseY) * POINTER_LERP;

      write(channels.scy, smoothedScroll);
      write(channels.p, clamp01(smoothedScroll / maxScroll));
      write(channels.hf, clamp01(1 - smoothedScroll / (viewport * 0.75)));
      write(channels.px, smoothedPointerX);
      write(channels.py, smoothedPointerY);
      write(channels.mx, smoothedMouseX);
      write(channels.my, smoothedMouseY);

      const remaining =
        Math.abs(scrollY - smoothedScroll) +
        Math.abs(targetPointerX - smoothedPointerX) +
        Math.abs(targetPointerY - smoothedPointerY) +
        Math.abs(targetMouseX - smoothedMouseX) +
        Math.abs(targetMouseY - smoothedMouseY);

      if (remaining > SETTLE) {
        raf = requestAnimationFrame(frame);
      } else {
        running = false;
      }
    };

    const kick = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };

    // The document height moves without a window resize (fonts, images, the
    // intro settling, a filter narrowing the list). Watching the layout box
    // costs one observer instead of one forced layout per frame.
    const layoutObserver =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            measure();
            kick();
          })
        : null;

    const onScroll = () => kick();
    const onResize = () => {
      measure();
      channels = bindChannels();
      kick();
    };
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

    const stop = () => {
      cancelAnimationFrame(raf);
      running = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      layoutObserver?.disconnect();
    };

    const start = () => {
      stop();
      measure();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      layoutObserver?.observe(document.body);
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
