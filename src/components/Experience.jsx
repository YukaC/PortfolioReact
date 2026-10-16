import { EDUCATION, SKILLS } from "@/data/constants";
import Reveal from "@/components/Reveal";

const Experience = () => (
  <section
    className="section-y w-full"
    id="about"
    aria-labelledby="about-heading"
  >
    <div className="site-shell grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-8">
      <Reveal className="glass-panel flex flex-col gap-8 p-6 md:p-8 lg:col-span-6 lg:p-10">
        <h2 id="about-heading">How I like to work</h2>
        <p className="max-w-md text-base leading-8 text-white/60">
          I take on interfaces, dashboards, PWAs, and full-stack product work
          in React and Next.js. Accessible, responsive, and safe to click.
        </p>
        <p className="max-w-md text-base leading-8 text-white/90">
          Production work in React, Next.js, and Tailwind.
        </p>
        <ul
          className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm leading-7 text-white/60"
          aria-label="Skills"
        >
          {SKILLS.map((skill) => (
            <li key={skill.name}>{skill.name}</li>
          ))}
        </ul>
        <p className="max-w-md text-sm leading-7 text-white/60">
          Off the clock I listen to music, tinker with a Ford Fiesta 95, and
          play guitar.
        </p>
      </Reveal>

      <Reveal
        className="glass-panel flex flex-col p-6 md:p-8 lg:col-span-6 lg:p-10"
        delayMs={80}
      >
        <h2 className="mb-8">Education</h2>
        <ol className="flex-1 space-y-8" aria-label="Education timeline">
          {EDUCATION.map((item) => (
            <li key={item.title} className="item-rule pt-6">
              <p className="mb-2 text-sm text-white/60">{item.period}</p>
              <h3 className="font-heading text-lg md:text-xl">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/70">{item.company}</p>
              <p className="mt-3 max-w-md text-sm leading-7 text-white/60">
                {item.description}
              </p>
            </li>
          ))}
        </ol>
      </Reveal>
    </div>
  </section>
);

export default Experience;
