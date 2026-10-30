import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DRAWER_BEZIER, SPRING_EASE_PATH } from "./config";

let isRegistered = false;

/**
 * Idempotent client-only plugin + named spring registration.
 * Does not set gsap.defaults ease (Bebop owns its own timelines).
 */
export function registerMotion() {
  if (typeof window === "undefined" || isRegistered) return;

  gsap.registerPlugin(CustomEase, ScrollTrigger);
  CustomEase.create("springSoft", SPRING_EASE_PATH.soft);
  CustomEase.create("springMedium", SPRING_EASE_PATH.medium);
  CustomEase.create("springLively", SPRING_EASE_PATH.lively);
  CustomEase.create("drawerEase", DRAWER_BEZIER);
  isRegistered = true;
}

export { gsap, ScrollTrigger };
