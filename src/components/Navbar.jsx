"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SiteLogo from "@/components/SiteLogo";
import SwapArrow from "@/components/SwapArrow";
import { NAV_LINKS } from "@/data/constants";
import { useT } from "@/i18n/LocaleProvider";
import { DURATION, EASE, STAGGER } from "@/motion/config";
import { prefersReducedMotion } from "@/motion/prefersReducedMotion";
import { gsap, registerMotion } from "@/motion/register";
import {
  lockSmoothScroll,
  unlockSmoothScroll,
} from "@/motion/smoothScroll";
import { willChangeVars } from "@/motion/willChange";
import { scrollToSectionByHash } from "@/utils/scroll-to-section";

const isValidHash = (href) => typeof href === "string" && /^#[\w-]+$/.test(href);

const SPY_SECTION_IDS = ["portfolio", "about", "contact"];

/* Every read below costs a layout: `getBoundingClientRect` per section,
   `scrollHeight` for the whole document, `offsetWidth`/`offsetLeft` for the pill.
   On Android the URL bar collapsing resizes the body on scroll frames, so the
   observer that watches the document re-asked for all of it inside a gesture —
   a forced synchronous layout per frame, on the path that was already long. The
   burst now waits for the same 200 ms the scroll ranges wait out
   (`REFRESH_DEBOUNCE_MS` in `src/motion/scrollProgress.js`), and whatever is left
   of it is coalesced into one requestAnimationFrame. Nothing here delays a write:
   the pill is placed from the scroll handler's cached geometry, and this only
   re-measures what moved. */
const NAV_SETTLE_MS = 200;
/* A flick can end on the boundary between the two pill states, and then the last
   event carries a value from before the reader arrived. This is how long the state
   waits for silence before re-reading it: a missed event corrects itself instead of
   sticking. */
const STATE_SETTLE_MS = 140;

/**
 * Scroll-spy geometry, in document coordinates.
 *
 * Reading a section rect inside the scroll handler forces layout on every
 * frame, so the geometry is measured once per layout change and the active
 * section is then resolved against the scroll offset, which is a cached read.
 */
function measureNavSpy() {
  const scrollY = window.scrollY;
  const viewport = window.innerHeight;
  const scrollRoot = document.scrollingElement ?? document.documentElement;
  const sections = SPY_SECTION_IDS.map((id) => {
    const section = document.getElementById(id);
    return {
      id,
      top: section
        ? section.getBoundingClientRect().top + scrollY
        : Number.POSITIVE_INFINITY,
    };
  });
  const contact = document.getElementById("contact");

  return {
    viewport,
    scrollHeight: scrollRoot.scrollHeight,
    sections,
    contactTop: contact ? contact.getBoundingClientRect().top + scrollY : null,
  };
}

/* `viewport` is read live by the caller: on a phone or a tablet the toolbar
   collapses while the reader scrolls, which changes the height and not the
   width, so the measured value goes stale (the resize handler only
   re-measures on a width change). At the end of the page the stale height left
   `remaining` at the toolbar's height — past 96px on a 980px desktop-mode
   layout — and Contact never became active. Callers read `innerHeight` next
   to `scrollY`, before any write in the frame: both only force a layout when
   one is pending, so read first they cost nothing extra. */
function resolveSpyId(geometry, scrollY, viewport = geometry?.viewport) {
  if (!geometry) return "";
  const spyY = Math.max(120, Math.round(viewport * 0.33));

  let activeId = "";
  for (let i = 0; i < geometry.sections.length; i += 1) {
    if (geometry.sections[i].top - scrollY <= spyY) {
      activeId = geometry.sections[i].id;
    }
  }

  if (geometry.contactTop !== null) {
    const remaining = geometry.scrollHeight - (scrollY + viewport);
    if (geometry.contactTop - scrollY <= spyY || remaining < 96) {
      activeId = "contact";
    }
  }

  return activeId;
}

function applySpyId(linkNodes, activeId) {
  for (let i = 0; i < linkNodes.length; i += 1) {
    const href = linkNodes[i].getAttribute("data-nav-href");
    const isActive = href === `#${activeId}`;
    linkNodes[i].classList.toggle("is-nav-active", isActive);
    if (isActive) {
      linkNodes[i].setAttribute("aria-current", "true");
    } else {
      linkNodes[i].removeAttribute("aria-current");
    }
  }
}

const NavLinks = ({ scrollToSection, isMobile = false }) => {
  const { t } = useT();

  return (
    <>
      {NAV_LINKS.map((link) => (
        <a
          key={link.name}
          href={link.href}
          onClick={(e) => scrollToSection(e, link.href)}
          data-nav-href={link.href}
          data-menu-item={isMobile ? "" : undefined}
          className={
            isMobile
              ? "focus-ring block py-4 font-heading text-3xl tracking-[0.01em] text-white/75 hover:text-white"
              : "nav-link focus-ring"
          }
        >
          {t(`nav.links.${link.href.replace("#", "")}`)}
        </a>
      ))}
    </>
  );
};

const ContactButton = ({
  scrollToSection,
  onPointerEnter,
  isMobile = false,
}) => {
  const { t } = useT();

  return (
    <a
      href="#contact"
      onClick={(e) => scrollToSection(e, "#contact")}
      onPointerEnter={onPointerEnter}
      data-nav-href="#contact"
      data-menu-item={isMobile ? "" : undefined}
      className={`nav-cta focus-ring ${isMobile ? "mt-8 w-full justify-center" : ""}`}
    >
      {/* The nav CTA carries the arrow swap and not the label roll: it is the same
          box in the page's motion that the other buttons share, and the roll is the
          one part it does not take (owner's brief). Only the arrow moves. */}
      {t("nav.contact")}
      <SwapArrow direction="r" size={14} />
    </a>
  );
};

/**
 * Two bars that cross into an X. The open state is CSS's: the rules read
 * `[open]` from the `<details>` the summary belongs to, so the icon is honest
 * with and without a script (no state to hydrate).
 */
const MenuToggleIcon = () => (
  <span className="menu-toggle" aria-hidden="true">
    <span className="menu-toggle-bar menu-toggle-bar-top" />
    <span className="menu-toggle-bar menu-toggle-bar-bot" />
  </span>
);

/**
 * Navbar - floating pill over the field.
 *
 * Transparent at rest and glass once the page moves, with a soft pill that
 * slides under whatever link the pointer is on and returns to the section the
 * reader is actually in.
 */
const Navbar = () => {
  const { t, locale } = useT();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuId = useId();
  const detailsRef = useRef(null);
  const panelRef = useRef(null);
  const toggleRef = useRef(null);
  const hasOpenedRef = useRef(false);
  const headerRef = useRef(null);
  const linksRef = useRef(null);
  const indicatorRef = useRef(null);
  const isHoveringRef = useRef(false);
  const activeHrefRef = useRef(null);

  const closeMenu = () => setIsMenuOpen(false);

  const scrollToSection = (e, href) => {
    e.preventDefault();
    if (!isValidHash(href)) {
      closeMenu();
      return;
    }
    /* The sections live on the home page. From a project or the privacy page
       there is nothing to scroll to, so the link goes home in the same language
       and lands on the section there instead of doing nothing. */
    if (!scrollToSectionByHash(href)) {
      router.push(`${locale === "en" ? "/" : `/${locale}`}${href}`);
    }
    closeMenu();
  };

  const placeIndicator = useCallback((anchor) => {
    const indicator = indicatorRef.current;
    if (!indicator) return;
    if (!anchor) {
      indicator.style.opacity = "0";
      return;
    }
    indicator.style.width = `${anchor.offsetWidth}px`;
    indicator.style.translate = `${anchor.offsetLeft}px 0`;
    indicator.style.opacity = "1";
  }, []);

  const placeOnActive = useCallback(() => {
    const links = linksRef.current;
    placeIndicator(links?.querySelector(".nav-link.is-nav-active") ?? null);
  }, [placeIndicator]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return undefined;

    registerMotion();

    const linkNodes = document.querySelectorAll("[data-nav-href]");
    let geometry = null;
    let activeId = null; // last id written to the links
    let isScrolled = null; // last header state written
    let settleFrame = 0; // the pending frame that re-measures
    let settleTimer = 0; // the burst the observer is waiting out
    let stateTimer = 0; // the settled re-check of the pill's state
    let disposed = false; // `fonts.ready` cannot be unsubscribed

    const refreshGeometry = () => {
      geometry = measureNavSpy();
    };

    // The links and the indicator are only touched when the active section
    // actually changes, not once per scroll frame. `remeasured` is the one case
    // where the section can stay the same and the pill still has to move: the
    // layout above it did.
    const syncSpy = (
      scrollY = window.scrollY,
      remeasured = false,
      viewport = window.innerHeight,
    ) => {
      const nextId = resolveSpyId(geometry, scrollY, viewport);
      const changed = nextId !== activeId;
      if (changed) {
        activeId = nextId;
        applySpyId(linkNodes, nextId);
      }
      if (!changed && !remeasured) return;

      if (isHoveringRef.current) return;
      const active =
        linksRef.current?.querySelector(".nav-link.is-nav-active") ?? null;
      const href = active?.getAttribute("data-nav-href") ?? null;
      if (!remeasured && href === activeHrefRef.current) return;
      activeHrefRef.current = href;
      placeIndicator(active);
    };

    /* One re-measure per frame, however many sources asked for it: the window
       resize, the font swap and the body observer all land here. It is also the
       whole of the old fine-pointer `onRefresh` duty — the geometry the spy
       resolves against is refreshed ahead of the re-resolved section, so a
       layout change never leaves the pill on a stale offset. */
    const settle = () => {
      if (settleFrame || disposed) return;
      settleFrame = requestAnimationFrame(() => {
        settleFrame = 0;
        if (disposed) return;
        refreshGeometry();
        syncSpy(window.scrollY, true);
      });
    };

    // The observer's case is a burst, so it waits for the end of it instead of
    // re-measuring the document on each of its frames.
    const settleAfterBurst = () => {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        settleTimer = 0;
        settle();
      }, NAV_SETTLE_MS);
    };

    refreshGeometry();
    syncSpy();

    /* Both pointers read the scroll the same way, on the one passive listener the
       page already has. The fine-pointer branch used to borrow ScrollTrigger's
       per-frame loop for it — a loop that existed on every page whether the pill
       moved or not — and the native branch had already proved the listener is
       enough: the event carries the offset the browser settled on, so no cache
       goes stale and nothing has to re-interpolate a value that is already final.
       Only the boolean is written, only when it changes; the spy resolves against
       geometry measured on a layout change, never per event. */
    /* The state reads the offset the browser reports when the event arrives, never
       a cached copy: a cache shared with the scroll layer is one frame behind, and a
       flick that ends exactly on the boundary then leaves the pill solid for good —
       the 8 nov report, "flick hacia la navbar y queda fijo el color oscuro". The
       settled re-check on `scrollend` and after 140 ms of silence is what makes a
       lost or stale event self-correcting rather than sticky. */
    const applyScrollState = () => {
      // Both reads before the class write below: read after it, the
      // height would force a style pass on the frame the pill turns solid.
      const scrollY = window.scrollY;
      const viewport = window.innerHeight;
      const scrolled = scrollY > 24;
      if (scrolled !== isScrolled) {
        isScrolled = scrolled;
        header.classList.toggle("is-scrolled", scrolled);
      }
      syncSpy(scrollY, false, viewport);
    };
    const onScroll = () => {
      applyScrollState();
      if (stateTimer) clearTimeout(stateTimer);
      stateTimer = window.setTimeout(applyScrollState, STATE_SETTLE_MS);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", applyScrollState, { passive: true });
    applyScrollState();

    /* Only a width change can move a section horizontally or re-wrap the pill. A
    height-only resize is the URL bar showing or hiding mid-gesture, which this
    component has no answer for and which arrives on scroll frames — the same
    policy, and the same reason, as the resize handler in
    `src/motion/scrollProgress.js`. */
    let lastWidth = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      settle();
    };
    const onFontsReady = () => settle();
    window.addEventListener("resize", onResize);
    if (document.fonts?.ready) document.fonts.ready.then(onFontsReady);

    // A work filter, a late image or a font swap moves everything below it, so
    // the cached offsets are re-measured when the document changes size.
    const layoutObserver = new ResizeObserver(settleAfterBurst);
    layoutObserver.observe(document.body);

    return () => {
      disposed = true;
      layoutObserver.disconnect();
      if (stateTimer) {
        clearTimeout(stateTimer);
        stateTimer = 0;
      }
      window.removeEventListener("scrollend", applyScrollState);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (settleFrame) cancelAnimationFrame(settleFrame);
      if (settleTimer) clearTimeout(settleTimer);
      settleFrame = 0;
      settleTimer = 0;
      gsap.killTweensOf(header);
    };
  }, [placeIndicator]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const html = document.documentElement;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    lockSmoothScroll();

    // A drawer that covers the page must take the page out of the tab order:
    // focus behind an opaque panel is focus nobody can see. The header stays
    // live because it owns the summary that closes the drawer.
    const background = Array.from(document.querySelectorAll("main, footer"));
    const previousInert = background.map((node) => node.inert);
    background.forEach((node) => {
      node.inert = true;
    });

    // The drawer is a disclosure, not a menu widget, so focus cycles between the
    // summary that closes it and the items the panel reveals — never out into
    // the page behind it.
    const focusable =
      'a[href], button:not([disabled]), summary, input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        closeMenu();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      const inPanel = panel
        ? Array.from(panel.querySelectorAll(focusable)).filter(
            (node) => node.getClientRects().length > 0,
          )
        : [];
      const ring = [toggleRef.current, ...inPanel].filter(Boolean);
      if (ring.length === 0) return;

      const first = ring[0];
      const last = ring[ring.length - 1];
      const active = document.activeElement;
      const outside = !ring.includes(active);

      if (e.shiftKey && (outside || active === first)) {
        e.preventDefault();
        last.focus({ preventScroll: true });
        return;
      }
      if (!e.shiftKey && (outside || active === last)) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      html.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      background.forEach((node, index) => {
        node.inert = previousInert[index];
      });
      unlockSmoothScroll();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMenuOpen]);

  // Focus follows the disclosure: opening moves the reader into the drawer, and
  // closing hands the cursor back to the toggle that opened it. The drawer is a
  // plain <nav> disclosure, not a menu widget, so there is no roving focus and
  // no motion of its own here — the panel reveal stays the only movement.
  useEffect(() => {
    const panel = panelRef.current;
    const toggle = toggleRef.current;

    if (isMenuOpen) {
      hasOpenedRef.current = true;
      // The panel is `visibility: hidden` until the reveal renders its first
      // frame, and a hidden node refuses focus, so the first link is focused as
      // soon as the panel accepts it — under reduced motion that is the very
      // first frame (the reveal is an instant set), and with motion it is the
      // frame the entrance tween first renders.
      const focusable =
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
      /* The budget is counted in frames, not milliseconds, because what it waits
         for is the reveal's first rendered frame and that advances on the same
         rAF clock. One hundred and twenty frames (~2 s at 60 Hz) is far more
         than the one or two frames the reveal needs, and it still ends on its
         own when the panel never becomes focusable, instead of polling for the
         life of the drawer.

         The count is carried by the closure and never taken from the callback.
         `requestAnimationFrame` hands its own timestamp to whatever it calls, and
         a timestamp read as an attempt count exceeds any sane budget on the very
         first frame — that is how this loop came to give up after one try, which
         is exactly the frame the panel is still hidden on. `focusFirst` therefore
         takes no parameter, so there is nothing for the timestamp to land in. */
      const RETRY_FRAMES = 120;
      let frame = 0;
      let attempt = 0;
      const focusFirst = () => {
        const target = panel?.querySelector(focusable);
        if (!target) return;
        target.focus({ preventScroll: true });
        if (document.activeElement === target) return;
        // Retry only while focus sits where the reader already put it — the
        // toggle they pressed, or nowhere at all — so the loop can never fight a
        // Tab the reader made while the panel was still revealing.
        const active = document.activeElement;
        const untouched =
          !active ||
          active === document.body ||
          active === document.documentElement ||
          active === toggle;
        if (!untouched || attempt >= RETRY_FRAMES) return;
        attempt += 1;
        frame = requestAnimationFrame(focusFirst);
      };
      frame = requestAnimationFrame(focusFirst);
      return () => cancelAnimationFrame(frame);
    }

    // Guarded so the initial mount — where the drawer has never been open — does
    // not steal focus from the page on load.
    if (hasOpenedRef.current) {
      hasOpenedRef.current = false;
      toggle?.focus({ preventScroll: true });
    }
    return undefined;
  }, [isMenuOpen]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return undefined;

    registerMotion();
    const items = panel.querySelectorAll("[data-menu-item]");
    const isReduced = prefersReducedMotion();

    // The panel is a sibling of the `<details>`, not a child: the pill turns
    // glass on scroll and `backdrop-filter` makes an ancestor the containing
    // block of a `fixed` descendant, which would shrink the drawer to the pill.
    // So the disclosure's own state is closed by hand once the exit has played.
    // A scriptless visitor never gets here — the browser toggles `open` and CSS
    // reveals the panel (see `.mobile-menu-panel` in globals.css).
    const closeDisclosure = () => {
      const details = detailsRef.current;
      if (details?.open) details.open = false;
    };

    if (isReduced) {
      gsap.set(panel, {
        autoAlpha: isMenuOpen ? 1 : 0,
        yPercent: 0,
        pointerEvents: isMenuOpen ? "auto" : "none",
      });
      gsap.set(items, { autoAlpha: 1, y: 0 });
      if (!isMenuOpen) closeDisclosure();
      return undefined;
    }

    if (isMenuOpen) {
      gsap.set(panel, { pointerEvents: "auto", transformOrigin: "100% 0%" });
      gsap.to(
        panel,
        willChangeVars({
          autoAlpha: 1,
          yPercent: 0,
          duration: DURATION.uiSlow,
          ease: EASE.drawer,
          overwrite: "auto",
        }),
      );
      gsap.fromTo(
        items,
        { autoAlpha: 0, y: 16, scale: 0.97 },
        willChangeVars({
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: DURATION.ui,
          ease: EASE.medium,
          overwrite: "auto",
          stagger: { each: STAGGER.phrase, ease: "power1.inOut" },
        }),
      );
      return undefined;
    }

    gsap.to(
      items,
      willChangeVars({
        autoAlpha: 0,
        y: 8,
        duration: DURATION.uiFast,
        ease: EASE.drawer,
        overwrite: "auto",
        stagger: { each: STAGGER.min, from: "end" },
      }),
    );
    gsap.to(
      panel,
      willChangeVars({
        autoAlpha: 0,
        yPercent: -3,
        duration: DURATION.ui,
        ease: EASE.drawer,
        overwrite: "auto",
        onComplete() {
          gsap.set(panel, { pointerEvents: "none" });
          closeDisclosure();
        },
      }),
    );

    return undefined;
  }, [isMenuOpen]);

  return (
    <>
      <header ref={headerRef} className="site-header">
        <div className="nav-pill">
          {/* A plain anchor, not `next/link`: this is a same-page hash and the
              click is intercepted anyway. `Link` resolved `#home` against the
              live URL on the client (`/?lang=es#home`) and against the route on
              the server (`/es#home`), which hydrated as a mismatch on every
              locale page. */}
          <a
            href="#home"
            className="logo-link focus-ring rounded-sm"
            onClick={(e) => scrollToSection(e, "#home")}
            aria-label={t("nav.home")}
          >
            <SiteLogo priority showStroke className="h-8 w-auto nav:h-9" />
          </a>

          <div
            className="hidden items-center nav:flex"
            onPointerLeave={() => {
              isHoveringRef.current = false;
              placeOnActive();
            }}
          >
            <nav
              ref={linksRef}
              className="relative flex items-center gap-0.5"
              aria-label={t("nav.main")}
              onPointerLeave={() => {
                isHoveringRef.current = false;
                placeOnActive();
              }}
            >
              <i className="nav-ind" ref={indicatorRef} aria-hidden="true" />
              {NAV_LINKS.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => scrollToSection(e, link.href)}
                  onPointerEnter={(e) => {
                    isHoveringRef.current = true;
                    placeIndicator(e.currentTarget);
                  }}
                  onFocus={(e) => placeIndicator(e.currentTarget)}
                  data-nav-href={link.href}
                  className="nav-link focus-ring"
                >
                  {t(`nav.links.${link.href.replace("#", "")}`)}
                </a>
              ))}
              {/* The CTA sits inside the links' `nav`, so reaching it never
                  fires the `nav`'s pointer leave: the hover flag set by the
                  link crossed on the way stayed up, the spy kept skipping the
                  indicator, and a click on Contact scrolled to the end with
                  the pill still under About. Entering the CTA ends the link
                  hover and hands the indicator back to the spy. */}
              <ContactButton
                scrollToSection={scrollToSection}
                onPointerEnter={() => {
                  isHoveringRef.current = false;
                  placeOnActive();
                }}
              />
            </nav>

            <LanguageSwitcher className="ml-2" />
          </div>

          {/* A native disclosure, not a React-only drawer: with no script the
              browser opens and closes it by itself, so the hamburger is a real
              control at 390 px instead of a visible button that does nothing
              (docs/audit.md §10 P0-4). With a script the `toggle` event mirrors the
              browser's state into React, which owns the entrance, the exit,
              the scroll lock and the focus hand-off. The two labels live in the
              markup and CSS shows the one that matches `[open]`, so the
              accessible name is never stale. */}
          <details
            ref={detailsRef}
            className="menu-disclosure nav:hidden"
            onToggle={(event) => setIsMenuOpen(event.currentTarget.open)}
          >
            <summary
              ref={toggleRef}
              className="menu-summary btn-icon focus-ring"
              aria-controls={menuId}
            >
              <span className="sr-only menu-label-open">{t("nav.openMenu")}</span>
              <span className="sr-only menu-label-close">
                {t("nav.closeMenu")}
              </span>
              <MenuToggleIcon />
            </summary>
          </details>
        </div>
      </header>

      <div
        ref={panelRef}
        id={menuId}
        className="mobile-menu-panel fixed inset-0 z-drawer overflow-y-auto nav:hidden"
      >
        <div className="site-shell flex min-h-full flex-col py-24 [justify-content:safe_center]">
          <NavLinks scrollToSection={scrollToSection} isMobile />
          <ContactButton scrollToSection={scrollToSection} isMobile />
          <div data-menu-item="" className="mt-6 flex justify-center">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
