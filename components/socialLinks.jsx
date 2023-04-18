import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub, faLinkedin, faInstagram, faEnvelope } from '@fortawesome/free-brands-svg-icons';
import { faEnvelope as solidEnvelope } from '@fortawesome/free-solid-svg-icons';

function SocialLinks() {
  return (
    <div className="social">
      <a target="_blank" href="https://github.com/YukaC"><FontAwesomeIcon icon={faGithub} /></a>
      <a target="_blank" href="https://www.linkedin.com/in/agust%C3%ADn-ciucani/"><FontAwesomeIcon icon={faLinkedin} /></a>
      <a target="_blank" href="https://www.instagram.com/yuka.mol/"><FontAwesomeIcon icon={faInstagram} /></a>
      <a target="_blank" href="mailto:agusyuk25@gmail.com"><FontAwesomeIcon icon={solidEnvelope} /></a>
    </div>
  );
}

export default SocialLinks;
