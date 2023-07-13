import { useState } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  let Tags = [
    { name: 'HOME' },
    { name: 'ABOUT' },
    { name: 'PORTFOLIO' },
    { name: 'CONTACT' },
  ];

  const scrollToSection = (sectionName) => {
    const section = document.getElementById(sectionName.toLowerCase());
    if (section) {
      window.scrollTo({
        top: section.offsetTop,
        behavior: 'smooth',
      });
    }
    setIsMenuOpen(false); // Cerrar el menú después de hacer clic en un enlace
  };

  return (
    <header className="mt-9">
      <div className="relative flex items-center justify-between">
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
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <FontAwesomeIcon icon={faBars} size="2x" />
        </button>

        <ul
          className={`z-50 text-center md:bg-transparent md:flex md:items-center absolute md:static bg-main-color md:z-auto left-0 w-full md:w-auto md:pl-0 pl-9 transition-all duration-500 ease-in ${
            isMenuOpen ? 'top-28' : 'top-[-490px]'
          }`}
        >
          {Tags.map((tag) => (
            <li key={tag.name} className="text-xl md:ml-8 md:my-0 my-7">
              <button
                onClick={() => scrollToSection(tag.name)}
                className="text-gray-200 duration-500 hover:text-gray-500"
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
