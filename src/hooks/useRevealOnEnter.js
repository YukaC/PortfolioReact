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
          entry.target.classList.remove("is-pending");
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 },
    );

    // `data-r="paint"` already animated itself in CSS: observing it would only
    // re-add `is-in` after hydration and fight the running animation.
    const nodes = document.querySelectorAll('[data-r]:not([data-r="paint"])');

    nodes.forEach((node) => {
      // Anything the reader can already see is revealed as-is: hiding it here
      // would make this observer responsible for content that CSS had painted,
      // and a slow hydration would read as a page that empties itself.
      const rect = node.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) {
        node.classList.add("is-in");
        return;
      }

      // Off screen, the hidden state is free: the reader cannot see the flip, and
      // the entrance is ready for the moment the node scrolls in.
      node.classList.add("is-pending");
      observer.observe(node);
    });

    return () => observer.disconnect();
  }, []);
}
