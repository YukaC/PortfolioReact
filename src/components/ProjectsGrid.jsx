import { memo } from "react";
import Image from "next/image";
import projectData from "@/data/projects";
import Icon from "@/components/Icon";

/** Tiny neutral blur for next/image placeholders (avoids CLS flash). */
const PROJECT_BLUR =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9">
      <rect width="100%" height="100%" fill="#2a2430"/>
    </svg>`,
  );

/**
 * ProjectCard - Individual project card with hover effects
 */
const ProjectCard = memo(
  ({ imgSrc, alt, title, description, tags, repoLink }) => {
    return (
      <article className="relative rounded-xl bg-surface border border-[var(--color-border)] overflow-hidden transition-all duration-500 hover:border-primary/40 hover:shadow-xl group h-full flex flex-col [content-visibility:auto] [contain-intrinsic-size:auto_28rem]">
        {/* Image Container */}
        <div className="aspect-video w-full overflow-hidden bg-bg-light shrink-0">
          <Image
            src={imgSrc}
            alt={alt}
            width={600}
            height={340}
            quality={75}
            sizes="(max-width: 768px) 100vw, 50vw"
            placeholder="blur"
            blurDataURL={PROJECT_BLUR}
            className="w-full aspect-video object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
          />
        </div>

        {/* Content */}
        <div className="p-8 flex-1 flex flex-col">
          {/* Tags */}
          <div
            className="flex gap-2 mb-4 flex-wrap"
            role="list"
            aria-label="Technologies used"
          >
            {tags && tags.length > 0
              ? tags.map((tag, index) => (
                  <span
                    key={tag}
                    role="listitem"
                    className={
                      index === 0
                        ? "inline-block px-3 py-1 text-xs font-semibold rounded bg-primary/20 text-[#d4b8e8] border border-primary/20"
                        : "inline-block px-3 py-1 text-xs font-semibold rounded bg-secondary/10 text-text-muted"
                    }
                  >
                    {tag}
                  </span>
                ))
              : null}
          </div>

          {/* Title */}
          <h3 className="text-2xl font-heading font-bold mb-2 group-hover:text-amber-glow transition-colors duration-300">
            {title}
          </h3>

          {/* Description */}
          <p className="text-text-muted mb-6 line-clamp-2 leading-relaxed">
            {description}
          </p>

          {/* Link */}
          <a
            href={repoLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-bold text-primary hover:text-amber-glow transition-all duration-300 group/link mt-auto focus-ring rounded"
          >
            View Project
            <Icon
              name="arrow_forward"
              size={16}
              className="ml-1 group-hover/link:translate-x-1 transition-transform"
            />
          </a>
        </div>
      </article>
    );
  },
);

ProjectCard.displayName = "ProjectCard";

/**
 * ProjectsGrid - Grid layout for all projects
 */
const ProjectsGrid = () => {
  return (
    <section
      className="w-full max-w-container px-6 py-24 [content-visibility:auto] [contain-intrinsic-size:auto_40rem]"
      id="portfolio"
    >
      {/* Section Header */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
        <div>
          <h2 className="font-heading font-bold text-4xl mb-2">
            Selected Works
          </h2>
          <p className="text-text-muted">
            A curation of my recent digital projects.
          </p>
        </div>
        <a
          href="https://github.com/YukaC"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-bold flex items-center gap-1 hover:gap-3 hover:text-amber-glow transition-all duration-300 underline decoration-secondary/30 underline-offset-4 hover:decoration-amber-glow focus-ring rounded"
        >
          Explore GitHub
          <Icon name="arrow_forward" size={16} />
        </a>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {projectData.map((project) => (
          <div key={project.title} className="h-full">
            <ProjectCard {...project} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProjectsGrid;
