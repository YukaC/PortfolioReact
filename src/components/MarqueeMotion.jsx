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
/* A layout that only changed height does not move this band; a filter or a late
   image does not either. The debounce is the same 200 ms the scroll layer uses. */
const MEASURE_DEBOUNCE_MS = 200;
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

    /* One write per row that actually changed, compared on the formatted string
       the same way `useFieldMotion.write` compares a channel. A transform write
       is not free even when it produces the same matrix: it re-records the
       element and recalcs its subtree, and this loop runs for as long as the
       band is on screen, scrolling or not. */
    const writeRow = (row) => {
      const text = `translate3d(${row.x.toFixed(1)}px,0,0)`;
      if (text === row.last) return;
      row.last = text;
      row.el.style.transform = text;
    };

    const rows = [...inner.querySelectorAll("[data-mq]")].map((el) => ({
      el,
      dir: Number(el.dataset.dir),
      x: 0,
      width: 0,
      last: "",
    }));

    const measure = () => {
      rows.forEach((row) => {
        const width = row.el.firstElementChild?.offsetWidth ?? 0;
        if (row.dir > 0 && (!row.width || row.x === 0)) row.x = -width;
        row.width = width;
        writeRow(row);
      });
    };

    /* A resize is not a layout change until it changes the WIDTH. Brave on Android
       reports one every frame while the URL bar collapses — that is, during a scroll —
       and each one re-measured two `width: max-content` tracks with `offsetWidth`, i.e.
       a forced layout of the widest thing on the page. The phone report of 8 nov puts
       this callback inside 8 of 49 long frames at ~31 ms each, with 460 ms of forced
       style/layout in a 22 s window. Same policy as `smoothScroll.js`: only a width
       change re-measures, and the burst is waited out first. */
    let measuredWidth = window.innerWidth;
    let measureTimer = 0;
    const scheduleMeasure = () => {
      if (window.innerWidth === measuredWidth) return;
      measuredWidth = window.innerWidth;
      clearTimeout(measureTimer);
      measureTimer = window.setTimeout(measure, MEASURE_DEBOUNCE_MS);
    };

    measure();
    window.addEventListener("resize", scheduleMeasure);
    if (document.fonts?.ready) document.fonts.ready.then(measure);

    let frame = 0;
    let running = false;
    let lastTime = 0;
    let lastScroll = window.scrollY;
    let velocity = 0;
    let lastSkew = "";

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
        writeRow(row);
      });

      // The skew is zero at rest, which is most of a slow scroll: the wrapper
      // keeps the write it already has instead of being told the same angle.
      const ceiling = coarsePointer() ? MAX_SKEW_COARSE : MAX_SKEW;
      const skew = `skewX(${Math.min(ceiling, Math.max(-ceiling, velocity * -0.008)).toFixed(2)}deg)`;
      if (skew !== lastSkew) {
        lastSkew = skew;
        inner.style.transform = skew;
      }

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
      // The wrapper is handed back to the stylesheet, so the cached angle has to
      // go with it: a restart at the same angle must write again.
      inner.style.transform = "";
      lastSkew = "";
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
      window.removeEventListener("resize", scheduleMeasure);
      clearTimeout(measureTimer);
    };
  }, []);

  return null;
};

export default MarqueeMotion;
