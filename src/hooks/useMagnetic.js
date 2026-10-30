import { useEffect } from "react";
import { DURATION, EASE } from "@/motion/config";
import { hasFinePointer, prefersReducedMotion } from "@/motion/prefersReducedMotion";
import { gsap, registerMotion } from "@/motion/register";

const RELEASE_EASE = EASE.lively;
const FOLLOW_DURATION = DURATION.uiSlow;

/**
 * Pulls an element toward the pointer; on leave it springs back.
 * Fine pointer only. Interruptible via quickTo.
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

    const reset = () => {
      xTo(0, DURATION.ui, RELEASE_EASE);
      yTo(0, DURATION.ui, RELEASE_EASE);
    };

    const onPointerMove = (event) => {
      const bounds = element.getBoundingClientRect();
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

    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerleave", onPointerLeave);

    return () => {
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerleave", onPointerLeave);
      gsap.killTweensOf(element);
      gsap.set(element, { x: 0, y: 0 });
    };
  }, [ref, strength, radius]);
}
