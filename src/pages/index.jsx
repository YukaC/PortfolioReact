import Layout from "../../components/layout";
import GridItems from "../../components/gridItems";
import LinksSocial from "../../components/socialLinks";
import Image from "next/image";

const Index = () => (
  <Layout title="Agustin Ciucani | Portfolio">
    <div className="flex flex-col items-center py-14">
      <h1>Hi, I&apos;m Agustin Ciucani</h1>
      <h3>FrontEnd Developer</h3>
      <h4 className="my-8 text-base text-center">
        This is my official portfolio website to showcase all my works related
        to web development
      </h4>
      <h4>Download my Resume here:</h4>
      <button className="flex items-center px-4 py-2 text-white transition-all duration-200 rounded-md cursor-pointer bg-main-color hover:bg-shadow-main-color">Download</button>
    </div>

    <section className="flex flex-col items-center text-center">
      <h1>About Me</h1>
      <h4>
        Hello! My name is Agustin, a 20 years old programmer who currently
        lives in Buenos Aires, Argentina and enjoys creating things on the
        internet... I&apos;m interested on learning and getting into the world
        of programming. Besides music, coding is my passion and hobby. Is
        because of that, that I&apos;m always interested on learning and
        getting into the coding world. I&apos;m always looking for learn and
        incorporate new technologies to my projects. My interest in web
        development started in 2020 when I get graduated from high school
        where I learned programming and since then, I have learned a lot about
        HTML and CSS!
      </h4>

      <Image
        className="rounded-xl"
        src="/profilePic.png"
        alt="ImgProfile"
        width={300}
        height={50}
      />

    </section>

    <div className="flex flex-col items-center">
      <h1>Portfolio</h1>
      <div className="gridCont">
        <div>
          <GridItems />
        </div>
      </div>
    </div>

    <footer className="flex flex-col items-center">

        <h1>Contact</h1>
        <h4>
          Currently i&apos;m looking for any new opportunities, my inbox is
          always open. Feel free to contact me and talk about a freelance job,
          or in a company, or just chat 😅
        </h4>



        <h1>Social</h1>
        <div>
          <LinksSocial />
        </div>

      <div className="inline-flex items-center">
        <Image
          className="rounded-xl"
          src="/logo-white.png"
          alt="Logo de Agustin Ciucani"
          width={140}
          height={50}
        />
        <a className="bt-up" id="Top">
          <i className="fa fa-arrow-circle-up fa-3x"></i>Top
        </a>
      </div>

      <div className="grupo-2">
        <small>
          &copy; {new Date().getFullYear()}{" "}
          <b data-text="copyright">Agustin Ciucani - All rights reserved.</b>
        </small>
      </div>
    </footer>
  </Layout>
);

export default Index;
