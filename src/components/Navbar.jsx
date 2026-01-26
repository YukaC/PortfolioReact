import { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { NAV_LINKS } from "@/data/constants";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Detect scroll for navbar background - using startTransition for non-urgent updates
  useEffect(() => {
    const handleScroll = () => {
      startTransition(() => {
        setIsScrolled(window.scrollY > 20);
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (e, href) => {
    e.preventDefault();
    const section = document.querySelector(href);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "backdrop-blur-md bg-bg-main/80 border-b border-(--color-border)"
          : "bg-transparent"
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-container mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="#home"
          className="group flex items-center gap-2 font-heading font-bold text-xl hover:text-amber-glow transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main rounded"
          onClick={(e) => scrollToSection(e, "#home")}
          aria-label="Go to home section"
        >
          Agustin Ciucani
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => scrollToSection(e, link.href)}
              className="text-sm font-medium text-text-muted hover:text-amber-glow transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main rounded"
            >
              {link.name}
            </a>
          ))}
          <a
            href="#contact"
            onClick={(e) => scrollToSection(e, "#contact")}
            className="inline-flex items-center justify-center gap-2 px-6 py-2 text-sm bg-primary text-bg-main font-bold rounded transition-all duration-300 hover:bg-amber-glow hover:text-[#19161c] hover:-translate-y-0.5 shadow-md shadow-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main"
          >
            Get in Touch
          </a>
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

      {/* Mobile Menu */}
      <div
        id="mobile-menu"
        className={`md:hidden absolute top-20 left-0 right-0 bg-bg-main/95 backdrop-blur-lg border-b border-(--color-border) transition-all duration-300 ${
          isMenuOpen
            ? "opacity-100 visible translate-y-0"
            : "opacity-0 invisible -translate-y-4"
        }`}
        role="menu"
      >
        <div className="px-6 py-6 flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => scrollToSection(e, link.href)}
              className="text-lg py-2 font-medium text-text-muted hover:text-amber-glow transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main rounded"
              role="menuitem"
            >
              {link.name}
            </a>
          ))}
          <a
            href="#contact"
            onClick={(e) => scrollToSection(e, "#contact")}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-bg-main font-bold rounded text-center mt-2 transition-all duration-300 hover:bg-amber-glow hover:text-[#19161c] shadow-md shadow-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main"
            role="menuitem"
          >
            Get in Touch
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
