import { useEffect } from "react";
import {
  prefersReducedMotion,
  subscribeReducedMotion,
} from "@/motion/prefersReducedMotion";

/**
 * One observer for the whole page: every `[data-r]` node reveals itself the
 * first time it enters the viewport.
 *
 * The rules it has to keep (audit.md §10 P0-1, P1-3; S1/S4):
 *
 *   1. It only ever ADDS `.is-in`. Hidden states belong to the stylesheet and
 *      hang off `html.js`, so a node this effect never reaches must be visible,
 *      not blank — which is why the effect has no early return for a missing
 *      `IntersectionObserver`: without one it reveals everything at once
 *      instead of leaving the page hidden below the fold.
 *   2. It keeps looking. A filter change in `WorkList` remounts its rows, and
 *      the rows that replaced them were never observed by the single pass this
 *      used to do — they simply never revealed.
 *   3. Reduced motion is a *state*, not a load-time decision. The observer runs
 *      either way (under reduced motion `.is-in` is a no-op: the stylesheet has
 *      already shown everything), and turning the preference on mid-session
 *      reveals the whole document once, so flipping it back off can never strand
 *      a node the observer skipped. This is the same subscribe-and-react the
 *      field, the background and the marquee do.
 *
 * `data-r="paint"` is not observed: it carries a CSS keyframe entrance of its
 * own, and adding `.is-in` would only compete with it. The class it never gets
 * is also the one the reveal contract (`src/lib/css-contract.test.js`) reads, so
 * the two agree on which nodes the script may hide.
 */
const REVEAL_SELECTOR = '[data-r]:not([data-r="paint"])';

/** Asked once per reveal pass: `matchMedia` is a query, and the answer only
    changes when the OS flips the pointer. */
const coarsePointer = () => {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
};

export function useRevealOnEnter() {
  useEffect(() => {
    const body = document.body;

    /** Every reveal in the document right now, revealed and unobserved. */
    const revealAll = (observer) => {
      for (const node of body.querySelectorAll(REVEAL_SELECTOR)) {
        node.classList.add("is-in");
        observer?.unobserve(node);
      }
    };

    let observer = null;

    if (typeof IntersectionObserver === "function") {
      observer = new IntersectionObserver(
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
        //
        // A finger changes the arithmetic. A block that reveals *as it arrives* is
        // still rising from `opacity: 0` for the whole entrance, and a flick lands
        // the reader in a screenful of blocks that have only just been observed —
        // a phone report of 6 nov 2026 shows whole screens with no text and a work
        // preview floating without its row. On a coarse pointer the reveal starts
        // a third of a viewport early instead, so the entrance is over by the time
        // the block is under the thumb. Desktop keeps the late trigger, where the
        // entrance is watched rather than scrolled through — and a wheel or
        // trackpad fling, the case where it is scrolled through anyway, drops the
        // entrance through the `fling` class `smoothScroll.js` writes instead of
        // moving this trigger (globals.css §reveal).
        {
          threshold: 0,
          rootMargin: coarsePointer() ? "0px 0px 33% 0px" : "0px 0px -8% 0px",
        },
      );
    }

    const observe = (node) => {
      // Already revealed: adding it again would be a no-op, and observing it
      // again would cost a callback for nothing.
      if (node.classList.contains("is-in")) return;
      if (!observer) {
        node.classList.add("is-in");
        return;
      }
      observer.observe(node);
    };

    const scan = (node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.matches(REVEAL_SELECTOR)) observe(node);
      for (const child of node.querySelectorAll(REVEAL_SELECTOR)) observe(child);
    };

    scan(body);

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
    mutations?.observe(body, { childList: true, subtree: true });

    // Reduced motion can change while the page is open. When it does — in either
    // direction — everything is revealed once: the stylesheet shows those nodes
    // anyway, and this is what makes turning the preference back off unable to
    // leave a node hidden with nobody left to release it.
    const unsubscribe = subscribeReducedMotion(() => revealAll(observer));
    if (prefersReducedMotion()) revealAll(observer);

    return () => {
      unsubscribe();
      mutations?.disconnect();
      observer?.disconnect();
    };
  }, []);
}
