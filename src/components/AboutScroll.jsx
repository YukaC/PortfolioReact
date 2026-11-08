"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "@/motion/prefersReducedMotion";
import { registerMotion, ScrollTrigger } from "@/motion/register";

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/**
 * The About section's scroll work, as an island.
 *
 * One scrub is required and one is optional. The timeline rail draws itself by
 * setting `--tlp` and toggling `.is-on` on the items, and it is what the section
 * ships: the rail is the reason this island exists. The statement's word-by-word
 * light (`opacity`/`color` on `.sw`) is the older scrub, kept and guarded — the
 * section no longer carries a statement, and a missing target must cost the rail
 * nothing rather than throw or return before the rail is built. The markup
 * belongs to `About`, so this component renders nothing and finds its nodes by
 * class — the same nodes the CSS already styles, which is why nothing has to be
 * threaded through props or refs across the boundary.
 *
 * The rules it keeps, unchanged from when this lived inside `About`:
 *   • nothing runs under reduced motion — CSS leaves the rail settled and the
 *     dots lit, which is the state the no-script stylesheet promises;
 *   • a coarse pointer runs the scrub too. It was cut on a software-raster
 *     emulation (p95 50.1 against 33.4 ms); traced on the real phone (moto g82,
 *     testinG82.md) it leaves the missing tiles of a flick within noise;
 *   • the viewport height is read once per resize, not once per scrub frame;
 *   • a frame that changes nothing writes nothing, so a still page costs no
 *     style invalidation.
 */
const AboutScroll = () => {
  useEffect(() => {
    const timeline = document.querySelector(".timeline");
    if (!timeline) return undefined;
    if (prefersReducedMotion()) return undefined;

    registerMotion();

    const statement = document.querySelector(".statement");
    const words = statement ? [...statement.querySelectorAll(".sw")] : [];
    const items = [...timeline.querySelectorAll(".timeline-item")];

    let viewportHeight = window.innerHeight;
    /* The rail resolves the same geometry on every scrub frame. Measuring a rect
       inside the callback is a forced layout per frame — the one cost a
       scroll-driven handler must never pay — so the offsets are cached in
       document coordinates and re-measured only when ScrollTrigger refreshes the
       page, which already happens on resize, on a late font and on load. */
    let itemTops = items.map((item) => item.getBoundingClientRect().top + window.scrollY);
    const measure = () => {
      viewportHeight = window.innerHeight;
      itemTops = items.map((item) => item.getBoundingClientRect().top + window.scrollY);
    };
    window.addEventListener("resize", measure);
    /* A webfont that lands after this measured reflows the timeline without a
       ScrollTrigger refresh, and a stale cache marks the wrong item: the review of
       6 nov 2026 flagged exactly that. `fonts.ready` is the one signal for it. */
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});

    const lastOpacity = words.map(() => null);
    const lastColor = words.map(() => null);
    let lastRailProgress = null;

    const wordTrigger = statement
      ? ScrollTrigger.create({
          trigger: statement,
          start: "top 82%",
          end: "bottom 48%",
          scrub: true,
          onUpdate(self) {
            const reached = self.progress * (words.length + 3);
            words.forEach((word, index) => {
              const fill = clamp01(reached - index);
              const opacity = (0.16 + 0.84 * fill).toFixed(3);
              if (lastOpacity[index] !== opacity) {
                lastOpacity[index] = opacity;
                word.style.opacity = opacity;
              }
              const color = fill > 0 && fill < 1 ? "var(--color-sky)" : "";
              if (lastColor[index] !== color) {
                lastColor[index] = color;
                word.style.color = color;
              }
            });
          },
        })
      : null;

    const railTrigger = ScrollTrigger.create({
      trigger: timeline,
      start: "top 72%",
      end: "bottom 60%",
      scrub: true,
      onRefresh: measure,
      onUpdate(self) {
        const progress = self.progress.toFixed(3);
        if (progress !== lastRailProgress) {
          lastRailProgress = progress;
          timeline.style.setProperty("--tlp", progress);
        }
        const line = window.scrollY + viewportHeight * 0.72;
        items.forEach((item, index) => {
          const isOn = itemTops[index] < line;
          if (item.classList.contains("is-on") !== isOn) {
            item.classList.toggle("is-on", isOn);
          }
        });
      },
    });

    return () => {
      window.removeEventListener("resize", measure);
      wordTrigger?.kill();
      railTrigger.kill();
    };
  }, []);

  return null;
};

export default AboutScroll;
