import { MOTION_MEDIA } from "./config";

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOTION_MEDIA.reduced).matches;
}

export function hasFinePointer() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOTION_MEDIA.finePointer).matches;
}

export function subscribeReducedMotion(onChange) {
  if (typeof window === "undefined") return () => {};

  const media = window.matchMedia(MOTION_MEDIA.reduced);
  const handleChange = () => onChange(media.matches);
  media.addEventListener("change", handleChange);
  return () => media.removeEventListener("change", handleChange);
}
