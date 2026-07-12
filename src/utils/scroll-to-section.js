/**
 * Smooth-scroll to a section and briefly flash its main heading.
 * Used by Navbar + Hero CTAs.
 */
export function scrollToSectionByHash(href) {
  if (typeof href !== "string" || !href.startsWith("#")) return false;

  const sectionId = href.slice(1);
  const section = document.getElementById(sectionId);
  if (!section) return false;

  section.scrollIntoView({ behavior: "smooth" });

  const heading = section.querySelector("h1, h2");
  if (!heading) return true;

  heading.classList.remove("section-flash");
  // Restart CSS animation if already applied.
  void heading.offsetWidth;
  heading.classList.add("section-flash");

  const clearFlash = () => heading.classList.remove("section-flash");
  heading.addEventListener("animationend", clearFlash, { once: true });

  return true;
}
