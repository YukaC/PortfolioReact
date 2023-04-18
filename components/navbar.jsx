import Image from "next/image";

const Navbar = () => (
  <header className="container">
    <div className="container flex items-center justify-between">
      <div>
        <Image
          className="logoWeb"
          id="logo"
          src="/logo-white.png"
          alt="Logo"
          width={120}
          height={50}
        />
      </div>
      <nav>
        <ul className="flex space-x-4">
          <li>
            <a className="nav-opt" data-text="navAbt">
              About Me
            </a>
          </li>
          <li>
            <a className="nav-opt" data-text="navPjs">
              Projects
            </a>
          </li>
          <li>
            <a className="nav-opt" data-text="navCtc">
              Contact
            </a>
          </li>
          <div className="drop-cont">
            <i className="fa-solid fa-globe fa-sm"></i>
            <select id="lang-selector">
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
        </ul>
      </nav>

      <button className="hidden" id="hamburger">
        <i className="fa fa-bars fa-lg"></i>
      </button>
    </div>
  </header>
);

export default Navbar;
