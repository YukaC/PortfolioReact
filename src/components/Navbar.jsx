"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SiteLogo from "@/components/SiteLogo";
import SwapArrow from "@/components/SwapArrow";
import { NAV_LINKS } from "@/data/constants";
import { useT } from "@/i18n/LocaleProvider";
import { DURATION, EASE, STAGGER } from "@/motion/config";
import { prefersReducedMotion } from "@/motion/prefersReducedMotion";
import { gsap, registerMotion, ScrollTrigger } from "@/motion/register";
import { lockSmoothScroll, unlockSmoothScroll } from "@/motion/smoothScroll";
import { willChangeVars } from "@/motion/willChange";
import { scrollToSectionByHash } from "@/utils/scroll-to-section";

const isValidHash = (href) => typeof href === "string" && /^#[\w-]+$/.test(href);

const SPY_SECTION_IDS = ["portfolio", "about", "contact"];

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
    spyY: Math.max(120, Math.round(viewport * 0.33)),
    viewport,
    scrollHeight: scrollRoot.scrollHeight,
    sections,
    contactTop: contact ? contact.getBoundingClientRect().top + scrollY : null,
  };
}

function resolveSpyId(geometry, scrollY) {
  if (!geometry) return "";

  let activeId = "";
  for (let i = 0; i < geometry.sections.length; i += 1) {
    if (geometry.sections[i].top - scrollY <= geometry.spyY) {
      activeId = geometry.sections[i].id;
    }
  }

  if (geometry.contactTop !== null) {
    const remaining = geometry.scrollHeight - (scrollY + geometry.viewport);
    if (geometry.contactTop - scrollY <= geometry.spyY || remaining < 96) {
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

const ContactButton = ({ scrollToSection, isMobile = false }) => {
  const { t } = useT();

  return (
    <a
      href="#contact"
      onClick={(e) => scrollToSection(e, "#contact")}
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
  const { t } = useT();
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
    scrollToSectionByHash(href);
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

    const refreshGeometry = () => {
      geometry = measureNavSpy();
    };

    // The links and the indicator are only touched when the active section
    // actually changes, not once per scroll frame.
    const syncSpy = (scrollY = window.scrollY) => {
      const nextId = resolveSpyId(geometry, scrollY);
      if (nextId === activeId) return;
      activeId = nextId;
      applySpyId(linkNodes, nextId);

      if (isHoveringRef.current) return;
      const active =
        linksRef.current?.querySelector(".nav-link.is-nav-active") ?? null;
      const href = active?.getAttribute("data-nav-href") ?? null;
      if (href === activeHrefRef.current) return;
      activeHrefRef.current = href;
      placeIndicator(active);
    };

    const syncFromScroll = () => syncSpy(window.scrollY);

    refreshGeometry();
    syncSpy();

    const trigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      invalidateOnRefresh: true,
      onRefresh() {
        refreshGeometry();
        syncFromScroll();
      },
      onUpdate(self) {
        const scrolled = self.scroll() > 24;
        if (scrolled !== isScrolled) {
          isScrolled = scrolled;
          header.classList.toggle("is-scrolled", scrolled);
        }
        syncSpy(self.scroll());
      },
    });

    ScrollTrigger.addEventListener("scrollEnd", syncFromScroll);

    const placeOnActiveLink = () => placeIndicator(
      linksRef.current?.querySelector(".nav-link.is-nav-active") ?? null,
    );
    const onResize = () => {
      refreshGeometry();
      placeOnActiveLink();
    };
    window.addEventListener("resize", onResize);
    if (document.fonts?.ready) document.fonts.ready.then(onResize);

    // A work filter, a late image or a font swap moves everything below it, so
    // the cached offsets are re-measured when the document changes size.
    const layoutObserver = new ResizeObserver(onResize);
    layoutObserver.observe(document.body);

    return () => {
      layoutObserver.disconnect();
      ScrollTrigger.removeEventListener("scrollEnd", syncFromScroll);
      window.removeEventListener("resize", onResize);
      trigger.kill();
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
      // first frame (the reveal is an instant set).
      const focusable =
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
      let frame = 0;
      const focusFirst = (attempt = 0) => {
        const target = panel?.querySelector(focusable);
        if (!target) return;
        target.focus({ preventScroll: true });
        if (document.activeElement === target) return;
        // Retry only while focus sits where the reader already put it — the
        // toggle they pressed, or the body — so the loop can never fight a Tab
        // the reader made while the panel was still revealing.
        const active = document.activeElement;
        const untouched = !active || active === document.body || active === toggle;
        if (untouched && attempt < 30) {
          frame = requestAnimationFrame(() => focusFirst(attempt + 1));
        }
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
              <ContactButton scrollToSection={scrollToSection} />
            </nav>

            <LanguageSwitcher className="ml-2" />
          </div>

          {/* A native disclosure, not a React-only drawer: with no script the
              browser opens and closes it by itself, so the hamburger is a real
              control at 390 px instead of a visible button that does nothing
              (audit.md §10 P0-4). With a script the `toggle` event mirrors the
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
