import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/motion/prefersReducedMotion";

const ROWS = [
  {
    words: ["React", "Next.js", "Tailwind", "Python", "PostgreSQL", "Flask", "Node"],
    dir: -1,
    variant: "mq-outline",
  },
  {
    words: ["Interfaces", "Dashboards", "PWAs", "Full-stack", "Accessible", "Responsive"],
    dir: 1,
    variant: "mq-serif",
  },
];

const BASE_SPEED = 48;
const SPEED_FROM_SCROLL = 0.5;
const MAX_SKEW = 8;

/**
 * Technology band.
 *
 * Two tracks travelling in opposite directions whose speed follows the scroll
 * velocity, with the whole band skewing as it accelerates. Decorative: it is
 * hidden from assistive tech and stops under reduced motion (the tracks stay
 * laid out, just still).
 */
const Marquee = () => {
  const rootRef = useRef(null);
  const innerRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const inner = innerRef.current;
    if (!root || !inner) return undefined;

    const rows = [...inner.querySelectorAll("[data-mq]")].map((el) => ({
      el,
      dir: Number(el.dataset.dir),
      x: 0,
      width: 0,
    }));

    const measure = () => {
      rows.forEach((row) => {
        const width = row.el.firstElementChild?.offsetWidth ?? 0;
        if (row.dir > 0 && (!row.width || row.x === 0)) row.x = -width;
        row.width = width;
        row.el.style.transform = `translate3d(${row.x}px,0,0)`;
      });
    };

    measure();
    window.addEventListener("resize", measure);
    if (document.fonts?.ready) document.fonts.ready.then(measure);

    if (prefersReducedMotion()) {
      return () => window.removeEventListener("resize", measure);
    }

    let frame = 0;
    let running = false;
    let lastTime = 0;
    let lastScroll = window.scrollY;
    let velocity = 0;

    const loop = (time) => {
      const delta = lastTime ? Math.min(64, time - lastTime) : 16;
      lastTime = time;

      const scrollY = window.scrollY;
      velocity +=
        (((scrollY - lastScroll) / Math.max(1, delta)) * 1000 - velocity) * 0.09;
      lastScroll = scrollY;

      rows.forEach((row) => {
        row.x += (row.dir * (BASE_SPEED + velocity * SPEED_FROM_SCROLL) * delta) / 1000;
        if (row.width) {
          while (row.x <= -row.width) row.x += row.width;
          while (row.x > 0) row.x -= row.width;
        }
        row.el.style.transform = `translate3d(${row.x.toFixed(1)}px,0,0)`;
      });

      const skew = Math.min(MAX_SKEW, Math.max(-MAX_SKEW, velocity * -0.008));
      inner.style.transform = `skewX(${skew.toFixed(2)}deg)`;

      frame = running ? requestAnimationFrame(loop) : 0;
    };

    const observer = new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      if (running && !frame) {
        lastTime = 0;
        lastScroll = window.scrollY;
        frame = requestAnimationFrame(loop);
      }
    });
    observer.observe(root);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div className="marquee" ref={rootRef} aria-hidden="true">
      <div className="marquee-inner" ref={innerRef}>
        {ROWS.map((row) => (
          <div
            key={row.variant}
            className={`mq ${row.variant}`}
            data-mq=""
            data-dir={row.dir}
          >
            {[0, 1].map((copy) => (
              <div className="mq-track" key={copy}>
                {row.words.map((word) => (
                  <span key={word}>{word}</span>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Marquee;
