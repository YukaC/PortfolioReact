"use client";

import { useEffect } from "react";
import {
  prefersReducedMotion,
  subscribeReducedMotion,
} from "@/motion/prefersReducedMotion";
import { getScrollPosition, subscribeScroll } from "@/motion/smoothScroll";
import { playbackRateFor, skewFor } from "@/lib/marquee-speed";

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

/** The two shipped constants as the shape the rate mapping reads, built once. */
const PLAYBACK = { baseSpeed: BASE_SPEED, speedFromScroll: SPEED_FROM_SCROLL };

/* The angle the wrapper is left carrying once the band has settled — the string a
   still page produces. `toFixed` keeps the sign of a negative zero, so a tilt that
   has rounded away can arrive as either spelling; both are the same angle, and the
   band has stopped leaning on either of them. */
const REST_SKEW = "skewX(0.00deg)";
const ZERO_SKEWS = new Set([REST_SKEW, "skewX(-0.00deg)"]);

/* Under this the band is no longer answering a gesture. px/s. */
const REST_VELOCITY = 1;

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
 * nothing and drives them. The drift itself is not script work any more: each
 * row carries one linear, infinite Web Animations effect on the element the hand
 * written loop used to translate, so it moves on the compositor at `BASE_SPEED`
 * for as long as it is on screen — with no frame of any kind on the main thread.
 *
 * What stays in script is what has to read the page: the scroll velocity, which
 * only changes how fast those effects play (`playbackRate`, never `currentTime`,
 * so a row never jumps), and the band's skew. Both run in one rAF loop that a
 * scroll starts and the band's own settling stops — a still page, at the top or
 * with the band in view, runs no rAF at all.
 *
 * It reads the same instructions the CSS already put in the markup (`data-dir`
 * per row, the `.marquee-inner` wrapper), so the boundary costs no props. Under
 * reduced motion it never animates, and the tracks stay where the stylesheet
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
      width: 0,
      duration: 0,
      animation: null,
    }));

    /* `mounted` is the band being animated at all (not under reduced motion);
       `visible` is the band being somewhere a reader can see it. Together they
       decide whether a scroll may start a frame and whether an effect plays. */
    let mounted = false;
    let visible = false;
    let frame = 0;
    let lastTime = 0;
    let lastScroll = 0;
    let velocity = 0;
    let lastSkew = "";
    let rate = 1;
    let unsubscribeScroll = null;

    /* One rule for both rows, written only when it changed: the compositor
       interpolates from a rate, it does not need to be told the same one 60
       times a second. */
    const applyRate = (next) => {
      if (next === rate) return;
      rate = next;
      rows.forEach((row) => {
        if (row.animation) row.animation.playbackRate = next;
      });
    };

    /* How far through its travel a row is, whatever its rate and however many
       loops it has played. A reversed row can hold a negative local time, so the
       fraction is folded back into [0, 1): a re-measure must not land a row a
       whole copy away from where the reader last saw it. */
    const phaseOf = (row) => {
      if (!row.animation || !row.duration) return 0;
      const time = row.animation.currentTime;
      if (typeof time !== "number" || !Number.isFinite(time)) return 0;
      const phase = (time / row.duration) % 1;
      return phase < 0 ? phase + 1 : phase;
    };

    /* The drift, as compositor work.
       Two identical copies of the track sit inside each row, so travelling one
       copy's width and starting over is the seamless loop the old arithmetic
       produced by wrapping `x`. `direction: "reverse"` is how the row that used
       to start at `-width` and step positive keeps moving the way it moves
       today, without a second keyframe list. */
    const drift = (row, phase) => {
      row.animation?.cancel();
      row.animation = null;
      if (!(row.width > 0)) return;
      row.duration = (row.width / BASE_SPEED) * 1000;
      const animation = row.el.animate(
        [
          { transform: "translate3d(0,0,0)" },
          { transform: `translate3d(-${row.width}px,0,0)` },
        ],
        {
          duration: row.duration,
          iterations: Infinity,
          easing: "linear",
          direction: row.dir > 0 ? "reverse" : "normal",
        },
      );
      animation.playbackRate = rate;
      if (phase) animation.currentTime = phase * row.duration;
      if (!visible) animation.pause();
      row.animation = animation;
    };

    const measure = () => {
      if (!mounted) return;
      rows.forEach((row) => {
        const phase = phaseOf(row);
        row.width = row.el.firstElementChild?.offsetWidth ?? 0;
        drift(row, phase);
      });
    };

    /* The quiet state, written once: rows back at their base speed and the
       wrapper carrying the angle a still page produces. */
    const settle = () => {
      applyRate(1);
      lastSkew = REST_SKEW;
      inner.style.transform = REST_SKEW;
      frame = 0;
    };

    const tick = (time) => {
      const delta = lastTime ? Math.min(64, time - lastTime) : 16;
      lastTime = time;

      /* The position comes from the scroll layer, not from the document: on a
         coarse pointer `window.scrollY` here would be a second read of a value
         one passive listener had already cached for this frame. */
      const scrollY = getScrollPosition();
      velocity +=
        (((scrollY - lastScroll) / Math.max(1, delta)) * 1000 - velocity) * 0.09;
      lastScroll = scrollY;

      // The drift belongs to the compositor; this frame only says how fast.
      applyRate(playbackRateFor(velocity, PLAYBACK));

      // The skew is zero at rest, which is most of a slow scroll: the wrapper
      // keeps the write it already has instead of being told the same angle.
      const skew = skewFor(velocity, coarsePointer() ? MAX_SKEW_COARSE : MAX_SKEW);
      if (skew !== lastSkew) {
        lastSkew = skew;
        inner.style.transform = skew;
      }

      /* Both halves of "nothing is happening": the band is slower than a gesture
         can read and it is not leaning. Then the loop leaves the resting state
         on screen and stops asking for frames. */
      if (Math.abs(velocity) < REST_VELOCITY && ZERO_SKEWS.has(skew)) {
        settle();
        return;
      }
      frame = visible ? requestAnimationFrame(tick) : 0;
    };

    /* Started by a scroll, not by the band being on screen: a page nobody
       touches has no frame to serve. */
    const wake = () => {
      if (!mounted || !visible || frame) return;
      /* The clock restarts, the position does not. A scroll event arrives after
         the offset already moved, so re-reading it here would hand the first
         frame a delta of zero and the band would never see the gesture it was
         woken for — a scrollbar jump or a `scrollTo` would then land with no
         lean at all, which the always-running loop did measure. From a settled
         loop `lastScroll` is still the position the reader left (or the one
         the band re-entered at, which the observer below re-reads), so the
         first frame measures exactly the distance that was travelled. */
      lastTime = 0;
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        /* Nobody can see the band: no drift to watch and no scroll reaction. Rate
           and lean go back to rest so the band cannot reappear playing fast or
           tilted by the gesture that carried it off screen. */
        cancelAnimationFrame(frame);
        settle();
        rows.forEach((row) => row.animation?.pause());
        return;
      }
      /* The band comes back from wherever the reader went while it was hidden.
         That travel happened off screen, so it is not a gesture the band should
         answer: the first frame measures from here, not from the offset it left
         at, or a jump back to it would play the rows dozens of times too fast. */
      lastScroll = getScrollPosition();
      velocity = 0;
      rows.forEach((row) => row.animation?.play());
    });

    const start = () => {
      if (mounted) return;
      mounted = true;
      // A band that restarts must not inherit the scroll velocity it measured
      // before the OS switch asked it to stop.
      velocity = 0;
      rate = 1;
      lastSkew = "";
      lastScroll = getScrollPosition();
      measure();
      observer.observe(root);
      unsubscribeScroll = subscribeScroll(wake);
    };

    const stop = () => {
      if (!mounted) return;
      mounted = false;
      unsubscribeScroll?.();
      unsubscribeScroll = null;
      observer.disconnect();
      cancelAnimationFrame(frame);
      frame = 0;
      visible = false;
      rows.forEach((row) => {
        row.animation?.cancel();
        row.animation = null;
        row.duration = 0;
      });
      // The wrapper is handed back to the stylesheet, so the cached angle has to
      // go with it: a restart at the same angle must write again.
      inner.style.transform = "";
      lastSkew = "";
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

    window.addEventListener("resize", scheduleMeasure);
    if (document.fonts?.ready) document.fonts.ready.then(measure);

    // The reader can flip the OS switch mid-session, so the band follows the
    // media query instead of reading it once at mount: it stops where it is and
    // picks the drift up again when the switch flips back.
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
