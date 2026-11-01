/**
 * One breakpoint vocabulary (audit.md §14.7 S2d, spec S9).
 *
 * The widths used to exist four times: Tailwind's defaults, three hand-written
 * media queries in `globals.css`, and a bare `innerWidth <= 900` plus two
 * `matchMedia()` calls in the islands. The stylesheet is now the source of
 * truth — `--breakpoint-nav` and `--breakpoint-wide` in `@theme` — and this
 * module is the only place a script asks for them, read **once at module
 * scope** exactly like `src/motion/config.js` reads the motion ramp.
 *
 * Two consequences worth stating, because they are the reason the tokens are
 * these two and not every width in the sheet:
 *
 *   • `rem` in a media query resolves against the *initial* font size, not the
 *     root element's, so a token written in `rem` is converted here with 16px
 *     and not with whatever `html` computes. That is what makes the JS number
 *     and the CSS media query agree.
 *   • the literal passed to each reader is the shipped default, not a second
 *     source of truth: there is no `document` while the server renders this
 *     module (a Server Component imports it too) and a document whose
 *     stylesheet has not applied yet answers with an empty string. Both get the
 *     value the token declares, which is what the server already painted.
 *
 * The parity between these numbers and the stylesheet is asserted in
 * `src/lib/css-contract.test.js`: every width a script asks about has to exist
 * as a CSS breakpoint, so the set of JS widths stays a subset of the CSS ones.
 */

/** Initial font size, which is what `rem` means inside a media query. */
const ROOT_FONT_PX = 16;

/** The `--breakpoint-*` declaration as the browser computed it, or "". */
const readToken = (name) => {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

/** `<n>rem` / `<n>px` → pixels; the shipped literal when there is no answer. */
const pixels = (name, fallback) => {
  const raw = readToken(name);
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return fallback;
  return /rem$/.test(raw) ? value * ROOT_FONT_PX : value;
};

/**
 * The two widths a script asks about, in CSS pixels.
 *
 * `nav` (768) is where the pill becomes the desktop navigation; `wide` (900) is
 * the line every touch layout — and the work list's floating preview — switches
 * at. Nothing else is exported: a width that no script reads does not belong
 * here (§14.1: a token enters with its consumer).
 */
export const BREAKPOINT = {
  nav: pixels("--breakpoint-nav", 768),
  wide: pixels("--breakpoint-wide", 900),
};

/**
 * The query strings, built from the same numbers. `max` is inclusive because
 * that is what the stylesheet's `max-wide` variant is (`max-width: 56.25rem`);
 * `min` matches Tailwind's generated `nav:`/`wide:` variants.
 */
export const mediaQuery = {
  max: (width) => `(max-width: ${width}px)`,
  min: (width) => `(min-width: ${width}px)`,
};

/** True while the viewport is at or below `width` — the `max-wide` condition. */
export const isAtMost = (width) =>
  typeof window !== "undefined" && window.innerWidth <= width;

/** True while the viewport is at or above `width` — the `wide:` condition. */
export const isAtLeast = (width) =>
  typeof window !== "undefined" && window.innerWidth >= width;
