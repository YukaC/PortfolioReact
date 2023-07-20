import { useState } from "react";
import Image from "next/image";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const Tags = [
    { name: "HOME" },
    { name: "ABOUT" },
    { name: "PORTFOLIO" },
    { name: "CONTACT" },
  ];

  const scrollToSection = (sectionName) => {
    const section = document.getElementById(sectionName.toLowerCase());
    if (section) {
      window.scrollTo({
        top: section.offsetTop,
        behavior: "smooth",
      });
    }
    setIsMenuOpen(false)
  };

  const spanElements = [
    <span key="1" style={{ transform: isMenuOpen ? "rotate(45deg)" : "none" }} />,
    <span key="2" style={{ opacity: isMenuOpen ? "0" : "1" }} />,
    <span key="3" style={{ transform: isMenuOpen ? "rotate(-45deg)" : "none" }} />,
  ];

  return (
    <header className="mt-9">
      <div className="relative z-50 flex items-center justify-between">
        <div>
          <Image
            className="logoWeb"
            id="logo"
            src="/logo-white.png"
            alt="Logo"
            width={100}
            height={50}
          />
        </div>
        <button
          className="md:hidden z-50 block w-8 h-12"
          id="menuToggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {spanElements}
        </button>

        <ul
          className={`text-center top-20 h-64 w-full absolute md:h-auto md:bg-transparent md:w-auto md:flex md:items-center md:static bg-main-color transition-all duration-[600ms] ease-in ${
            isMenuOpen ? "" : "menu-hidden"
          }`}
        >
          {Tags.map((tag, index) => (
            <li
              key={tag.name}
              style={{
                transitionDelay: isMenuOpen ? `${index * .2}s` : `${(Tags.length - index - 1) * .2}s`
              }}
              className={`text-xl navbar-opt md:ml-8 md:my-0 my-7 transition-all duration-[250ms] ease-out ${
                isMenuOpen ? "opacity-1" : "opacity-0"
              }`}
              
            >
              <button
                onClick={() => scrollToSection(tag.name)}
                className="text-gray-200 duration-300 hover:text-gray-500"
              >
                {tag.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
};

export default Navbar;