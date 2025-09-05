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
        <h4>
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
              Hey! I&apos;m Agustin, a 23-year-old web developer from Buenos Aires,
              Argentina.
              <br />
              I started programming in 2020 and quickly realized it was
              something I wanted to dive deeper into.
              <br />
              Since then, I&apos;ve been building, learning, and experimenting —
              always looking for new ways to improve and create cool stuff
              online.
              <br />
              Web development combines two things I love: creativity and
              problem-solving.
              <br />
              I&apos;m especially into front-end work with HTML and CSS, but I&apos;m
              always exploring new tools and technologies to level up my skills.
              <br />
              When I&apos;m not coding, you&apos;ll probably find me listening to music or
              thinking about my next side project.
            </p>
            <p className="my-5">
              Here are a few technologies I&apos;ve been working with recently:
            </p>
            <ul className="inline-flex skills-list">
              <li>Html</li>
              <li>Tailwind CSS</li>
              <li>Javascript</li>
              <li>React</li>
            </ul>
          </div>
        </div>
        <div className="flex justify-center lg:ml-14">
          <Image
            className="mt-12 rounded-xl lg:mt-0 "
            src="/profilePic.jpg"
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
          <a href="mailto:agusyuk25@gmail.com">Contact</a>
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
