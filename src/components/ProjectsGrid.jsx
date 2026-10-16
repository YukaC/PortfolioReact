import { memo, useEffect, useRef } from "react";
import Image from "next/image";
import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";
import { MAX_PINNED_PROJECTS, PINNED_FALLBACK } from "@/data/projects";
import { DURATION, EASE } from "@/motion/config";
import { prefersReducedMotion } from "@/motion/prefersReducedMotion";
import { gsap, registerMotion } from "@/motion/register";
import { willChangeVars } from "@/motion/willChange";

const PROJECT_BLUR =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9">
      <rect width="100%" height="100%" fill="#131d33"/>
    </svg>`,
  );

function splitFeaturedProjects(projects) {
  const featuredProject =
    projects.find((project) => project.isFeatured) ?? projects[0] ?? null;
  const remainingProjects = projects.filter(
    (project) => project.name !== featuredProject?.name,
  );
  return { featuredProject, remainingProjects };
}

const ProjectMedia = memo(({ imgSrc, alt, sizes, stretch = false }) => {
  // `stretch` lets the featured card's media fill a column the copy column
  // sizes; tiles keep the 16:9 frame and take it everywhere.
  const frame = `relative overflow-hidden bg-deep ${
    stretch ? "aspect-video lg:aspect-auto lg:h-full" : "aspect-video"
  }`;

  if (imgSrc) {
    return (
      <div className={frame}>
        <div data-card-media className="absolute inset-0 origin-center">
          <Image
            src={imgSrc}
            alt={alt}
            fill
            quality={70}
            loading="lazy"
            sizes={sizes}
            placeholder="blur"
            blurDataURL={PROJECT_BLUR}
            className="scale-110 object-cover"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`${frame} bg-mist/80`} aria-hidden="true">
      <div data-card-media className="absolute inset-0 origin-center" />
    </div>
  );
});

ProjectMedia.displayName = "ProjectMedia";

function useProjectMediaMotion(cardRef) {
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;

    registerMotion();
    const media = card.querySelector("[data-card-media]");
    if (!media) return undefined;

    const ctx = gsap.context(() => {
      if (!prefersReducedMotion()) {
        gsap.fromTo(
          media,
          { yPercent: -6 },
          {
            yPercent: 6,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      }
    }, card);

    const pressIn = () => {
      if (prefersReducedMotion()) return;
      gsap.to(
        card,
        willChangeVars({
          scale: 0.98,
          duration: DURATION.uiFast,
          ease: EASE.medium,
          overwrite: "auto",
        }),
      );
    };

    const pressOut = () => {
      gsap.to(
        card,
        willChangeVars({
          scale: 1,
          duration: DURATION.ui,
          ease: EASE.medium,
          overwrite: "auto",
        }),
      );
    };

    card.addEventListener("pointerdown", pressIn);
    card.addEventListener("pointerup", pressOut);
    card.addEventListener("pointercancel", pressOut);
    card.addEventListener("pointerleave", pressOut);

    return () => {
      card.removeEventListener("pointerdown", pressIn);
      card.removeEventListener("pointerup", pressOut);
      card.removeEventListener("pointercancel", pressOut);
      card.removeEventListener("pointerleave", pressOut);
      gsap.killTweensOf(card);
      ctx.revert();
    };
  }, [cardRef]);
}

const ProjectCopy = ({ title, problem, outcome, description, tags }) => (
  <>
    {problem ? (
      <p className="mb-3 text-sm leading-6 text-fog">{problem}</p>
    ) : tags && tags.length > 0 ? (
      <p className="mb-3 text-sm leading-6 text-fog">{tags.join(" · ")}</p>
    ) : null}

    <h3 className="font-heading text-2xl font-semibold md:text-3xl">{title}</h3>

    <p className="mt-4 max-w-md text-base leading-8 text-fog">
      {outcome ?? description}
    </p>

    {problem && tags && tags.length > 0 ? (
      <p className="mt-4 text-sm leading-6 text-ice">{tags.join(" · ")}</p>
    ) : null}

    <span className="mt-6 inline-flex items-center text-sm text-ice">
      View repository
      <Icon
        name="arrow_forward"
        size={16}
        className="ml-1 transition-transform duration-200 ease-out group-hover:translate-x-1"
        aria-hidden="true"
      />
    </span>
  </>
);

const FeaturedProjectCard = memo((project) => {
  const cardRef = useRef(null);
  useProjectMediaMotion(cardRef);

  return (
    <a
      ref={cardRef}
      href={project.repoLink}
      target="_blank"
      rel="noopener noreferrer"
      className="group glass-panel glass-live focus-ring grid grid-cols-1 overflow-hidden lg:grid-cols-12"
      aria-label={`${project.title}, GitHub repository, opens in a new tab`}
    >
      <div className="lg:col-span-7">
        <ProjectMedia
          imgSrc={project.imgSrc}
          alt=""
          sizes="(max-width: 1024px) 100vw, 58vw"
          stretch
        />
      </div>
      <div className="flex flex-col justify-center p-6 md:p-8 lg:col-span-5 lg:p-10">
        <ProjectCopy {...project} />
      </div>
    </a>
  );
});

FeaturedProjectCard.displayName = "FeaturedProjectCard";

const ProjectTile = memo((project) => {
  const cardRef = useRef(null);
  useProjectMediaMotion(cardRef);

  return (
    <a
      ref={cardRef}
      href={project.repoLink}
      target="_blank"
      rel="noopener noreferrer"
      className="group glass-tile glass-live focus-ring flex h-full flex-col overflow-hidden"
      aria-label={`${project.title}, GitHub repository, opens in a new tab`}
    >
      <ProjectMedia
        imgSrc={project.imgSrc}
        alt=""
        sizes="(max-width: 768px) 100vw, 42vw"
      />
      <div className="flex flex-col p-5 md:p-6">
        <ProjectCopy {...project} />
      </div>
    </a>
  );
});

ProjectTile.displayName = "ProjectTile";

const ProjectsGrid = ({ projects = PINNED_FALLBACK }) => {
  const pinnedProjects = projects.slice(0, MAX_PINNED_PROJECTS);
  const { featuredProject, remainingProjects } =
    splitFeaturedProjects(pinnedProjects);

  return (
    <section
      className="section-y w-full"
      id="portfolio"
      aria-labelledby="work-heading"
    >
      <div className="site-shell">
        <Reveal className="copy-veil mb-14 max-w-xl md:mb-20">
          <h2 id="work-heading">Selected work</h2>
          <p className="mt-4 text-base leading-8 text-fog">
            Interfaces, dashboards, and tools shipped for real use. Source
            for each.
          </p>
          <a
            href="https://github.com/YukaC"
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline focus-ring mt-5 inline-flex items-center text-sm text-fog hover:text-paper"
          >
            GitHub profile
            <span className="sr-only"> (opens in a new tab)</span>
            <Icon
              name="arrow_forward"
              size={16}
              className="ml-1"
              aria-hidden="true"
            />
          </a>
        </Reveal>

        {featuredProject ? (
          <div className="flex flex-col gap-16 md:gap-20">
            <Reveal>
              <FeaturedProjectCard {...featuredProject} />
            </Reveal>

            {remainingProjects.length > 0 ? (
              <ul className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-x-10 md:gap-y-16">
                {remainingProjects.map((project) => (
                  <li
                    key={project.name ?? project.repoLink}
                    className="work-card"
                  >
                    <Reveal>
                      <ProjectTile {...project} />
                    </Reveal>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="text-base leading-8 text-fog">
            Projects will show up here soon.
          </p>
        )}
      </div>
    </section>
  );
};

export default ProjectsGrid;
