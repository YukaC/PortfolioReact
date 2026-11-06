"use client";

import { useEffect } from "react";
import {
  prefersReducedMotion,
  subscribeReducedMotion,
} from "@/motion/prefersReducedMotion";

const BASE_SPEED = 48;
const SPEED_FROM_SCROLL = 0.5;
const MAX_SKEW = 8;
/**
 * The band lies down when the page accelerates: 8° on a desktop, where the text is
 * large and the gesture is watched. On a phone the same 8° lands on much narrower
 * type at DPR 3 and reads as the words squashing, not as speed, so the tilt is
 * capped at a third of it — the band still leans into a flick, it just stays
 * readable. The numbers are the owner's phone report of 6 nov 2026.
 */
const MAX_SKEW_COARSE = 2.5;

/** Asked once: `matchMedia` inside the loop is a query per frame for a value that
    only changes when the OS flips the pointer. */
let coarseCache = null;
const coarsePointer = () => {
  if (coarseCache === null) {
    try {
      coarseCache = window.matchMedia("(pointer: coarse)").matches;
    } catch {
      coarseCache = false;
    }
  }
  return coarseCache;
};


/**
 * The technology band's movement, as an island.
 *
 * The two tracks are server-rendered by `Marquee`; this component renders
 * nothing and drives them: one rAF loop that only runs while the band is on
 * screen, translating each track by a distance derived from the scroll velocity
 * and skewing the pair when it accelerates.
 *
 * It reads the same instructions the CSS already put in the markup (`data-dir`
 * per row, the `.marquee-inner` wrapper), so the boundary costs no props. Under
 * reduced motion it never starts, and the tracks stay where the stylesheet
 * placed them — the same still band a scriptless reader sees.
 */
const MarqueeMotion = () => {
  useEffect(() => {
    const root = document.querySelector(".marquee");
    const inner = root?.querySelector(".marquee-inner");
    if (!root || !inner) return undefined;

    const rows = [...inner.querySelectorAll("[data-mq]")].map((el) => ({
      el,
      dir: Number(el.dataset.dir),
      x: 0,
      width: 0,
    }));

    const measure = () => {
      rows.forEach((row) => {
        const width = row.el.firstElementChild?.offsetWidth ?? 0;
        if (row.dir > 0 && (!row.width || row.x === 0)) row.x = -width;
        row.width = width;
        row.el.style.transform = `translate3d(${row.x}px,0,0)`;
      });
    };

    measure();
    window.addEventListener("resize", measure);
    if (document.fonts?.ready) document.fonts.ready.then(measure);

    let frame = 0;
    let running = false;
    let lastTime = 0;
    let lastScroll = window.scrollY;
    let velocity = 0;

    const loop = (time) => {
      const delta = lastTime ? Math.min(64, time - lastTime) : 16;
      lastTime = time;

      const scrollY = window.scrollY;
      velocity +=
        (((scrollY - lastScroll) / Math.max(1, delta)) * 1000 - velocity) * 0.09;
      lastScroll = scrollY;

      rows.forEach((row) => {
        row.x += (row.dir * (BASE_SPEED + velocity * SPEED_FROM_SCROLL) * delta) / 1000;
        if (row.width) {
          while (row.x <= -row.width) row.x += row.width;
          while (row.x > 0) row.x -= row.width;
        }
        row.el.style.transform = `translate3d(${row.x.toFixed(1)}px,0,0)`;
      });

      const ceiling = coarsePointer() ? MAX_SKEW_COARSE : MAX_SKEW;
      const skew = Math.min(ceiling, Math.max(-ceiling, velocity * -0.008));
      inner.style.transform = `skewX(${skew.toFixed(2)}deg)`;

      frame = running ? requestAnimationFrame(loop) : 0;
    };

    const observer = new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      if (running && !frame) {
        lastTime = 0;
        lastScroll = window.scrollY;
        frame = requestAnimationFrame(loop);
      }
    });

    const start = () => {
      // A track that restarts must not inherit the scroll velocity it measured
      // before the OS switch asked it to stop.
      velocity = 0;
      lastScroll = window.scrollY;
      observer.observe(root);
    };

    const stop = () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      frame = 0;
      running = false;
      inner.style.transform = "";
    };

    // The reader can flip the OS switch mid-session, so the band follows the
    // media query instead of reading it once at mount: it stops where it is and
    // picks the scroll velocity up again when the switch flips back.
    const sync = (isReduced) => {
      if (isReduced) {
        stop();
        return;
      }
      start();
    };

    sync(prefersReducedMotion());
    const unsubscribe = subscribeReducedMotion(sync);

    return () => {
      unsubscribe();
      stop();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return null;
};

export default MarqueeMotion;
