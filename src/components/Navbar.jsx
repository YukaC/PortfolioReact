import { useState, useEffect, useId } from "react";
import Link from "next/link";
import Image from "next/image";
import { NAV_LINKS } from "@/data/constants";
import { scrollToSectionByHash } from "@/utils/scroll-to-section";

const isValidHash = (href) => typeof href === "string" && /^#[\w-]+$/.test(href);

const NavLinks = ({ scrollToSection, isMobile = false }) => (
  <>
    {NAV_LINKS.map((link) => (
      <a
        key={link.name}
        href={link.href}
        onClick={(e) => scrollToSection(e, link.href)}
        className={`font-medium text-text-muted hover:text-amber-glow transition-colors duration-300 focus-ring rounded ${
          isMobile
            ? "text-lg py-3 border-b border-border/60 last:border-b-0"
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
  <a
    href="#contact"
    onClick={(e) => scrollToSection(e, "#contact")}
    className={`btn-primary focus-ring ${
      isMobile ? "py-3 text-center mt-3 w-full" : "px-6 py-2 text-sm"
    }`}
    {...(isMobile && { role: "menuitem" })}
  >
    Get in Touch
  </a>
);

/** Three bars centered — closed: spaced; open: rotate into a clean X. */
const MenuToggleIcon = ({ isOpen }) => (
  <span className="menu-toggle" aria-hidden="true" data-open={isOpen ? "true" : "false"}>
    <span className="menu-toggle-bar menu-toggle-bar-top" />
    <span className="menu-toggle-bar menu-toggle-bar-mid" />
    <span className="menu-toggle-bar menu-toggle-bar-bot" />
  </span>
);

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuId = useId();

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

  // Lock page scroll while menu open.
  // Width stays put via html { scrollbar-gutter: stable } — no padding hack
  // (padding + gutter caused a double shift / jump).
  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const html = document.documentElement;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      html.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 bg-bg-main/70 border-b border-border backdrop-blur-md supports-[backdrop-filter]:bg-bg-main/60"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="w-full px-6 h-20 flex items-center justify-between">
          <Link
            href="#home"
            className="group flex items-center h-16 shrink-0 hover:drop-shadow-[0_0_10px_var(--color-amber-glow)] transition-all duration-300 focus-ring rounded"
            onClick={(e) => scrollToSection(e, "#home")}
            aria-label="Go to home section"
          >
            <Image
              src="/logo-white.webp"
              alt="Agustin Ciucani Logo"
              width={233}
              height={188}
              priority
              loading="eager"
              className="h-16 w-auto object-contain"
              style={{ width: "auto" }}
            />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <NavLinks scrollToSection={scrollToSection} />
            <ContactButton scrollToSection={scrollToSection} />
          </div>

          <button
            type="button"
            className="md:hidden p-2 text-text-muted hover:text-amber-glow transition-colors duration-300 focus-ring rounded"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls={menuId}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            <MenuToggleIcon isOpen={isMenuOpen} />
          </button>
        </div>
      </nav>

      {/* Scrim */}
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={isMenuOpen ? 0 : -1}
        onClick={closeMenu}
        className={`md:hidden fixed inset-0 z-40 bg-bg-main/50 transition-opacity duration-[320ms] ease-out ${
          isMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Single height animation — no child transforms (those cause micro-jumps) */}
      <div
        id={menuId}
        className={`mobile-menu-panel md:hidden fixed top-20 left-0 right-0 z-40 grid ${
          isMenuOpen
            ? "mobile-menu-panel-open pointer-events-auto"
            : "pointer-events-none"
        }`}
        role="menu"
        aria-hidden={!isMenuOpen}
      >
        <div className="mobile-menu-panel-inner overflow-hidden min-h-0">
          <div className="border-b border-border bg-bg-main/95 px-6 py-5 flex flex-col gap-1">
            <NavLinks scrollToSection={scrollToSection} isMobile />
            <ContactButton scrollToSection={scrollToSection} isMobile />
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
