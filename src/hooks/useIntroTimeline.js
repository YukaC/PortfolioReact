import { useLayoutEffect } from "react";
import { DURATION, EASE, ENTER, STAGGER } from "@/motion/config";
import { prefersReducedMotion } from "@/motion/prefersReducedMotion";
import { gsap, registerMotion } from "@/motion/register";
import { willChangeVars } from "@/motion/willChange";

export function useIntroTimeline(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    registerMotion();
    const ctx = gsap.context(() => {
      const introNodes = root.querySelectorAll("[data-intro]");
      if (introNodes.length === 0) return;

      if (prefersReducedMotion()) {
        gsap.set(introNodes, { autoAlpha: 1, y: 0, scale: 1 });
        return;
      }

      gsap.set(introNodes, {
        autoAlpha: 0,
        y: ENTER.y,
        scale: ENTER.scale,
      });

      const timeline = gsap.timeline({ defaults: { overwrite: "auto" } });

      timeline.to(
        introNodes,
        willChangeVars({
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: DURATION.intro,
          ease: EASE.soft,
          stagger: {
            each: STAGGER.phrase,
            ease: "power1.inOut",
          },
        }),
        0,
      );
    }, root);

    return () => ctx.revert();
  }, [rootRef]);
}
