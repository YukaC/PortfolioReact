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

const ProjectMedia = memo(({ imgSrc, alt }) => {
  if (imgSrc) {
    return (
      <div className="overflow-hidden rounded-sm border border-mist/60 bg-deep">
        <div data-card-media className="origin-center">
          <Image
            src={imgSrc}
            alt={alt}
            width={1280}
            height={720}
            quality={70}
            loading="lazy"
            sizes="(max-width: 1024px) 100vw, 58vw"
            placeholder="blur"
            blurDataURL={PROJECT_BLUR}
            className="aspect-video w-full object-cover"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-sm border border-mist/60 bg-deep"
      aria-hidden="true"
    >
      <div data-card-media className="aspect-video w-full origin-center bg-mist/80" />
    </div>
  );
});

ProjectMedia.displayName = "ProjectMedia";

function useProjectCardMotion(cardRef) {
  useEffect(() => {
    const card = cardRef.current;
    if (!card || prefersReducedMotion()) return undefined;

    registerMotion();
    const media = card.querySelector("[data-card-media]");
    if (!media) return undefined;

    const canHover = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;

    const pressIn = () => {
      gsap.to(
        media,
        willChangeVars({
          scale: 1.03,
          duration: DURATION.uiSlow,
          ease: EASE.medium,
          overwrite: "auto",
        }),
      );
    };

    const pressOut = () => {
      gsap.to(
        media,
        willChangeVars({
          scale: 1,
          duration: DURATION.ui,
          ease: EASE.medium,
          overwrite: "auto",
        }),
      );
    };

    if (canHover) {
      card.addEventListener("pointerenter", pressIn);
      card.addEventListener("pointerleave", pressOut);
    }
    card.addEventListener("pointerdown", pressIn);
    card.addEventListener("pointerup", pressOut);
    card.addEventListener("pointercancel", pressOut);

    return () => {
      if (canHover) {
        card.removeEventListener("pointerenter", pressIn);
        card.removeEventListener("pointerleave", pressOut);
      }
      card.removeEventListener("pointerdown", pressIn);
      card.removeEventListener("pointerup", pressOut);
      card.removeEventListener("pointercancel", pressOut);
      gsap.killTweensOf(media);
    };
  }, [cardRef]);
}

const ProjectCard = memo(
  ({
    imgSrc,
    alt,
    title,
    description,
    tags,
    repoLink,
    isImageLeft = true,
  }) => {
    const cardRef = useRef(null);
    useProjectCardMotion(cardRef);

    const mediaPlacement = isImageLeft
      ? "order-1 lg:col-span-7 lg:col-start-1"
      : "order-1 lg:col-span-7 lg:col-start-6";
    const copyPlacement = isImageLeft
      ? "order-2 lg:col-span-5 lg:col-start-8"
      : "order-2 lg:col-span-5 lg:col-start-1 lg:row-start-1";

    return (
      <a
        ref={cardRef}
        href={repoLink}
        target="_blank"
        rel="noopener noreferrer"
        className="group focus-ring grid grid-cols-1 items-center gap-6 rounded-sm lg:grid-cols-12 lg:gap-x-12 xl:gap-x-16"
        aria-label={`${title}, GitHub repository, opens in a new tab`}
      >
        <div className={mediaPlacement}>
          <ProjectMedia imgSrc={imgSrc} alt="" />
        </div>

        <div className={`copy-veil flex flex-col justify-center ${copyPlacement}`}>
          {tags && tags.length > 0 ? (
            <p className="mb-3 text-sm leading-6 text-fog">{tags.join(" · ")}</p>
          ) : null}

          <h3 className="font-heading text-2xl font-semibold md:text-3xl">
            {title}
          </h3>

          <p className="mt-4 max-w-md text-base leading-8 text-fog">
            {description}
          </p>

          <span className="mt-6 inline-flex items-center text-sm text-ice">
            View repository
            <Icon
              name="arrow_forward"
              size={16}
              className="ml-1 transition-transform duration-200 ease-out group-hover:translate-x-1"
              aria-hidden="true"
            />
          </span>
        </div>
      </a>
    );
  },
);

ProjectCard.displayName = "ProjectCard";

const ProjectsGrid = ({ projects = PINNED_FALLBACK }) => {
  const pinnedProjects = projects.slice(0, MAX_PINNED_PROJECTS);

  return (
    <section
        className="section-rule section-y w-full"
      id="portfolio"
      aria-labelledby="work-heading"
    >
      <div className="site-shell">
        <Reveal className="copy-veil mb-14 max-w-xl md:mb-20">
          <h2 id="work-heading">Selected work</h2>
          <p className="mt-4 text-base leading-8 text-fog">
            Up to six pinned GitHub repositories, refreshed as the profile
            changes. Screenshots and source for each.
          </p>
          <a
            href="https://github.com/YukaC"
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline focus-ring mt-5 inline-flex items-center text-sm text-fog hover:text-paper"
          >
            GitHub profile
            <span className="sr-only"> (opens in a new tab)</span>
            <Icon name="arrow_forward" size={16} className="ml-1" aria-hidden="true" />
          </a>
        </Reveal>

        {pinnedProjects.length > 0 ? (
          <ol className="flex flex-col gap-16 md:gap-24">
            {pinnedProjects.map((project, index) => (
              <li key={project.name ?? project.repoLink} className="work-card">
                <Reveal>
                  <ProjectCard
                    {...project}
                    isImageLeft={index % 2 === 0}
                  />
                </Reveal>
              </li>
            ))}
          </ol>
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
