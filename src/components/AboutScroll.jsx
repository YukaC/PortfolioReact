"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "@/motion/prefersReducedMotion";
import { registerMotion, ScrollTrigger } from "@/motion/register";

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/**
 * The About section's scroll work, as an island.
 *
 * Two scrubs, both of them writes: the statement lights word by word by setting
 * `opacity`/`color` on `.sw`, and the timeline rail draws itself by setting
 * `--tlp` and toggling `.is-on` on the items. The markup belongs to the server
 * (`About`), so this component renders nothing and finds its two nodes by class
 * — the same nodes the CSS already styles, which is why nothing has to be
 * threaded through props or refs across the boundary.
 *
 * The rules it keeps, unchanged from when this lived inside `About`:
 *   • nothing runs under reduced motion — CSS leaves the statement lit and the
 *     rail settled, which is the state the no-script stylesheet promises;
 *   • the viewport height is read once per resize, not once per scrub frame;
 *   • a frame that changes nothing writes nothing, so a still page costs no
 *     style invalidation.
 */
const AboutScroll = () => {
  useEffect(() => {
    const statement = document.querySelector(".statement");
    const timeline = document.querySelector(".timeline");
    if (!statement || !timeline) return undefined;
    if (prefersReducedMotion()) return undefined;

    registerMotion();

    const words = [...statement.querySelectorAll(".sw")];
    const items = [...timeline.querySelectorAll(".timeline-item")];

    let viewportHeight = window.innerHeight;
    const measureViewport = () => {
      viewportHeight = window.innerHeight;
    };
    window.addEventListener("resize", measureViewport);

    const lastOpacity = words.map(() => null);
    const lastColor = words.map(() => null);
    let lastRailProgress = null;

    const wordTrigger = ScrollTrigger.create({
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
    });

    const railTrigger = ScrollTrigger.create({
      trigger: timeline,
      start: "top 72%",
      end: "bottom 60%",
      scrub: true,
      onRefresh: measureViewport,
      onUpdate(self) {
        const progress = self.progress.toFixed(3);
        if (progress !== lastRailProgress) {
          lastRailProgress = progress;
          timeline.style.setProperty("--tlp", progress);
        }
        const line = viewportHeight * 0.72;
        items.forEach((item) => {
          const isOn = item.getBoundingClientRect().top < line;
          if (item.classList.contains("is-on") !== isOn) {
            item.classList.toggle("is-on", isOn);
          }
        });
      },
    });

    return () => {
      window.removeEventListener("resize", measureViewport);
      wordTrigger.kill();
      railTrigger.kill();
    };
  }, []);

  return null;
};

export default AboutScroll;
