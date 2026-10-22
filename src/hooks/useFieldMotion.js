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
 * Single smoothing engine for the field.
 *
 * Writes the motion channel every animated layer reads from:
 *   --scy  smoothed scroll offset (px)
 *   --p    reading progress 0..1
 *   --hf   hero fade 1..0 over the first 3/4 viewport
 *   --px/--py pointer position, normalised to -0.5..0.5
 *   --mx/--my raw pointer (px) for the cursor light
 *
 * One rAF loop with inertia, the way the reference does it: layers trail the
 * scroll and the pointer instead of snapping to them. Under reduced motion the
 * loop never starts and the channel is left at its settled values.
 */
export function useFieldMotion() {
  useEffect(() => {
    const root = document.documentElement;

    const settle = () => {
      root.style.setProperty("--p", "0");
      root.style.setProperty("--scy", "0");
      root.style.setProperty("--hf", "1");
      root.style.setProperty("--px", "0");
      root.style.setProperty("--py", "0");
      root.style.setProperty("--mx", "-999");
      root.style.setProperty("--my", "-999");
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

      const viewport = window.innerHeight;
      const max = Math.max(1, root.scrollHeight - viewport);

      root.style.setProperty("--scy", smoothedScroll.toFixed(1));
      root.style.setProperty("--p", clamp01(smoothedScroll / max).toFixed(4));
      root.style.setProperty(
        "--hf",
        clamp01(1 - smoothedScroll / (viewport * 0.75)).toFixed(3),
      );
      root.style.setProperty("--px", smoothedPointerX.toFixed(3));
      root.style.setProperty("--py", smoothedPointerY.toFixed(3));
      root.style.setProperty("--mx", smoothedMouseX.toFixed(1));
      root.style.setProperty("--my", smoothedMouseY.toFixed(1));

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

    const onScroll = () => kick();
    const onResize = () => kick();
    const onPointerMove = (event) => {
      targetPointerX = event.clientX / window.innerWidth - 0.5;
      targetPointerY = event.clientY / window.innerHeight - 0.5;
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
    };

    const start = () => {
      stop();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
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
