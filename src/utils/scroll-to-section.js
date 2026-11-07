import { prefersReducedMotion } from "@/motion/prefersReducedMotion";
import { getLenis } from "@/motion/smoothScroll";

/** The floating pill's height plus its margin: a section scrolled to at its own top
    lands its heading under the pill. Same offset on both scroll paths. */
const HEADER_OFFSET_PX = 104;

/**
 * Smooth-scroll to a section and briefly flash its main heading.
 * Used by Navbar + Hero CTAs.
 */
export function scrollToSectionByHash(href) {
  if (typeof href !== "string" || !href.startsWith("#")) return false;

  const sectionId = href.slice(1);
  const section = document.getElementById(sectionId);
  if (!section) return false;

  const isReduced = prefersReducedMotion();
  const lenis = getLenis();

  if (lenis && !isReduced) {
    lenis.scrollTo(section, { offset: -HEADER_OFFSET_PX });
  } else {
    /* There is no layer on a coarse pointer, so the offset has to be applied here:
       `scrollIntoView` puts the heading at the top of the viewport, under the pill.
       `behavior` is the file's own reduced-motion decision, not the CSS property —
       `html` declares `scroll-behavior: auto` and an explicit option wins over it. */
    const top = Math.max(
      0,
      section.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET_PX,
    );
    window.scrollTo({ top, behavior: isReduced ? "auto" : "smooth" });
  }

  const heading = section.querySelector("h1, h2");
  if (!heading) return true;

  heading.classList.remove("section-flash");
  void heading.offsetWidth;
  heading.classList.add("section-flash");

  const clearFlash = () => heading.classList.remove("section-flash");
  heading.addEventListener("animationend", clearFlash, { once: true });

  return true;
}
