import Layout from "../../components/layout";
import GridPortfolio from "../../components/gridPortfolio";
import LinksSocial from "../../components/socialLinks";
import Image from "next/image";
import ScrollToTopButton from "../../components/buttonUp";
import DownloadButton from "../../components/downloadButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";

const Index = () => (
  <Layout title="Agustin Ciucani | Portfolio">
    <section
      className="flex flex-col justify-center min-h-screen py-10 space-y-6 lg:py-0 text-start"
      id="home"
    >
      <div className="flex flex-col items-center mt-10 space-y-4 text-center lg:justify-center">
        <h1>Hi, I&apos;m Agustin Ciucani</h1>
        <h3>FrontEnd Developer</h3>
        <h4 className="my-8 text-base">
          Welcome to my official portfolio website where I showcase all of my
          web development projects.
          <br />
          This platform serves as a hub for displaying my skills and expertise
          in the field.
          <br />
          Feel free to explore my works and get a glimpse of my capabilities
        </h4>

        <h4>Download my Resume here:</h4>
        <DownloadButton />
      </div>
    </section>

    <section
      className="flex flex-col justify-center min-h-screen py-10 space-y-6 lg:py-0 text-start"
      id="about"
    >
      <div className="items-center mt-10 lg:inline-flex lg:justify-center">
        <div className="w-full lg:w-1/2 lg:text-lg">
          <h1>
            About Me
            <span className="line"></span>
          </h1>
          <div>
            <p className="max-w-4xl my-8">
              Hello! My name is Agustin, a 21-year-old programmer currently
              residing in Buenos Aires, Argentina.
              <br />
              I have a deep passion for creating things on the internet and
              I&apos;m actively pursuing my interest in programming.
              <br />
              Alongside music, coding has become my main hobby and my dedication
              to it drives me to constantly learn and explore the world of
              programming.
              <br />
              I am always eager to acquire new skills and incorporate the latest
              technologies into my projects.
              <br />
              My journey into web development began in 2020 after graduating
              from high school, where I was introduced to programming. Since
              then, I have gained extensive knowledge in HTML and CSS.
            </p>
            <p className="my-5">
              Here are a few technologies I&apos;ve been working with recently:
            </p>

            <ul className="inline-flex skills-list">
              <li>Html</li>
              <li>Css</li>
              <li>Javascript</li>
              <li>React</li>
            </ul>
          </div>
        </div>
        <div className="flex justify-center lg:ml-14">
          <Image
            className="mt-12 rounded-xl lg:mt-0 "
            src="/profilePic.png"
            alt="ImgProfile"
            width={300}
            height={50}
          />
        </div>
      </div>
    </section>

    <section
      className="flex flex-col justify-center min-h-screen py-10 lg:py-0 text-start"
      id="portfolio"
    >
      <h1>
        Portfolio
        <span className="line"></span>
      </h1>

      <div
        className="items-center mt-10 lg:inline-flex lg:justify-center"
        id="gridCont"
      >
        <GridPortfolio />
      </div>
    </section>

    <section
      id="contact"
      className="flex flex-col items-center justify-center min-h-screen py-10 space-y-6 text-center lg:py-0"
    >
      <h1 className="text-3xl">Contact</h1>
      <p className="max-w-3xl text-center">
        Currently I&apos;m looking for any new opportunities. My inbox is always
        open. Feel free to contact me to discuss a freelance job, employment at
        a company, or just to chat 😅
      </p>

      <div>
        <LinksSocial className="fixed flex items-center justify-center w-12 h-12 text-white transition-all duration-200 rounded-full bottom-6 right-6 bg-main-color hover:bg-shadow-main-color" />
      </div>

      <button className="flex items-center justify-center px-4 py-2 text-white transition-all duration-200 rounded-md cursor-pointer bg-main-color hover:bg-shadow-main-color">
        <div className="flex items-center space-x-1">
          <FontAwesomeIcon icon={faEnvelope} style={{ color: "#ffffff" }} />
          <span>Contact</span>
        </div>
      </button>

      <div>
        <Image
          src="/logo-white.png"
          alt="Logo de Agustin Ciucani"
          width={140}
          height={50}
        />
        <a className="bt-up" id="Top">
          <ScrollToTopButton />
        </a>
      </div>
    </section>

    <footer>
      <small>
        &copy; {new Date().getFullYear()}{" "}
        <b data-text="copyright">Agustin Ciucani - All rights reserved.</b>
      </small>
    </footer>
  </Layout>
);

export default Index;
