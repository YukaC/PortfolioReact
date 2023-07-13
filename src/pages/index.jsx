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
      className="flex flex-col justify-center min-h-screen py-10 space-y-6 md:py-0 text-start"
      id="home"
    >
      <div className="flex flex-col items-center mt-10 space-y-4 text-center md:justify-center">
      <h1>Hi, I&apos;m Agustin Ciucani</h1>
      <h3>FrontEnd Developer</h3>
      <h4 className="my-8 text-base">
        This is my official portfolio website to showcase all my works related
        to web development
      </h4>

      <h4>Download my Resume here:</h4>
      <DownloadButton/>
      </div>
    </section>

    <section
      className="flex flex-col justify-center min-h-screen py-10 space-y-6 md:py-0 text-start"
      id="about"
    >
      <div className="items-center mt-10 md:inline-flex md:justify-center">
        <div className="w-full md:w-1/2 md:text-lg">
          <h1>
            About Me
            <span className="line"></span>
          </h1>
          <div>
            <p className="max-w-5xl my-8">
              Hello! My name is Agustin, a 20 years old programmer who currently
              lives in Buenos Aires, Argentina and enjoys creating things on the
              internet... I&apos;m interested on learning and getting into the
              world of programming. Besides music, coding is my passion and
              hobby. Is because of that, that I&apos;m always interested on
              learning and getting into the coding world. I&apos;m always
              looking for learn and incorporate new technologies to my projects.
              My interest in web development started in 2020 when I get
              graduated from high school where I learned programming and since
              then, I have learned a lot about HTML and CSS!
            </p>
            <p className="my-5">
              Here are a few technologies I&apos;ve been working with recently:
            </p>

            <ul className="inline-flex skills-list">
              <li>JavaScript</li>
              <li>React</li>
              <li>Html</li>
              <li>Css</li>
            </ul>
          </div>
        </div>
        <div className="flex justify-center md:ml-14">
          <Image
            className="mt-12 rounded-xl md:mt-0 "
            src="/profilePic.png"
            alt="ImgProfile"
            width={300}
            height={50}
          />
        </div>
      </div>
    </section>

    <section
      className="flex flex-col justify-center min-h-screen py-10 md:py-0 text-start"
      id="portfolio"
    >
      <h1>
        Portfolio
        <span className="line"></span>
      </h1>

      <div className="items-center mt-10 md:inline-flex md:justify-center" id="gridCont">
        <GridPortfolio/>
      </div>
    </section>

    <section id="contact" className="flex flex-col items-center justify-center min-h-screen py-10 space-y-6 text-center md:py-0">
      <h1 className="text-3xl">Contact</h1>
      <p className="max-w-3xl text-center">
        Currently I'm looking for any new opportunities. My inbox is always
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
