import { useEffect, useRef } from "react";
import { DURATION, EASE } from "@/motion/config";
import {
  hasFinePointer,
  prefersReducedMotion,
  subscribeReducedMotion,
} from "@/motion/prefersReducedMotion";
import { gsap, registerMotion } from "@/motion/register";

const CustomCursor = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return undefined;

    const html = document.documentElement;
    let isEnabled = false;
    let xToDot;
    let yToDot;
    let xToRing;
    let yToRing;

    const disable = () => {
      isEnabled = false;
      html.classList.remove("has-custom-cursor");
      gsap.set([dot, ring], { autoAlpha: 0 });
    };

    const enable = () => {
      if (!hasFinePointer() || prefersReducedMotion()) {
        disable();
        return;
      }

      registerMotion();
      isEnabled = true;
      html.classList.add("has-custom-cursor");
      gsap.set([dot, ring], { autoAlpha: 1, xPercent: -50, yPercent: -50 });

      xToDot = gsap.quickTo(dot, "x", {
        duration: DURATION.uiFast,
        ease: EASE.medium,
        overwrite: "auto",
      });
      yToDot = gsap.quickTo(dot, "y", {
        duration: DURATION.uiFast,
        ease: EASE.medium,
        overwrite: "auto",
      });
      xToRing = gsap.quickTo(ring, "x", {
        duration: DURATION.uiSlow,
        ease: EASE.soft,
        overwrite: "auto",
      });
      yToRing = gsap.quickTo(ring, "y", {
        duration: DURATION.uiSlow,
        ease: EASE.soft,
        overwrite: "auto",
      });
    };

    const onPointerMove = (event) => {
      if (!isEnabled) return;
      xToDot?.(event.clientX);
      yToDot?.(event.clientY);
      xToRing?.(event.clientX);
      yToRing?.(event.clientY);
    };

    enable();
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    const unsubscribe = subscribeReducedMotion(() => {
      enable();
    });

    return () => {
      unsubscribe();
      window.removeEventListener("pointermove", onPointerMove);
      disable();
    };
  }, []);

  return (
    <div className="custom-cursor" aria-hidden="true">
      <span ref={ringRef} className="custom-cursor-ring" />
      <span ref={dotRef} className="custom-cursor-dot" />
    </div>
  );
};

export default CustomCursor;
