import { useEffect } from "react";

/**
 * One observer for the whole page: every `[data-r]` node reveals itself the
 * first time it enters the viewport.
 *
 * This is the reference's model — a single pass over the document instead of a
 * component per reveal — so a section, a heading and a paragraph all share the
 * same trigger and the same CSS transition. Under reduced motion nothing is
 * observed: CSS leaves those nodes visible.
 */
export function useRevealOnEnter() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 },
    );

    const nodes = document.querySelectorAll("[data-r]");
    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);
}
