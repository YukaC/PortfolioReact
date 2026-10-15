import { useState, useEffect, useId, useRef } from "react";
import Link from "next/link";
import Magnetic from "@/components/Magnetic";
import SiteLogo from "@/components/SiteLogo";
import { NAV_LINKS } from "@/data/constants";
import { DURATION, EASE, STAGGER } from "@/motion/config";
import { prefersReducedMotion } from "@/motion/prefersReducedMotion";
import { gsap, registerMotion, ScrollTrigger } from "@/motion/register";
import { lockSmoothScroll, unlockSmoothScroll } from "@/motion/smoothScroll";
import { willChangeVars } from "@/motion/willChange";
import { scrollToSectionByHash } from "@/utils/scroll-to-section";

const isValidHash = (href) => typeof href === "string" && /^#[\w-]+$/.test(href);

const SPY_SECTION_IDS = ["portfolio", "about", "contact"];

function syncNavSpy(linkNodes) {
  const spyY = Math.max(120, Math.round(window.innerHeight * 0.33));
  let activeId = "";
  for (let i = 0; i < SPY_SECTION_IDS.length; i += 1) {
    const section = document.getElementById(SPY_SECTION_IDS[i]);
    if (section && section.getBoundingClientRect().top <= spyY) {
      activeId = SPY_SECTION_IDS[i];
    }
  }

  const contact = document.getElementById("contact");
  if (contact) {
    const contactTop = contact.getBoundingClientRect().top;
    const scrollRoot = document.scrollingElement ?? document.documentElement;
    const remaining =
      scrollRoot.scrollHeight - (scrollRoot.scrollTop + window.innerHeight);
    if (contactTop <= spyY || remaining < 96) {
      activeId = "contact";
    }
  }

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

const NavLinks = ({ scrollToSection, isMobile = false }) => (
  <>
    {NAV_LINKS.map((link) => (
      <a
        key={link.name}
        href={link.href}
        onClick={(e) => scrollToSection(e, link.href)}
        data-nav-href={link.href}
        data-menu-item={isMobile ? "" : undefined}
        className={`inline-block text-fog hover:text-paper link-underline focus-ring ${
          isMobile
            ? "py-4 font-heading text-3xl tracking-[0.01em]"
            : "text-sm"
        }`}
        {...(isMobile && { role: "menuitem" })}
      >
        {link.name}
      </a>
    ))}
  </>
);

const ContactButton = ({ scrollToSection, isMobile = false }) => (
  <Magnetic>
    <a
      href="#contact"
      onClick={(e) => scrollToSection(e, "#contact")}
      data-nav-href="#contact"
      data-menu-item={isMobile ? "" : undefined}
      className={`btn-nav focus-ring ${isMobile ? "mt-8 w-full py-3" : ""}`}
      {...(isMobile && { role: "menuitem" })}
    >
      Get in Touch
    </a>
  </Magnetic>
);

const MenuToggleIcon = ({ isOpen }) => (
  <span className="menu-toggle" aria-hidden="true" data-open={isOpen ? "true" : "false"}>
    <span className="menu-toggle-bar menu-toggle-bar-top" />
    <span className="menu-toggle-bar menu-toggle-bar-bot" />
  </span>
);

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuId = useId();
  const panelRef = useRef(null);
  const navRef = useRef(null);
  const isMenuOpenRef = useRef(false);
  const hasOpenedOnce = useRef(false);

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

  useEffect(() => {
    isMenuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

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
    const nav = navRef.current;
    if (!nav) return undefined;

    registerMotion();

    const syncSpy = () =>
      syncNavSpy(document.querySelectorAll("[data-nav-href]"));
    syncSpy();

    const trigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      invalidateOnRefresh: true,
      onRefresh: syncSpy,
      onUpdate(self) {
        nav.classList.toggle("is-nav-scrolled", self.scroll() > 16);
        syncSpy();
      },
    });

    ScrollTrigger.addEventListener("scrollEnd", syncSpy);

    return () => {
      ScrollTrigger.removeEventListener("scrollEnd", syncSpy);
      trigger.kill();
      gsap.killTweensOf(nav);
    };
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return undefined;

    registerMotion();
    const items = panel.querySelectorAll("[data-menu-item]");
    const isReduced = prefersReducedMotion();

    if (!hasOpenedOnce.current && !isMenuOpen) {
      gsap.set(panel, { autoAlpha: 0, yPercent: -3, pointerEvents: "none" });
      return undefined;
    }
    hasOpenedOnce.current = true;

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
      <nav
        ref={navRef}
        className="site-nav fixed inset-x-0 top-0 z-50"
        aria-label="Main navigation"
      >
        <div className="site-shell flex h-16 items-center justify-between md:h-[4.5rem]">
          <Link
            href="#home"
            className="focus-ring shrink-0 rounded-sm"
            onClick={(e) => scrollToSection(e, "#home")}
            aria-label="Go to home section"
          >
            <SiteLogo priority showStroke className="h-8 w-auto md:h-9" />
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <NavLinks scrollToSection={scrollToSection} />
            <ContactButton scrollToSection={scrollToSection} />
          </div>

          <button
            type="button"
            className="btn-icon focus-ring md:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls={menuId}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            <MenuToggleIcon isOpen={isMenuOpen} />
          </button>
        </div>
      </nav>

      <div
        ref={panelRef}
        id={menuId}
        className="mobile-menu-panel fixed inset-0 z-40 bg-ink md:hidden"
        role="menu"
        aria-hidden={!isMenuOpen}
      >
        <div className="site-shell flex h-full flex-col justify-center pt-24">
          <NavLinks scrollToSection={scrollToSection} isMobile />
          <ContactButton scrollToSection={scrollToSection} isMobile />
        </div>
      </div>
    </>
  );
};

export default Navbar;
