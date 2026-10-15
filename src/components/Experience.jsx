import { EDUCATION, SKILLS } from "@/data/constants";
import Reveal from "@/components/Reveal";

const Experience = () => (
  <section
    className="section-rule section-y w-full"
    id="about"
    aria-labelledby="about-heading"
  >
    <div className="site-shell grid grid-cols-1 gap-20 lg:grid-cols-12 lg:gap-16">
      <Reveal className="copy-veil flex flex-col gap-8 lg:col-span-5">
        <h2 id="about-heading">How I like to work</h2>
        <p className="max-w-md text-base leading-8 text-fog">
          I take on interfaces, dashboards, PWAs, and full-stack product work
          in React and Next.js. Accessible, responsive, and safe to click.
        </p>
        <p className="max-w-md text-base leading-8 text-paper/90">
          Production work in React, Next.js, and Tailwind.
        </p>
        <ul
          className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm leading-7 text-fog"
          aria-label="Skills"
        >
          {SKILLS.map((skill) => (
            <li key={skill.name}>{skill.name}</li>
          ))}
        </ul>
        <p className="max-w-md text-sm leading-7 text-fog">
          Off the clock I listen to music, tinker with a Ford Fiesta 95, and
          play guitar.
        </p>
      </Reveal>

      <Reveal className="copy-veil lg:col-span-6 lg:col-start-7" delayMs={80}>
        <h2 className="mb-8">Education</h2>
        <ol className="space-y-8" aria-label="Education timeline">
          {EDUCATION.map((item) => (
            <li key={item.title} className="item-rule pt-6">
              <p className="mb-2 text-sm text-fog">{item.period}</p>
              <h3 className="font-heading text-lg md:text-xl">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ice">{item.company}</p>
              <p className="mt-3 max-w-md text-sm leading-7 text-fog">
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
