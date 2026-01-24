import Image from "next/image";
import projectData from "./projectData";

/**
 * ProjectCard - Individual project card with hover effects
 */
const ProjectCard = ({ imgSrc, alt, title, description, tags, repoLink }) => {
  return (
    <article className="projectCard group h-full flex flex-col">
      {/* Image Container */}
      <div className="aspect-video w-full overflow-hidden bg-bg-light shrink-0">
        <Image
          src={imgSrc}
          alt={alt}
          width={600}
          height={340}
          className="projectCardImage"
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
          {tags?.map((tag, index) => (
            <span
              key={tag}
              role="listitem"
              className={index === 0 ? "techTag" : "techTag techTagSecondary"}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h3 className="text-2xl font-heading font-bold mb-2 group-hover:text-amber-glow transition-colors">
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
          className="inline-flex items-center text-sm font-bold text-primary/80 hover:text-[#ffbf00] transition-all group/link mt-auto"
          aria-label={`View ${title} project on GitHub`}
        >
          View Project
          <span
            className="material-symbols-outlined ml-1 text-xs group-hover/link:translate-x-1 transition-transform"
            aria-hidden="true"
          >
            arrow_forward
          </span>
        </a>
      </div>
    </article>
  );
};

/**
 * ProjectsGrid - Grid layout for all projects
 */
const ProjectsGrid = () => {
  return (
    <section className="w-full max-w-container px-6 py-24" id="portfolio">
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
          className="text-primary font-bold flex items-center gap-1 hover:gap-3 hover:text-[#ffbf00] transition-all underline decoration-secondary/30 underline-offset-4 hover:decoration-[#ffbf00]"
        >
          Explore GitHub
          <span
            className="material-symbols-outlined text-sm"
            aria-hidden="true"
          >
            arrow_forward
          </span>
        </a>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
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
