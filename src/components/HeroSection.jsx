import Magnetic from "@/components/Magnetic";
import ProfileCard from "@/components/ProfileCard";
import { scrollToSectionByHash } from "@/utils/scroll-to-section";

/**
 * HeroSection - practice landing hero.
 *
 * Copy + one work CTA on the left; the profile card (photo, socials,
 * pointer spotlight, stack flip) on the right.
 */
const HeroSection = () => {
  const handleCtaClick = (e, href) => {
    e.preventDefault();
    scrollToSectionByHash(href);
  };

  return (
    <section
      className="relative w-full min-h-[100dvh] overflow-hidden"
      id="home"
    >
      <div className="site-shell grid min-h-[100dvh] grid-cols-1 content-start gap-10 pt-24 pb-16 md:gap-12 md:pb-20 lg:grid-cols-12 lg:content-center lg:items-center lg:gap-x-16">
        <div className="glass-card glass-live flex flex-col gap-6 p-6 md:p-8 lg:col-span-6 lg:p-10">
          <h1
            data-intro
            className="text-balance text-[clamp(2.25rem,4.4vw,3.4rem)] leading-[1.14]"
          >
            Turning Real Problems Into{" "}
            <span className="headline-accent">Working Software</span>
          </h1>

          <p data-intro className="max-w-md text-lg leading-relaxed text-white/75">
            Agustin Ciucani. Full-stack developer in Buenos Aires. I ship
            React and Next.js products people can actually use.
          </p>

          <div data-intro className="mt-2">
            <Magnetic>
              <a
                href="#portfolio"
                className="btn-primary focus-ring"
                onClick={(e) => handleCtaClick(e, "#portfolio")}
              >
                See work
              </a>
            </Magnetic>
          </div>
        </div>

        <div data-intro className="lg:col-span-5 lg:col-start-8">
          <ProfileCard />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
