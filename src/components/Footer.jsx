"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import dynamic from "next/dynamic";
import { BUILD_YEAR, currentYear } from "@/lib/copyright-year";
import { SOCIAL_LINKS } from "@/data/constants";
import { useBebopAnimation } from "@/hooks/useBebopAnimation";
import { useT } from "@/i18n/LocaleProvider";
import {
  hasFinePointer,
  prefersReducedMotion,
} from "@/motion/prefersReducedMotion";
import { gsap, registerMotion, ScrollTrigger } from "@/motion/register";
import SiteLogo from "./SiteLogo";

const BebopAnimation = dynamic(() => import("./BebopAnimation"), {
  ssr: false,
});

const WORDMARK = "CIUCANI";
const clamp01 = (value) => Math.min(1, Math.max(0, value));

/**
 * The copyright year the prerendered HTML carries.
 *
 * Both answers live in `src/lib/copyright-year.js` (and are pinned in its test):
 * the server keeps answering with the year the served snapshot belongs to
 * (`generatedAt` in `src/data/pinned-projects.json`) and the client answer is
 * the current year, which lands as a post-hydration update instead of a
 * hydration mismatch on 1 January. See that module for the why.
 */
const buildYear = () => BUILD_YEAR;

/**
 * "Is a script actually running?" — the honest answer for a control only a
 * script can back. The server cannot know, so it answers `false` and the client
 * flips to `true` after hydration; `useSyncExternalStore` is React's own way to
 * read a value the server cannot compute, without a state write in an effect.
 */
const subscribeToNothing = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * Footer - the last frame, and the wordmark that closes it.
 *
 * Three columns on the reference's grid, then the surname at scale: each letter
 * lifts and brightens as the pointer passes over the footer, and the whole mark
 * rises into place with the scroll. The Bebop trigger keeps the tagline's old
 * seat, so the easter egg never moved.
 */
const Footer = () => {
  const { t } = useT();
  const footerRef = useRef(null);
  const markRef = useRef(null);
  // The wordmark's serif is a 45 KB italic; it is only worth a request when the
  // footer is about to be seen. The stylesheet starts on the system serif and
  // `is-serif` switches the family, which is what makes the browser fetch it.
  const [serif, setSerif] = useState(false);
  // The year the reader sees: the client's own, once hydration is done.
  const year = useSyncExternalStore(
    subscribeToNothing,
    currentYear,
    buildYear,
  );
  // Bebop is a script. The tagline is a button only in a document that can run
  // one; server-rendered and scriptless it stays the sentence it looks like, so
  // it is not a focusable control that cannot answer (audit.md §10 P1-7).
  const isInteractive = useSyncExternalStore(
    subscribeToNothing,
    onClient,
    onServer,
  );
  const {
    phase,
    isActive,
    dismissAnimation,
    handleTriggerEnter,
    handleTriggerLeave,
    handleTriggerPointerDown,
    handleTriggerPointerUp,
    handleShipReady,
    handleShipFailed,
    triggerElRef,
  } = useBebopAnimation();

  const setTriggerRef = useCallback(
    (node) => {
      triggerElRef.current = node;
    },
    [triggerElRef],
  );

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer || serif) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setSerif(true);
        observer.disconnect();
      },
      { rootMargin: "150% 0px" },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, [serif]);

  useEffect(() => {
    const footer = footerRef.current;
    const mark = markRef.current;
    if (!footer || !mark) return undefined;
    if (prefersReducedMotion()) return undefined;

    registerMotion();

    /* `--fp` drives `opacity` and `translate` on the 70 px `background-clip:
       text` wordmark, so every write is a recalc of the footer subtree and a
       repaint of that text. A scrub reports its progress on every frame of a
       scroll whether the value moved or not, and three decimals of a five-
       hundred-pixel travel means most frames repeat the previous value. The
       comparison is the same one `AboutScroll` makes for `--tlp`: write only
       the change, at the precision the CSS was tuned for. */
    let lastProgress = null;
    const rise = ScrollTrigger.create({
      trigger: footer,
      start: "top 85%",
      end: "bottom bottom",
      scrub: true,
      onUpdate(self) {
        const progress = self.progress.toFixed(3);
        if (progress === lastProgress) return;
        lastProgress = progress;
        footer.style.setProperty("--fp", progress);
      },
    });

    /* The rise runs on every pointer (traced neutral on the phone, testinG82.md);
       the letter wave below follows a cursor, so a coarse pointer stops here. */
    if (!hasFinePointer()) return () => rise.kill();

    const letters = [...mark.children];
    // `scale` is a CSSPlugin alias that expands into scaleX/scaleY, so a quickTo()
    // on it has no PropTween of its own to reset and never animates. Split the
    // axes: same duration and ease on both, so the glyph stays undistorted.
    const tweens = letters.map((letter) => ({
      y: gsap.quickTo(letter, "y", { duration: 0.5, ease: "power3.out" }),
      scaleX: gsap.quickTo(letter, "scaleX", { duration: 0.5, ease: "power3.out" }),
      scaleY: gsap.quickTo(letter, "scaleY", { duration: 0.5, ease: "power3.out" }),
    }));

    let isVisible = false;
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    // The letter geometry is layout-only (`offsetLeft/Top/Width/Height` ignore
    // the transforms the wave itself writes), so it is measured once and then
    // animated from the cache. Only the mark's own origin moves with scrolling,
    // and a scroll event just flags it dirty: the single re-read happens inside
    // the next pointer frame, never in the scroll handler.
    let centers = [];
    let originX = 0;
    let originY = 0;
    let originDirty = true;

    const measureOrigin = () => {
      const bounds = mark.getBoundingClientRect();
      originX = bounds.left;
      originY = bounds.top;
      originDirty = false;
    };

    const measureLetters = () => {
      centers = letters.map((letter) => ({
        x: letter.offsetLeft + letter.offsetWidth / 2,
        y: letter.offsetTop + letter.offsetHeight / 2,
      }));
      measureOrigin();
    };

    measureLetters();

    const wave = () => {
      frame = 0;
      if (!isVisible) return;
      if (originDirty) measureOrigin();
      for (let i = 0; i < centers.length; i += 1) {
        const centerX = originX + centers[i].x;
        const centerY = originY + centers[i].y;
        const force = clamp01(
          1 - Math.hypot((pointerX - centerX) * 0.7, (pointerY - centerY) * 1.1) / 300,
        );
        const scale = 1 + force * 0.1;
        letters[i].style.setProperty("--b", force.toFixed(3));
        tweens[i].y(-force * 34);
        tweens[i].scaleX(scale);
        tweens[i].scaleY(scale);
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      // The mark may have moved while it was off screen.
      if (isVisible) originDirty = true;
    });
    observer.observe(footer);

    const onScroll = () => {
      originDirty = true;
    };
    const onResize = () => measureLetters();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    if (document.fonts?.ready) document.fonts.ready.then(onResize);
    // The serif arrives long after the first measurement (it is fetched when the
    // footer gets close), and every letter centre depends on its metrics.
    document.fonts?.addEventListener("loadingdone", onResize);

    const onPointerMove = (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (isVisible && !frame) frame = requestAnimationFrame(wave);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.fonts?.removeEventListener("loadingdone", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(frame);
      rise.kill();
    };
  }, []);

  return (
    <footer className="site-footer" ref={footerRef}>
      {isActive ? (
        <BebopAnimation
          phase={phase}
          onDismiss={dismissAnimation}
          onShipReady={handleShipReady}
          onShipFailed={handleShipFailed}
          restoreFocusRef={triggerElRef}
        />
      ) : null}

      <div className="site-shell">
        <div className="footer-row">
          <div>
            <SiteLogo className="h-8 w-auto opacity-80" />
            <p
              ref={setTriggerRef}
              tabIndex={isInteractive ? 0 : undefined}
              role={isInteractive ? "button" : undefined}
              className={`tagline max-w-fit${isInteractive ? " focus-ring cursor-help select-none touch-none" : ""}`}
              title={isInteractive ? t("footer.triggerTitle") : undefined}
              aria-label={
                isInteractive
                  ? `${t("footer.tagline")} — ${t("footer.triggerAria")}`
                  : undefined
              }
              onMouseEnter={handleTriggerEnter}
              onMouseLeave={handleTriggerLeave}
              onPointerDown={handleTriggerPointerDown}
              onPointerUp={handleTriggerPointerUp}
              onPointerCancel={handleTriggerPointerUp}
              onContextMenu={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleTriggerEnter(e);
                }
              }}
              onKeyUp={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleTriggerLeave();
                }
              }}
            >
              {t("footer.tagline")}
            </p>
          </div>

          <nav aria-label={t("footer.socialLabel")}>
            <ul className="footer-links">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring"
                  >
                    {link.name}
                    <span className="sr-only">{t("a11y.newTab")}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <p className="text-right text-sm text-dim max-wide:text-left">
            {t("footer.copyright", { year })}
          </p>
        </div>
      </div>

      <p className={`footer-mark${serif ? " is-serif" : ""}`} aria-hidden="true" ref={markRef}>
        {[...WORDMARK].map((letter, index) => (
          <span className="footer-mark-ch" key={`${letter}-${index}`}>
            {letter}
          </span>
        ))}
      </p>
    </footer>
  );
};

export default Footer;
