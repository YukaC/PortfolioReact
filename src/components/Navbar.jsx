import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Magnetic from "@/components/Magnetic";
import SiteLogo from "@/components/SiteLogo";
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
          {...(isMobile && { role: "menuitem" })}
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
    <Magnetic>
      <a
        href="#contact"
        onClick={(e) => scrollToSection(e, "#contact")}
        data-nav-href="#contact"
        data-menu-item={isMobile ? "" : undefined}
        className={`nav-cta focus-ring ${isMobile ? "mt-8 w-full justify-center" : ""}`}
        {...(isMobile && { role: "menuitem" })}
      >
        {t("nav.contact")}
      </a>
    </Magnetic>
  );
};

const MenuToggleIcon = ({ isOpen }) => (
  <span
    className="menu-toggle"
    aria-hidden="true"
    data-open={isOpen ? "true" : "false"}
  >
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
  const panelRef = useRef(null);
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

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      html.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      unlockSmoothScroll();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return undefined;

    registerMotion();
    const items = panel.querySelectorAll("[data-menu-item]");
    const isReduced = prefersReducedMotion();

    if (isReduced) {
      gsap.set(panel, {
        autoAlpha: isMenuOpen ? 1 : 0,
        yPercent: 0,
        pointerEvents: isMenuOpen ? "auto" : "none",
      });
      gsap.set(items, { autoAlpha: 1, y: 0 });
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
        },
      }),
    );

    return undefined;
  }, [isMenuOpen]);

  return (
    <>
      <header ref={headerRef} className="site-header">
        <div className="nav-pill">
          <Link
            href="#home"
            className="logo-link focus-ring rounded-sm"
            onClick={(e) => scrollToSection(e, "#home")}
            aria-label={t("nav.home")}
          >
            <SiteLogo priority showStroke className="h-8 w-auto md:h-9" />
          </Link>

          <div
            className="hidden items-center md:flex"
            onPointerLeave={() => {
              isHoveringRef.current = false;
              placeOnActive();
            }}
          >
            <nav
              ref={linksRef}
              className="nav-links"
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

          <button
            type="button"
            className="btn-icon focus-ring md:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls={menuId}
            aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          >
            <MenuToggleIcon isOpen={isMenuOpen} />
          </button>
        </div>
      </header>

      <div
        ref={panelRef}
        id={menuId}
        className="mobile-menu-panel fixed inset-0 z-40 md:hidden"
        role="menu"
        aria-hidden={!isMenuOpen}
      >
        <div className="site-shell flex h-full flex-col justify-center pt-24">
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
