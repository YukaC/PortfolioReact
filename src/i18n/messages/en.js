/**
 * English copy: the base dictionary every other locale merges over.
 *
 * It is a translation of `es.js`, which is the source of truth for the copy.
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
    // A translation of `es.js`, which carries the brief's strings verbatim (S7).
    // `ogTitle`/`ogDescription` are the social card's shorter pair.
    title: "Agustín Ciucani · Full-stack developer in Buenos Aires",
    description:
      "Full-stack developer in Buenos Aires. Web apps, dashboards and PWAs with React, Next.js, Node and Python. Available for freelance and full-time.",
    ogTitle: "Agustín Ciucani · Full-stack developer",
    ogDescription:
      "I build your software, end to end. React, Next.js, Node and Python.",
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
    status: "Available for freelance and full-time",
    // The heading is the name, with the role as its second line (inside the h1).
    name: "Agustín Ciucani",
    role: "full-stack developer",
    // The subtitle: the phrase at the end carries the sky accent, and the `\n`
    // puts it on its own line at every width.
    title: "I build your software\nend to end.",
    accent: "end to end.",
    lead:
      "I live in Coronel Dorrego, Buenos Aires. I build interfaces and dashboards with React, Next.js and Tailwind, and the backends behind them with Node or Python on PostgreSQL.",
    seeWork: "See projects",
    getInTouch: "Write to me",
    stackLabel: "Stack",
    focus: ["Interfaces", "Dashboards", "PWAs", "APIs", "Accessible"],
  },
  work: {
    eyebrow: "Projects",
    title: "What I keep building",
    accent: "building",
    lead: "Each one has a demo running on sample data and its code on GitHub.",
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
    demoAria: "View demo of {title}",
  },
  about: {
    eyebrow: "About",
    title: "From the workshop to the code",
    accent: "code",
    statement:
      "Before I coded I worked as a metal worker, doing quality control under standards like ISO 9001, in a machine shop and stocking shelves. Then I started the programming degree at the UTN in Bahía Blanca and finished it at the UPSO. App Despensa came out of that road: stock and the cash drawer were things I already knew from the other side of the counter.",
    portraitAlt: "{name} portrait",
    role: "Full-stack developer",
    socialAria: "{name} (opens in a new tab)",
    workTitle: "How I work",
    workP1:
      "I care that the interface answers fast and explains itself. Right now I am focused on taking my projects to a professional level and on making the jump to my first IT job.",
    workP2: "Away from the computer: guitar, music and a LOT of mate.",
    skillsLabel: "Tools",
    source: "See the code",
    educationTitle: "Education",
    // Same four entries as `EDUCATION` in src/data/constants.js (the JSON-LD and
    // llms.txt read that one); this is the copy the timeline renders.
    education: [
      {
        period: "2024 – 2025",
        title: "University Technician in Programming Technologies",
        company: "Universidad Provincial del Sudoeste (UPSO)",
        description: "Software development, databases and agile methods.",
      },
      {
        period: "2021 – 2022",
        title:
          "University Technician in Programming (a year and a half completed)",
        company:
          "Universidad Tecnológica Nacional, Facultad Regional Bahía Blanca (UTN FRBB)",
        description: "First stage of the degree, which I finished at the UPSO.",
      },
      {
        period: "2018 – 2020",
        title: "Personal and Professional Computer Technician",
        company: "Instituto San José",
        description: "Programming, networking, hardware and support.",
      },
      {
        period: "2014 – 2017",
        title: "Electronics",
        company: "EEST N°1",
      },
    ],
  },
  contact: {
    eyebrow: "Contact",
    title: "Tell me what you are building",
    accent: "building",
    lead:
      "Freelance or full-time. Send me the idea, the stack and when you need it, and I will answer with how we would build it.",
    copy: "Copy email",
    copied: "Copied ✓",
    manual: "Select it above",
    copiedAnnouncement: "Email copied to the clipboard",
    manualAnnouncement: "Could not copy. Select the email above.",
    mailSubject: "Project inquiry",
  },
  footer: {
    tagline: "I think it's time to blow this scene.",
    triggerTitle: "Hold for 1.5 seconds...",
    triggerAria: "Hold for 1.5 seconds to play the easter egg",
    socialLabel: "Social links",
    copyright: "© {year} Agustín Ciucani",
    privacy: "Privacy",
  },
  errors: {
    // The two error screens. A wrong address is a track that is not on the
    // record; a server failure is a wrong note — same set, same voice.
    notFound: {
      title: "This track isn't\non the record.",
      accent: "on the record.",
      lead: "The page you followed doesn't exist, or it moved. The projects, the about section and the contact are all back on the main stage.",
      home: "Back to the start",
    },
    server: {
      title: "The band hit\na wrong note.",
      accent: "a wrong note.",
      lead: "Something broke on my side. Try again, and if it keeps happening, write to me.",
      retry: "Try again",
      home: "Back to the start",
    },
  },
  privacy: {
    title: "Privacy",
    lead: "The short version: this site does not track you with cookies, does not sell anything and does not ask for your data.",
    sections: [
      {
        title: "What is measured",
        body: "Visits are counted with Vercel Web Analytics. It records the page that was opened, the site that linked to it, and the country, browser, operating system and type of device, as aggregated numbers and without cookies. It does not identify you and does not follow you to other sites.",
      },
      {
        title: "The one cookie",
        body: "A cookie called pf_locale remembers the language the site picked for you, for one year, so your next visit opens in it. It is functional, not tracking, and you can delete it from your browser at any time.",
      },
      {
        title: "Hosting",
        body: "The site is hosted on Vercel, which keeps standard server logs, such as the IP address and the time of a request, to run and protect the service.",
      },
      {
        title: "If you write to me",
        body: "If you email me, I use your address and your message only to answer you. I do not share them and I do not add you to any list.",
      },
    ],
    contact: "Questions about any of this?",
    updated: "Last updated: 9 November 2026",
  },
};

export default en;
