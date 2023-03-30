import Link from 'next/link'

const Navbar = () => (
  <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">
      <a className="navbar-brand" href="#">
        YukaC
      </a>
      <button
        className="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span className="navbar-toggler-icon"></span>
      </button>
      <div className="collapse navbar-collapse" id="navbarNav">
        <ul className="navbar-nav ms-auto">
          <li className="nav-item">
            <a className="nav-link active" aria-current="page" href="#">
              About Me
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="#">
              Projects
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="#">
              Contact
            </a>
          </li>
          <li className="nav-item dropdown">
            <a
              className="nav-link dropdown-toggle show"
              data-bs-toggle="dropdown"
              href="#"
              role="button"
              aria-haspopup="true"
              aria-expanded="true"
            >
              Language
            </a>
            <div
              className="dropdown-menu show sty-drp"
              data-popper-placement="bottom-start"
            >
              <a className="dropdown-item" href="#">
                English
              </a>
              <a className="dropdown-item" href="#">
                Spanish
              </a>
              <a className="dropdown-item" href="#">
                Something else here
              </a>
              <div className="dropdown-divider"></div>
              <a className="dropdown-item" href="#">
                Separated link
              </a>
            </div>
          </li>
        </ul>
      </div>
      </div>
  </nav>
);

export default Navbar;
