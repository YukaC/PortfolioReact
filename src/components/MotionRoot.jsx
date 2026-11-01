"use client";

import { LocaleProvider } from "@/i18n/LocaleProvider";
import { useFieldMotion } from "@/hooks/useFieldMotion";
import { usePointerLight } from "@/hooks/usePointerLight";
import { useRevealOnEnter } from "@/hooks/useRevealOnEnter";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";

/**
 * The motion island: the only reason the page needs a script at all.
 *
 * Four side effects that are pure browser, one component, one hydration:
 *
 *   • `useSmoothScroll` owns the scroll (Lenis + the single lerp);
 *   • `useFieldMotion` writes the motion channel (`--scy`, `--p`, `--hf`,
 *     `--px/--py`, `--mx/--my`) on the elements that read it;
 *   • `usePointerLight` lights whatever `.btn` the pointer is over;
 *   • `useRevealOnEnter` adds `.is-in` to `[data-r]` nodes as they enter.
 *
 * The reveal lives here and not in a component of its own because this island
 * already hydrates for the other three: a page-wide effect that costs nothing
 * extra is the only acceptable place for it, and it is the reason no section has
 * to be a Client Component just to be revealed (audit.md §16.2). The hidden state
 * it releases belongs to `globals.css` and to `html.js`, so a document without a
 * script, or a reader who asked for less motion, stays fully visible — pinned by
 * `src/lib/reveal-contract.test.js`.
 *
 * `children` is the server tree (the shell and the sections): a Client Component
 * can render Server Components it receives as children, and `LocaleProvider`
 * gives the islands inside them the same strings the server used, so the first
 * client render matches the HTML byte for byte.
 */
const MotionRoot = ({ locale = "en", children }) => {
  useSmoothScroll();
  useFieldMotion();
  usePointerLight();
  useRevealOnEnter();

  return <LocaleProvider locale={locale}>{children}</LocaleProvider>;
};

export default MotionRoot;
