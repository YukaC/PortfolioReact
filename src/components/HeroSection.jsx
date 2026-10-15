import Magnetic from "@/components/Magnetic";
import { scrollToSectionByHash } from "@/utils/scroll-to-section";

const HeroSection = () => {
  const handleCtaClick = (e, href) => {
    e.preventDefault();
    scrollToSectionByHash(href);
  };

  return (
    <section
      className="relative flex min-h-[100dvh] w-full flex-col justify-center pt-20 pb-16 md:pt-24 md:pb-24"
      id="home"
      aria-labelledby="home-heading"
    >
      <div className="site-shell">
        <div className="copy-veil">
          <h1
            id="home-heading"
            data-intro="hero"
            className="max-w-[14ch] leading-[1.1] pb-1"
          >
            Crafting{" "}
            <span className="italic text-ice">smooth</span> digital
            compositions.
          </h1>

          <p
            data-intro="hero"
            className="mt-8 max-w-xl text-base leading-8 text-fog md:text-lg"
          >
            Agustin Ciucani is a full-stack developer in Buenos Aires,
            Argentina. React and Tailwind, focused on interfaces that feel
            finished.
          </p>
        </div>

        <div data-intro="hero" className="mt-10">
          <Magnetic>
            <a
              href="#portfolio"
              className="btn-primary focus-ring"
              onClick={(e) => handleCtaClick(e, "#portfolio")}
            >
              View work
            </a>
          </Magnetic>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
