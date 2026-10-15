import { useEffect, useRef } from "react";
import { DURATION, EASE, ENTER, STAGGER } from "@/motion/config";
import { prefersReducedMotion } from "@/motion/prefersReducedMotion";
import { gsap, registerMotion } from "@/motion/register";
import { willChangeVars } from "@/motion/willChange";

/**
 * Scroll reveal: near-present enter (scale 0.96 + short Y), soft spring.
 */
const Reveal = ({
  children,
  className = "",
  delayMs = 0,
  as: Tag = "div",
  staggerChildren = false,
  ...rest
}) => {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    registerMotion();

    if (prefersReducedMotion()) {
      gsap.set(element, { autoAlpha: 1, y: 0, scale: 1 });
      return undefined;
    }

    const targets = staggerChildren
      ? element.querySelectorAll("[data-reveal-child]")
      : element;
    const nodes = targets.length !== undefined && targets.length === 0 ? element : targets;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        nodes,
        { autoAlpha: 0, y: ENTER.y, scale: ENTER.scale },
        willChangeVars({
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: DURATION.narrative,
          delay: delayMs / 1000,
          ease: EASE.soft,
          overwrite: "auto",
          stagger: staggerChildren
            ? { each: STAGGER.phrase, ease: "power1.inOut" }
            : 0,
          scrollTrigger: {
            trigger: element,
            start: "top 88%",
            once: true,
          },
        }),
      );
    }, element);

    return () => ctx.revert();
  }, [delayMs, staggerChildren]);

  return (
    <Tag ref={ref} className={`reveal ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
};

export default Reveal;
