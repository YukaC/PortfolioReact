import { createSpringEase } from "./createSpringEase";

/**
 * Single source of motion feel for the public site (not Bebop).
 * Tune springs / durations / staggers here.
 *
 * zeta ≈ damping / (2√(stiffness·mass))
 *   soft   ~ 1.12  overdamped, long settle, no bounce
 *   medium ~ 0.88  firm, barely perceptible overshoot
 *   lively ~ 0.74  small rebound on release — never jelly
 */
export const SPRING = {
  soft: { stiffness: 80, damping: 20, mass: 1 },
  medium: { stiffness: 220, damping: 26, mass: 1 },
  lively: { stiffness: 340, damping: 28, mass: 1 },
};

export const SPRING_EASE_PATH = {
  soft: createSpringEase(SPRING.soft),
  medium: createSpringEase(SPRING.medium),
  lively: createSpringEase(SPRING.lively),
};

/** Named CustomEase ids (registered in register.js). */
export const EASE = {
  soft: "springSoft",
  medium: "springMedium",
  lively: "springLively",
  drawer: "drawerEase",
  reduced: "power1.out",
};

/** Seconds. UI under 300ms; intro/reveal settle without blocking scan. */
export const DURATION = {
  uiFast: 0.18,
  ui: 0.26,
  uiSlow: 0.34,
  narrative: 0.55,
  intro: 0.62,
  reduced: 0.14,
  logoStroke: 0.7,
  mist: 28,
};

/** Seconds between sibling beats (30–80ms). */
export const STAGGER = {
  phrase: 0.04,
  phraseSlow: 0.06,
  min: 0.03,
  max: 0.08,
};

export const ENTER = {
  y: 10,
  scale: 0.97,
};

/** Vaul-like drawer curve — fallback when a full spring is overkill. */
export const DRAWER_BEZIER = "M0,0 C0.32,0.72 0,1 1,1";

export const MOTION_MEDIA = {
  reduced: "(prefers-reduced-motion: reduce)",
  finePointer: "(pointer: fine)",
};
