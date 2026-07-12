import { useEffect, useRef, useState } from "react";

/**
 * Observe an element once — becomes visible when it enters the viewport.
 * Reduced motion is handled in CSS (`.reveal` stays visible); no setState needed.
 */
export function useInView({
  threshold = 0.12,
  rootMargin = "0px 0px -8% 0px",
} = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { threshold, rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return [ref, isVisible];
}
