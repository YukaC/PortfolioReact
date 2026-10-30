/**
 * English copy: the source dictionary.
 *
 * Every other language is merged on top of this one, so a key missing from a
 * translation deliberately falls back to the English string instead of showing
 * nothing.
 */
const en = {
  meta: {
    title: "Agustin Ciucani, Full-stack Developer in Buenos Aires",
    description:
      "Agustin Ciucani is a full-stack developer in Buenos Aires, Argentina. He builds React and Next.js products with accessible UI and motion that settles.",
    imageAlt:
      "Portrait of Agustin Ciucani, full-stack developer in Buenos Aires",
  },
  a11y: {
    skipToContent: "Skip to content",
    newTab: " (opens in a new tab)",
    bebopDialog: "Cowboy Bebop Easter Egg Animation",
    bebopSkip: "Skip",
  },
  nav: {
    main: "Main navigation",
    home: "Go to home section",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    contact: "Get in Touch",
    links: {
      portfolio: "Projects",
      about: "About",
    },
  },
  switcher: {
    label: "Language",
    current: "Current language: {language}",
  },
  hero: {
    status: "Open to freelance & full-time",
    title: "Turning real problems into working software",
    accent: "working",
    lead:
      "Agustin Ciucani. Full-stack developer in Buenos Aires. I ship React and Next.js products people can actually use.",
    seeWork: "See work",
    getInTouch: "Get in touch",
    stackLabel: "Stack",
  },
  marquee: {
    traits: [
      "Interfaces",
      "Dashboards",
      "PWAs",
      "Full-stack",
      "Accessible",
      "Responsive",
    ],
  },
  work: {
    eyebrow: "Selected work",
    title: "Shipped for real use",
    accent: "real",
    lead: "Interfaces, dashboards, and tools. Source for each.",
    filterLabel: "Filter projects",
    filters: {
      all: "All",
      react: "React",
      python: "Python",
      systems: "Systems",
      pwa: "PWA",
    },
    empty: "Nothing here yet.",
    viewDemo: "View demo",
    github: "GitHub",
    githubProfile: "GitHub profile",
    repoAria: "{title} on GitHub",
    demoAria: "{title} — view demo",
  },
  about: {
    eyebrow: "About",
    title: "How I work, and where I learned",
    accent: "learned",
    statement:
      "I take on interfaces, dashboards, PWAs, and full-stack product work in React and Next.js. Accessible, responsive, and safe to click.",
    portraitAlt: "{name} portrait",
    role: "Full-stack developer",
    socialAria: "{name} (opens in a new tab)",
    workTitle: "How I like to work",
    introStrong: "Production work in React, Next.js, and Tailwind.",
    introRest: "Accessible, responsive, and safe to click.",
    offClock:
      "Off the clock I listen to music, tinker with a Ford Fiesta 95, and play guitar.",
    skillsLabel: "Skills",
    source: "See the source",
    educationTitle: "Education",
    education: [
      {
        title: "University Technician in Programming Technologies",
        company: "Universidad Provincial del Sudoeste (UPSO)",
        description:
          "Training in software development, databases, agile methodologies, and programming best practices.",
      },
      {
        title: "Personal and Professional Computer Technician",
        company: "EEST N°1 / Instituto San José",
        description:
          "Fundamentals of programming, networking, hardware, and technical support.",
      },
    ],
  },
  contact: {
    eyebrow: "Contact",
    title: "Tell me what you are building.",
    accent: "building.",
    lead:
      "Freelance or full-time. Send the problem, the stack, and the timeline. I reply with next steps.",
    copy: "Copy address",
    copied: "Copied ✓",
    manual: "Select it above",
    copiedAnnouncement: "Address copied to the clipboard",
    manualAnnouncement: "Copy blocked. Select the address above.",
    mailSubject: "Project inquiry",
  },
  footer: {
    tagline: "I think it's time to blow this scene.",
    triggerTitle: "Hold for 1.5 seconds...",
    triggerAria: "Hold for 1.5 seconds to play the easter egg",
    socialLabel: "Social media links",
    copyright: "© {year} Agustin Ciucani",
  },
};

export default en;
