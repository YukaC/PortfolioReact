/**
 * English copy: the source dictionary.
 *
 * Every other language is merged on top of this one, so a key missing from a
 * translation deliberately falls back to the English string instead of showing
 * nothing.
 *
 * Voice: full-stack React/Next positioning. Short sentences, the verb first,
 * no adjective that could not be measured. Technical artifacts stay English.
 */
const en = {
  meta: {
    title: "Agustín Ciucani — Full-stack developer in Buenos Aires",
    description:
      "Full-stack developer in Buenos Aires. I take React and Next.js products from dashboard to deploy: PWAs, dashboards, and the APIs behind them.",
    imageAlt:
      "Portrait of Agustín Ciucani, full-stack developer in Buenos Aires",
  },
  a11y: {
    skipToContent: "Skip to content",
    newTab: " (opens in a new tab)",
    bebopDialog: "Cowboy Bebop easter egg animation",
    bebopSkip: "Skip",
  },
  nav: {
    main: "Main navigation",
    home: "Go to the home section",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    contact: "Contact",
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
    status: "Open to freelance and full-time",
    title: "I build your software, end to end",
    accent: "software",
    lead:
      "I am Agustín Ciucani, a full-stack developer in Buenos Aires. I build products mostly with React and Next.js, but I adapt to whatever stack the job needs. From the interface to the server.",
    seeWork: "See projects",
    getInTouch: "Let's talk",
    stackLabel: "Stack",
  },
  marquee: {
    traits: ["Dashboards", "APIs", "PWAs", "React", "Next.js", "Postgres"],
  },
  work: {
    eyebrow: "Selected work",
    title: "Working demos, not mockups",
    accent: "mockups",
    lead: "Dashboards, apps, and tools. Every one links to its source.",
    demoNotice:
      "Every \"View demo\" link opens a demo build: a working sample of the project, not its production deployment.",
    filterLabel: "Filter projects",
    filters: {
      all: "All",
      react: "React",
      python: "Python",
      systems: "Systems",
      pwa: "PWA",
    },
    empty: "Nothing under that filter.",
    viewDemo: "View demo",
    github: "GitHub",
    githubProfile: "GitHub profile",
    repoAria: "{title} on GitHub",
    demoAria: "{title} — view demo",
  },
  about: {
    eyebrow: "About",
    title: "How I work: one person, the whole cycle",
    accent: "cycle",
    statement:
      "I take interfaces, dashboards, and PWAs from brief to deploy in React and Next.js: front, API, and the server they run on.",
    portraitAlt: "{name} portrait",
    role: "Full-stack developer",
    socialAria: "{name} (opens in a new tab)",
    workTitle: "How I work",
    introStrong: "Production work in React, Next.js, and Tailwind.",
    introRest: "Accessible, responsive, and predictable where predictable is right.",
    offClock: "Off the clock: music, a 1995 Ford Fiesta, and a guitar.",
    skillsLabel: "Tools",
    source: "See the source",
    educationTitle: "Education",
    education: [
      {
        title: "University Technician in Programming Technologies",
        company: "Universidad Provincial del Sudoeste (UPSO)",
        description:
          "Software development, databases, agile methods, and programming practice.",
      },
      {
        title: "Personal and Professional Computer Technician",
        company: "EEST N°1 / Instituto San José",
        description:
          "Programming fundamentals, networking, hardware, and technical support.",
      },
    ],
  },
  contact: {
    eyebrow: "Contact",
    title: "Send the problem. I send the plan.",
    accent: "plan.",
    lead:
      "Freelance or full-time. The goal, the stack, and the deadline are enough to start.",
    copy: "Copy email",
    copied: "Copied ✓",
    manual: "Select it above",
    copiedAnnouncement: "Email copied to the clipboard",
    manualAnnouncement: "Copy blocked. Select the email above.",
    mailSubject: "Project inquiry",
  },
  footer: {
    tagline: "I think it's time to blow this scene.",
    triggerTitle: "Hold for 1.5 seconds...",
    triggerAria: "Hold for 1.5 seconds to play the easter egg",
    socialLabel: "Social links",
    copyright: "© {year} Agustín Ciucani",
  },
};

export default en;
