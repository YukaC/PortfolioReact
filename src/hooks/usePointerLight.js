import { useEffect } from "react";
import { hasFinePointer } from "@/motion/prefersReducedMotion";

/**
 * Pointer light for `.btn`: one passive listener for the whole page instead of
 * a handler per button. Writes `--bx`/`--by` (px inside the button) that the
 * button's radial highlight and masked ring read.
 */
export function usePointerLight() {
  useEffect(() => {
    if (!hasFinePointer()) return undefined;

    const onPointerMove = (event) => {
      const button = event.target.closest?.(".btn");
      if (!button) return;
      const bounds = button.getBoundingClientRect();
      button.style.setProperty("--bx", `${event.clientX - bounds.left}px`);
      button.style.setProperty("--by", `${event.clientY - bounds.top}px`);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);
}
