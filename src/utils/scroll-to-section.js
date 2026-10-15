import { prefersReducedMotion } from "@/motion/prefersReducedMotion";
import { getLenis } from "@/motion/smoothScroll";

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
    lenis.scrollTo(section, { offset: -104 });
  } else {
    section.scrollIntoView({ behavior: isReduced ? "auto" : "smooth" });
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
