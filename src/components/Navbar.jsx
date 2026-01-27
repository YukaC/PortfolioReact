import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { NAV_LINKS } from "@/data/constants";

// Reusable NavLinks component to avoid duplication
const NavLinks = ({ scrollToSection, isMobile = false }) => (
  <>
    {NAV_LINKS.map((link) => (
      <a
        key={link.name}
        href={link.href}
        onClick={(e) => scrollToSection(e, link.href)}
        className={`font-medium text-text-muted hover:text-amber-glow transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main rounded ${
          isMobile ? "text-lg py-2" : "text-sm"
        }`}
        {...(isMobile && { role: "menuitem" })}
      >
        {link.name}
      </a>
    ))}
  </>
);

// Reusable ContactButton component to avoid duplication
const ContactButton = ({ scrollToSection, isMobile = false }) => (
  <a
    href="#contact"
    onClick={(e) => scrollToSection(e, "#contact")}
    className={`inline-flex items-center justify-center gap-2 px-6 bg-primary text-bg-main font-bold rounded transition-all duration-300 hover:bg-amber-glow hover:text-[#19161c] shadow-md shadow-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main ${
      isMobile ? "py-3 text-center mt-2" : "py-2 text-sm hover:-translate-y-0.5"
    }`}
    {...(isMobile && { role: "menuitem" })}
  >
    Get in Touch
  </a>
);

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (e, href) => {
    e.preventDefault();
    const section = document.querySelector(href);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 glass-panel"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-container mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo - fixed dimensions to prevent shift */}
          <Link
            href="#home"
            className="group flex items-center h-16 shrink-0 hover:drop-shadow-[0_0_10px_var(--color-amber-glow)] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main rounded"
            onClick={(e) => scrollToSection(e, "#home")}
            aria-label="Go to home section"
          >
            <Image
              src="/logo-white.png"
              alt="Agustin Ciucani Logo"
              width={200}
              height={64}
              className="h-16 w-auto object-contain"
              priority
            />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <NavLinks scrollToSection={scrollToSection} />
            <ContactButton scrollToSection={scrollToSection} />
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-text-muted hover:text-amber-glow transition-colors duration-300"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {isMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu - now fixed positioned separately with glass-panel */}
      <div
        id="mobile-menu"
        className={`md:hidden fixed top-20 left-0 right-0 z-40 glass-panel transition-all duration-300 ${
          isMenuOpen
            ? "opacity-100 visible translate-y-0"
            : "opacity-0 invisible -translate-y-4 pointer-events-none"
        }`}
        role="menu"
      >
        <div className="px-6 py-6 flex flex-col gap-4">
          <NavLinks scrollToSection={scrollToSection} isMobile />
          <ContactButton scrollToSection={scrollToSection} isMobile />
        </div>
      </div>
    </>
  );
};

export default Navbar;
