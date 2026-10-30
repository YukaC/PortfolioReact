import Lenis from "lenis";
import { DURATION } from "./config";
import { prefersReducedMotion, subscribeReducedMotion } from "./prefersReducedMotion";
import { gsap, registerMotion, ScrollTrigger } from "./register";

let lenisInstance = null;
let tickerCallback = null;

export function getLenis() {
  return lenisInstance;
}

export function startSmoothScroll() {
  if (typeof window === "undefined") return () => {};

  registerMotion();

  const teardown = () => {
    stopSmoothScroll();
  };

  const syncPreference = (isReduced) => {
    if (isReduced) {
      stopSmoothScroll();
      document.documentElement.style.scrollBehavior = "auto";
      return;
    }
    mountLenis();
  };

  syncPreference(prefersReducedMotion());
  const unsubscribe = subscribeReducedMotion(syncPreference);

  const onResize = () => ScrollTrigger.refresh();
  window.addEventListener("resize", onResize);

  return () => {
    unsubscribe();
    window.removeEventListener("resize", onResize);
    teardown();
  };
}

function mountLenis() {
  if (lenisInstance) return;

  document.documentElement.style.scrollBehavior = "auto";

  const lenis = new Lenis({
    autoRaf: false,
    lerp: 0.07,
    duration: DURATION.narrative,
  });

  lenis.on("scroll", ScrollTrigger.update);

  tickerCallback = (time) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(tickerCallback);
  gsap.ticker.lagSmoothing(0);

  lenisInstance = lenis;
}

function stopSmoothScroll() {
  if (tickerCallback) {
    gsap.ticker.remove(tickerCallback);
    tickerCallback = null;
  }
  gsap.ticker.lagSmoothing(500, 33);

  if (lenisInstance) {
    lenisInstance.destroy();
    lenisInstance = null;
  }

  ScrollTrigger.refresh();
}

export function lockSmoothScroll() {
  lenisInstance?.stop();
}

export function unlockSmoothScroll() {
  lenisInstance?.start();
}
