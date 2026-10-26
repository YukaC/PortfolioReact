import { useEffect } from "react";
import { hasFinePointer } from "@/motion/prefersReducedMotion";

/**
 * Pointer light for `.btn`: one passive listener for the whole page instead of
 * a handler per button. Writes `--bx`/`--by` (px inside the button) that the
 * button's radial highlight and masked ring read.
 *
 * The highlight is a frame-rate effect, not an event-rate one: a pointer batch
 * can fire several times per frame, so the last position is kept and the rect
 * is read and the properties are written once, inside a single rAF.
 */
export function usePointerLight() {
  useEffect(() => {
    if (!hasFinePointer()) return undefined;

    let frame = 0;
    let pendingButton = null;
    let pendingX = 0;
    let pendingY = 0;

    const commit = () => {
      frame = 0;
      const button = pendingButton;
      if (!button) return;
      pendingButton = null;

      const bounds = button.getBoundingClientRect();
      button.style.setProperty("--bx", `${pendingX - bounds.left}px`);
      button.style.setProperty("--by", `${pendingY - bounds.top}px`);
    };

    const onPointerMove = (event) => {
      const button = event.target.closest?.(".btn");
      if (!button) return;
      pendingButton = button;
      pendingX = event.clientX;
      pendingY = event.clientY;
      if (!frame) frame = requestAnimationFrame(commit);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);
}
