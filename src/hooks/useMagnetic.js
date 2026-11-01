import { useEffect } from "react";
import { DURATION, EASE } from "@/motion/config";
import { hasFinePointer, prefersReducedMotion } from "@/motion/prefersReducedMotion";
import { gsap, registerMotion } from "@/motion/register";

const RELEASE_EASE = EASE.lively;
const FOLLOW_DURATION = DURATION.uiSlow;

/**
 * Pulls an element toward the pointer; on leave it springs back.
 * Fine pointer only. Interruptible via quickTo.
 *
 * The element's box is cached, not measured inside `pointermove`: a layout read
 * there lands between the rAF writes of every other layer, which is the layout
 * thrash the motion pass removed (audit.md §10 P2-4). The cache is dropped when
 * the box can have moved — a resize, the element's own box changing, a scroll —
 * and re-read on the next pointer event, so the behaviour is the same while the
 * reads happen once per movement instead of once per event.
 */
export function useMagnetic(ref, { strength = 0.28, radius } = {}) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    if (prefersReducedMotion() || !hasFinePointer()) return undefined;

    registerMotion();
    gsap.set(element, { x: 0, y: 0 });

    const xTo = gsap.quickTo(element, "x", {
      duration: FOLLOW_DURATION,
      ease: EASE.medium,
      overwrite: "auto",
    });
    const yTo = gsap.quickTo(element, "y", {
      duration: FOLLOW_DURATION,
      ease: EASE.medium,
      overwrite: "auto",
    });

    let bounds = null;
    const invalidate = () => {
      bounds = null;
    };

    const reset = () => {
      xTo(0, DURATION.ui, RELEASE_EASE);
      yTo(0, DURATION.ui, RELEASE_EASE);
    };

    const onPointerMove = (event) => {
      if (!bounds) bounds = element.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      const maxOffset = radius ?? Math.max(bounds.width, bounds.height) * 0.45;
      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance > maxOffset * 2.2) {
        reset();
        return;
      }
      xTo(deltaX * strength);
      yTo(deltaY * strength);
    };

    const onPointerLeave = () => reset();

    const layoutObserver =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(invalidate)
        : null;
    layoutObserver?.observe(element);

    element.addEventListener("pointerenter", invalidate);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerleave", onPointerLeave);
    // A scroll moves the box under the pointer without touching its size.
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate);

    return () => {
      layoutObserver?.disconnect();
      element.removeEventListener("pointerenter", invalidate);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
      gsap.killTweensOf(element);
      gsap.set(element, { x: 0, y: 0 });
    };
  }, [ref, strength, radius]);
}
