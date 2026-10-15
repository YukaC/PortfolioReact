import Magnetic from "@/components/Magnetic";
import Reveal from "@/components/Reveal";
import Icon from "@/components/Icon";
import { CONTACT_EMAIL } from "@/data/constants";

const Contact = () => (
  <Reveal
    as="section"
    id="contact"
    className="section-rule w-full"
    aria-labelledby="contact-heading"
  >
    <div className="site-shell grid grid-cols-1 items-start gap-8 py-16 md:gap-12 md:py-24 lg:grid-cols-12 lg:py-28">
      <div className="copy-veil lg:col-span-6">
        <h2 id="contact-heading" className="max-w-[14ch]">
          Tell me what you are building.
        </h2>
        <p className="mt-5 max-w-md text-base leading-8 text-fog">
          Freelance or full-time. Send the problem, the stack, and the
          timeline. I reply with next steps.
        </p>
      </div>

      <div className="copy-veil lg:col-span-5 lg:col-start-8 lg:pt-2">
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
  </Reveal>
);

export default Contact;
