import React, { useState } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  let Links =[
    {name:"HOME",link:"/"},
    {name:"ABOUT",link:"/"},
    {name:"PORTFOLIO",link:"/"},
    {name:"CONTACT",link:"/"},
  ];

  return (
      <header className="mt-9">
        <div className="relative flex items-center justify-between ">
          <div>
            <Image
              className="logoWeb"
              id="logo"
              src="/logo-white.png"
              alt="Logo"
              width={110}
              height={50}
            />
          </div>
          <button
            className=""
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <i><FontAwesomeIcon icon={faBars} size="2xl"/></i>
          </button>

        <ul className={`z-50 md:flex md:items-center md:pb-0 pb-12 absolute md:static bg-main-color md:z-auto left-0 w-full md:w-auto md:pl-0 pl-9 transition-all duration-500 ease-in ${isMenuOpen ? 'top-28 ':'top-[-490px]'}`}>
          {Links.map((link)=>(
            <li key={link.name} className='text-xl md:ml-8 md:my-0 my-7'>
              <a href={link.link} className='text-gray-200 duration-500 hover:text-gray-500'>{link.name}</a>
            </li>
            
          ))}
          <div className="drop-cont">
                <i className="fa-solid fa-globe fa-sm"></i>
                <select id="lang-selector">
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
        </ul>
        </div>
      </header>
  );
};

export default Navbar;
