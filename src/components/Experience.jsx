import { useEffect, useRef, useState } from "react";
import { EDUCATION } from "@/data/constants";
import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";

/**
 * Experience - About section with timeline
 */
const Experience = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef([]);

  useEffect(() => {
    const nodes = itemRefs.current.filter(Boolean);
    if (!nodes.length) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (!visible.length) return;

        const nextIndex = nodes.indexOf(visible[0].target);
        if (nextIndex >= 0) setActiveIndex(nextIndex);
      },
      {
        threshold: [0.25, 0.5, 0.75],
        rootMargin: "-25% 0px -40% 0px",
      },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className="w-full px-6 py-24 border-t border-[var(--color-border)]"
      id="experience"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
        <Reveal className="lg:col-span-5 flex flex-col gap-6" id="about">
          <h2 className="font-heading font-bold text-3xl">
            What coding means to me
          </h2>

          <p className="text-text-muted leading-relaxed">
            It combines two things I love: creativity and problem-solving. I&apos;m
            passionate about building web experiences that not only work
            seamlessly but also feel intuitive. When I&apos;m not coding,
            you&apos;ll likely find me listening to music, brainstorming my next
            project, fixing my Ford Fiesta &apos;95, or playing guitar.
          </p>

          <div className="learningGoal mt-4">
            <p className="font-bold text-primary mb-2 flex items-center gap-2">
              <Icon name="auto_stories" />
              Currently Learning
            </p>
            <p className="text-sm text-text-muted italic">
              &quot;Currently deepening my knowledge of advanced React patterns
              and improving my responsive design skills with Tailwind CSS.&quot;
            </p>
          </div>
        </Reveal>

        <Reveal className="lg:col-span-7" delayMs={120}>
          <h2 className="font-heading font-bold text-3xl mb-8">Education</h2>

          <div
            className="relative border-l border-secondary/20 ml-3 space-y-12 pb-4"
            role="list"
            aria-label="Education timeline"
          >
            {EDUCATION.map((item, index) => {
              const isActive = activeIndex === index;

              return (
                <div
                  key={item.title}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  className="relative pl-10 group"
                  role="listitem"
                >
                  <div
                    className={`timelineDot ${isActive ? "timelineDotActive" : ""} group-hover:bg-amber-glow`}
                    aria-hidden="true"
                  />

                  <span
                    className={`text-xs font-bold uppercase tracking-wider mb-1 block transition-colors duration-300 ${
                      isActive ? "text-primary" : "text-text-muted"
                    }`}
                  >
                    {item.period}
                  </span>

                  <h3 className="text-xl font-bold font-heading">{item.title}</h3>

                  <p className="text-sm text-primary/60 mb-2">{item.company}</p>

                  <p className="text-text-muted text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default Experience;
