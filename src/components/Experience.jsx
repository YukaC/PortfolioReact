import { EDUCATION } from "@/data/constants";

/**
 * Experience - About section with timeline
 */
const Experience = () => {
  return (
    <section
      className="w-full max-w-container px-6 py-24 border-t border-(--color-border)"
      id="experience"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
        {/* Left Column - About */}
        <div className="lg:col-span-5 flex flex-col gap-6" id="about">
          <h2 className="font-heading font-bold text-3xl">
            What coding means to me
          </h2>

          <p className="text-text-muted leading-relaxed">
            It combines two things I love: creativity and problem-solving. I’m
            passionate about building web experiences that not only work
            seamlessly but also feel intuitive. When I’m not coding, you’ll
            likely find me listening to music or brainstorming my next project.
          </p>

          <p className="text-text-muted leading-relaxed">
            When I&apos;m not coding, I&apos;m probably fixing my Ford Fiesta
            &apos;95 or playing Guitar.
          </p>

          {/* Learning Goal Box */}
          <div className="learningGoal mt-4">
            <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined" aria-hidden="true">
                auto_stories
              </span>
              Currently Learning
            </h4>
            <p className="text-sm text-text-muted italic">
              &quot;Currently deepening my knowledge of advanced React patterns
              and improving my responsive design skills with Tailwind CSS.&quot;
            </p>
          </div>
        </div>

        {/* Right Column - Timeline */}
        <div className="lg:col-span-7">
          <h2 className="font-heading font-bold text-3xl mb-8">Education</h2>

          <div
            className="relative border-l border-secondary/20 ml-3 space-y-12 pb-4"
            role="list"
            aria-label="Education timeline"
          >
            {EDUCATION.map((item) => (
              <div
                key={item.title}
                className="relative pl-10 group"
                role="listitem"
              >
                {/* Timeline Dot */}
                <div
                  className={`timelineDot ${
                    item.isCurrent ? "timelineDotActive" : ""
                  } group-hover:bg-amber-glow`}
                  aria-hidden="true"
                />

                {/* Period */}
                <span
                  className={`text-xs font-bold uppercase tracking-wider mb-1 block ${
                    item.isCurrent ? "text-primary" : "text-text-muted"
                  }`}
                >
                  {item.period}
                </span>

                {/* Title */}
                <h3 className="text-xl font-bold font-heading">{item.title}</h3>

                {/* Company */}
                <p className="text-sm text-primary/60 mb-2">{item.company}</p>

                {/* Description */}
                <p className="text-text-muted text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Experience;
