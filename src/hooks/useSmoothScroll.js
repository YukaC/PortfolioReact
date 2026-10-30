import { useEffect } from "react";
import { startSmoothScroll } from "@/motion/smoothScroll";

export function useSmoothScroll() {
  useEffect(() => startSmoothScroll(), []);
}
