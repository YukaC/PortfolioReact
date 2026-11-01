import { useEffect } from "react";
import { prefersReducedMotion } from "@/motion/prefersReducedMotion";

/**
 * One observer for the whole page: every `[data-r]` node reveals itself the
 * first time it enters the viewport.
 *
 * The rules it has to keep (audit.md §10 P0-1, P1-3; S1/S4):
 *
 *   1. It only ever ADDS `.is-in`. Hidden states belong to the stylesheet and
 *      hang off `html.js`, so a node the script never reaches is visible, not
 *      blank. Nothing here masks content that CSS already painted.
 *   2. It keeps looking. A filter change in `WorkList` remounts its rows, and
 *      the rows that replaced them were never observed by the single pass this
 *      used to do — they simply never revealed.
 *   3. Reduced motion skips observation entirely: CSS leaves those nodes
 *      visible and there is nothing to reveal.
 *
 * `data-r="paint"` is not observed: it carries a CSS keyframe entrance of its
 * own, and adding `.is-in` would only compete with it.
 */
const REVEAL_SELECTOR = '[data-r]:not([data-r="paint"])';

export function useRevealOnEnter() {
  useEffect(() => {
    if (typeof IntersectionObserver !== "function") return undefined;
    if (prefersReducedMotion()) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      // `threshold: 0` means "any part of it is on screen"; the margin keeps the
      // trigger from firing on the last 8% of the viewport, where a node would
      // be revealed already half past the fold.
      { threshold: 0, rootMargin: "0px 0px -8% 0px" },
    );

    const observe = (node) => {
      // Already revealed: adding it again would be a no-op, and observing it
      // again would cost a callback for nothing.
      if (node.classList.contains("is-in")) return;
      observer.observe(node);
    };

    const scan = (node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.matches(REVEAL_SELECTOR)) observe(node);
      for (const child of node.querySelectorAll(REVEAL_SELECTOR)) observe(child);
    };

    scan(document.body);

    // Late nodes (a filtered list, a section mounted after hydration) get the
    // same treatment as the ones that were in the first paint.
    const mutations =
      typeof MutationObserver === "function"
        ? new MutationObserver((records) => {
            for (const record of records) {
              for (const node of record.addedNodes) scan(node);
            }
          })
        : null;
    mutations?.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutations?.disconnect();
      observer.disconnect();
    };
  }, []);
}
