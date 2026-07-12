/**
 * Contact - CTA section with mailto link
 * Bebop-style illustration kept inline (not a generic Icon glyph).
 */
const Contact = () => (
  <section
    id="contact"
    className="w-full max-w-[900px] px-6 py-24 lg:py-32 text-center [content-visibility:auto] [contain-intrinsic-size:auto_24rem]"
  >
    <h2 className="font-heading font-bold text-4xl sm:text-5xl mb-6">
      Ready for a late-night session?
    </h2>

    <p className="text-lg text-text-muted mb-10 max-w-2xl mx-auto">
      I’m seeking new opportunities to work on exciting projects. Whether
      it&apos;s freelance or a full-time role, let&apos;s build something amazing
      together!
    </p>

    <a
      href="mailto:agusyuk25@gmail.com"
      className="inline-flex items-center justify-center gap-2 text-lg px-8 py-4 bg-primary text-white font-bold rounded transition-all duration-300 hover:bg-amber-glow hover:text-[#19161c] hover:-translate-y-0.5 shadow-xl shadow-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main"
    >
      <svg
        viewBox="0 0 100 100"
        className="w-8 h-8"
        fill="currentColor"
        aria-hidden="true"
      >
        <g>
          <polygon points="77.1,53.3 64.8,55.4 72,67.4 65.2,72.4 55.5,64 41.3,40 55.5,19.6 43.9,9.3 18.8,21.5 20.8,30.5    43.6,17.1 45.5,20.7 26.9,36.1 28.8,41.8 34.8,42.3 37.9,53.7 36.5,54.8 33.9,56.8 35.6,62 37.3,61.4 46.6,66 45.3,77.1 41.5,80.8    42.6,83.1 46.1,83.8 53.4,79 62.4,82.5 64.1,86.2 77.3,88 95.5,76.9 90.1,44.5  " />
          <path d="M79.7,25.3l-20.6,7.5l-9.7,11.3l5.3,8.4l7.5-1.4l15.1-2.4l12.3-8.2l6.5-4.2l-0.4-10.1L79.7,25.3z    M89.1,33.8l-9.9,6.6L69,44.1l-9,1.3l-2.5-1.8l10-9.2l12.7-3.3l9-0.5L89.1,33.8z" />
          <polygon points="15.1,20.7 4,29.1 5.5,32.7 18.7,33.6  " />
          <path d="M35,52.8l-2.5-7.9l-2.8-0.5l-5.6-1l-6.5,5.7l2.5,6.7l6.6,3.3l6.3-4.8L35,52.8z M26.1,54.9l-4.8-2.2l0.5-2.8   l3.8-2.5l3.8,3.3L26.1,54.9z" />
          <path d="M43.6,67l-6.4-3l-0.8,0.3l-6.1,2.1L28.8,77l7.2,3.8l4.6-3.4l2.2-1.6L43.6,67z M38.9,72l-0.5,2.2l-5,1.2   l-0.6-5.5l4.8-1.9l0.1,0l1.6,2.4L38.9,72z" />
          <path d="M61,84.7l-6.6-3.3l-3.7,2.9l-4.5,3.5l2.5,7.9l8.4,1.5l6.5-5.7l-2.1-5.6L61,84.7z M59,90.6l-3.8,2.5   l-3.8-3.3l3.3-4.3l4.8,2.2L59,90.6z" />
        </g>
      </svg>
      Let&apos;s Jam
    </a>
  </section>
);

export default Contact;
