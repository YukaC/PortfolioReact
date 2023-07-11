import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub, faLinkedin, faInstagram } from '@fortawesome/free-brands-svg-icons';

function SocialLinks() {
  return (
    <div className="inline-flex space-x-4 social">
      <a
        target="_blank"
        href="https://github.com/YukaC"
        className="flex items-center justify-center w-12 h-12 transition-all duration-200 rounded-full bg-main-color hover:bg-shadow-main-color"
      >
        <FontAwesomeIcon icon={faGithub} />
      </a>
      <a
        target="_blank"
        href="https://www.linkedin.com/in/agust%C3%ADn-ciucani/"
        className="flex items-center justify-center w-12 h-12 transition-all duration-200 rounded-full bg-main-color hover:bg-shadow-main-color"
      >
        <FontAwesomeIcon icon={faLinkedin} />
      </a>
      <a
        target="_blank"
        href="https://www.instagram.com/yuka.mol/"
        className="flex items-center justify-center w-12 h-12 transition-all duration-200 rounded-full bg-main-color hover:bg-shadow-main-color"
      >
        <FontAwesomeIcon icon={faInstagram} />
      </a>
    </div>
  );
}

export default SocialLinks;
