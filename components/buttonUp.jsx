import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";

library.add(fas);

const ScrollToTopButton = () => {
  const [showButton, setShowButton] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleScroll = () => {
    if (window.pageYOffset > 300) {
      setShowButton(true);
    } else {
      setShowButton(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <button
      className={`fixed bottom-6 right-6 transition-all duration-200 bg-main-color hover:bg-shadow-main-color text-white rounded-full w-12 h-12 flex items-center justify-center ${
        showButton ? "opacity-100" : "opacity-0"
      }`}
      onClick={scrollToTop}
      id="ArrowToUp"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <FontAwesomeIcon
        icon={faArrowUp}
        style={{ color: "#ffffff" }}
        className={`fa-arrow-up ${isHovered ? "animate-bounce" : ""}`}
      />
    </button>
  );
};

export default ScrollToTopButton;
