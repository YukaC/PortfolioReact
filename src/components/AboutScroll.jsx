"use client";

import { useEffect } from "react";
import { SPECS } from "@/lib/scroll-range";
import { prefersReducedMotion } from "@/motion/prefersReducedMotion";
import { registerMotion } from "@/motion/register";
import { createScrollRange } from "@/motion/scrollProgress";

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/**
 * The About section's scroll work, as an island.
 *
 * One range is required and one is optional. The timeline rail draws itself by
 * setting `--tlp` and toggling `.is-on` on the items, and it is what the section
 * ships: the rail is the reason this island exists. The statement's word-by-word
 * light (`opacity`/`color` on `.sw`) is the older scrub, kept and guarded — the
 * section no longer carries a statement, and a missing target must cost the rail
 * nothing rather than throw or return before the rail is built. The markup
 * belongs to `About`, so this component renders nothing and finds its nodes by
 * class — the same nodes the CSS already styles, which is why nothing has to be
 * threaded through props or refs across the boundary.
 *
 * Both are `createScrollRange` now (`src/lib/scroll-range.js` holds the specs,
 * `src/motion/scrollProgress.js` the measurement), fed by the one scroll source
 * the page already runs: ScrollTrigger's second rAF loop and its 250 ms interval
 * bought nothing here, because a range is a resolved pair of document offsets
 * and a division.
 *
 * The rules it keeps, unchanged from when this lived inside `About`:
 *   • nothing runs under reduced motion — CSS leaves the rail settled and the
 *     dots lit, which is the state the no-script stylesheet promises;
 *   • a coarse pointer runs the scrub too. It was cut on a software-raster
 *     emulation (p95 50.1 against 33.4 ms); traced on the real phone (moto g82)
 *     it leaves the missing tiles of a flick within noise;
 *   • the item offsets and the viewport height are read on a re-measure, never
 *     inside the scroll handler;
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
    /* The rail resolves the same geometry on every scroll event. Measuring a rect
       inside the handler is a forced layout per event — the one cost a
       scroll-driven handler must never pay — so the offsets are cached in
       document coordinates and re-measured only when the range module says the
       layout changed: mount, width change, load, a late font, the body's own
       observer. */
    let itemTops = items.map((item) => item.getBoundingClientRect().top + window.scrollY);
    const measure = ({ viewportHeight: nextViewportHeight }) => {
      viewportHeight = nextViewportHeight;
      itemTops = items.map((item) => item.getBoundingClientRect().top + window.scrollY);
    };

    const lastOpacity = words.map(() => null);
    const lastColor = words.map(() => null);
    let lastRailProgress = null;

    const wordRange = statement
      ? createScrollRange({
          element: statement,
          start: SPECS.statement.start,
          end: SPECS.statement.end,
          onUpdate(progress) {
            const reached = progress * (words.length + 3);
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

    const railRange = createScrollRange({
      element: timeline,
      start: SPECS.rail.start,
      end: SPECS.rail.end,
      onMeasure: measure,
      onUpdate(progressValue) {
        const progress = progressValue.toFixed(3);
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
      wordRange?.destroy();
      railRange.destroy();
    };
  }, []);

  return null;
};

export default AboutScroll;
