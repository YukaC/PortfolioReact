import Magnetic from "@/components/Magnetic";
import Reveal from "@/components/Reveal";
import Icon from "@/components/Icon";
import { CONTACT_EMAIL } from "@/data/constants";

const Contact = () => (
  <Reveal
    as="section"
    id="contact"
    className="w-full"
    aria-labelledby="contact-heading"
  >
    <div className="site-shell section-y">
      <div className="glass-panel grid grid-cols-1 items-center gap-6 p-6 md:p-8 lg:grid-cols-12 lg:gap-8 lg:p-10">
        <div className="lg:col-span-6">
          <h2 id="contact-heading" className="max-w-[14ch]">
            Tell me what you are building.
          </h2>
          <p className="mt-5 max-w-md text-base leading-8 text-fog">
            Freelance or full-time. Send the problem, the stack, and the
            timeline. I reply with next steps.
          </p>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <Magnetic className="w-full">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="focus-ring flex max-w-full items-center gap-2 rounded-sm font-heading text-[clamp(1.15rem,3.4vw,1.85rem)] font-semibold leading-tight tracking-tight text-paper hover:text-ice"
            >
              <span className="min-w-0 break-all">{CONTACT_EMAIL}</span>
              <Icon name="arrow_forward" size={20} className="shrink-0 text-ice" />
            </a>
          </Magnetic>
        </div>
      </div>
    </div>
  </Reveal>
);

export default Contact;
