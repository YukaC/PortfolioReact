import { createSpringEase } from "./createSpringEase";

/**
 * Motion feel for the public site (not Bebop).
 *
 * The springs are the only values that live here. A spring is a sampled
 * curve — it has no `cubic-bezier()` spelling — so it cannot be a CSS token
 * (docs/audit.md §14.4). Everything else is the stylesheet's ramp: every duration
 * and the three curves are read **once, at module scope**, from the
 * `--duration-*` / `--ease-*` / `--stagger-*` tokens `src/styles/globals.css`
 * declares (§14.7 S2c, spec S8). "Make the motion faster" is therefore one
 * edit in one file, and the CSS transitions and the GSAP tweens move together
 * instead of drifting apart — they used to be two disjoint ramps (0.3–1.1 s
 * against 0.14–0.62 s, with no shared curve).
 *
 * The literal passed to each reader is the fallback, not a second source of
 * truth: there is no `document` while the server renders this module (it is
 * imported by client components that also run through SSR), and a page whose
 * stylesheet has not applied yet can answer with an empty string. Both cases
 * get the shipped default instead of `NaN`.
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

/** The ramp's own root element: the one `globals.css` declares it on. */
const readToken = (name) => {
  if (typeof document === "undefined") return "";
  const value = getComputedStyle(document.documentElement).getPropertyValue(name);
  return value.trim();
};

/** `0.5s` or `40ms` → seconds; the shipped literal when there is no answer. */
const seconds = (name, fallback) => {
  const raw = readToken(name);
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return fallback;
  return /ms$/.test(raw) ? value / 1000 : value;
};

/** A `cubic-bezier(a, b, c, d)` token as the CustomEase path GSAP wants. */
const bezierPath = (name, fallback) => {
  const match = /cubic-bezier\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*\)/.exec(
    readToken(name),
  );
  if (!match) return fallback;
  const [, x1, y1, x2, y2] = match;
  return `M0,0 C${x1},${y1} ${x2},${y2} 1,1`;
};

/** Named CustomEase ids (registered in register.js). */
export const EASE = {
  soft: "springSoft",
  medium: "springMedium",
  lively: "springLively",
  drawer: "drawerEase",
  reduced: "power1.out",
};

/** Seconds, straight off the ramp. UI under 300ms; intro settles without blocking scan. */
export const DURATION = {
  uiFast: seconds("--duration-ui-fast", 0.18),
  ui: seconds("--duration-ui", 0.26),
  uiSlow: seconds("--duration-ui-slow", 0.34),
  narrative: seconds("--duration-narrative", 0.55),
  reduced: seconds("--duration-instant", 0.14),
  logoStroke: seconds("--duration-drift", 0.7),
  mist: 28,
};

/** Seconds between sibling beats, from the same ramp. */
export const STAGGER = {
  phrase: seconds("--stagger-phrase", 0.04),
  min: seconds("--stagger-min", 0.03),
};

/** Vaul-like drawer curve, derived from the CSS token so the two agree. */
export const DRAWER_BEZIER = bezierPath("--ease-drawer", "M0,0 C0.32,0.72 0,1 1,1");

export const MOTION_MEDIA = {
  reduced: "(prefers-reduced-motion: reduce)",
  finePointer: "(pointer: fine)",
};
