/**
 * Spanish copy (rioplatense, voseo).
 *
 * Any key missing here falls back to the English dictionary — that fallback is
 * explicit in `getMessages`, never silent in the components.
 *
 * Voice: full-stack React/Next. Frases cortas, el verbo primero, voseo
 * rioplatense en los imperativos ("contame", "seleccioná"), sin adjetivos que
 * no se puedan medir.
 */
const es = {
  meta: {
    title: "Agustin Ciucani — Desarrollador full-stack en Buenos Aires",
    description:
      "Desarrollador full-stack en Buenos Aires. Llevo producto React y Next.js del panel al deploy: PWAs, paneles y las APIs que los sostienen.",
    imageAlt:
      "Retrato de Agustin Ciucani, desarrollador full-stack en Buenos Aires",
  },
  a11y: {
    skipToContent: "Ir al contenido",
    newTab: " (se abre en una pestaña nueva)",
    bebopDialog: "Animación del easter egg de Cowboy Bebop",
    bebopSkip: "Saltar",
  },
  nav: {
    main: "Navegación principal",
    home: "Ir al inicio",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    contact: "Contacto",
    links: {
      portfolio: "Proyectos",
      about: "Sobre mí",
    },
  },
  switcher: {
    label: "Idioma",
    current: "Idioma actual: {language}",
  },
  hero: {
    status: "Disponible para freelance y tiempo completo",
    title: "Del panel al deploy, sin intermediarios",
    accent: "intermediarios",
    lead:
      "Agustin Ciucani, desarrollador full-stack en Buenos Aires. Construyo el panel, la API y el deploy que los pone online.",
    seeWork: "Ver el trabajo",
    getInTouch: "Hablemos",
    stackLabel: "Stack",
  },
  marquee: {
    traits: ["Paneles", "APIs", "PWAs", "React", "Next.js", "Postgres"],
  },
  work: {
    eyebrow: "Trabajo seleccionado",
    title: "Demos que funcionan, no maquetas",
    accent: "maquetas",
    lead: "Paneles, apps y herramientas. Cada uno con su código fuente.",
    demoNotice:
      "Cada link de \"Ver demo\" abre una demo: una versión de muestra que funciona, no el deploy de producción del proyecto.",
    filterLabel: "Filtrar proyectos",
    filters: {
      all: "Todos",
      react: "React",
      python: "Python",
      systems: "Sistemas",
      pwa: "PWA",
    },
    empty: "No hay nada con ese filtro.",
    viewDemo: "Ver demo",
    github: "GitHub",
    githubProfile: "Perfil de GitHub",
    repoAria: "{title} en GitHub",
    demoAria: "{title} — ver demo",
  },
  about: {
    eyebrow: "Sobre mí",
    title: "Cómo trabajo: una persona, el ciclo completo",
    accent: "completo",
    statement:
      "Llevo interfaces, paneles y PWAs del brief al deploy en React y Next.js: front, API y el servidor donde corren.",
    portraitAlt: "Retrato de {name}",
    role: "Desarrollador full-stack",
    socialAria: "{name} (se abre en una pestaña nueva)",
    workTitle: "Cómo trabajo",
    introStrong: "Trabajo en producción con React, Next.js y Tailwind.",
    introRest: "Accesible, adaptable y predecible donde predecible es lo correcto.",
    offClock: "Fuera del horario: música, un Ford Fiesta 95 y la guitarra.",
    skillsLabel: "Herramientas",
    source: "Ver el código",
    educationTitle: "Formación",
    education: [
      {
        title: "Tecnicatura Universitaria en Tecnologías de la Programación",
        company: "Universidad Provincial del Sudoeste (UPSO)",
        description:
          "Desarrollo de software, bases de datos, metodologías ágiles y práctica de programación.",
      },
      {
        title: "Técnico en Informática Personal y Profesional",
        company: "EEST N°1 / Instituto San José",
        description:
          "Fundamentos de programación, redes, hardware y soporte técnico.",
      },
    ],
  },
  contact: {
    eyebrow: "Contacto",
    title: "Contame el problema. Te devuelvo el plan.",
    accent: "plan.",
    lead:
      "Freelance o tiempo completo. Con el objetivo, el stack y la fecha alcanza para arrancar.",
    copy: "Copiar mail",
    copied: "Copiado ✓",
    manual: "Seleccionalo arriba",
    copiedAnnouncement: "Mail copiado al portapapeles",
    manualAnnouncement: "No se pudo copiar. Seleccioná el mail de arriba.",
    mailSubject: "Consulta de proyecto",
  },
  footer: {
    // The tagline is the Bebop trigger line and stays in English in every
    // language: it is a quote, not copy. Deliberately absent from this file so
    // the per-key fallback resolves it to `en`.
    triggerTitle: "Mantené presionado 1,5 segundos...",
    triggerAria: "Mantené presionado 1,5 segundos para abrir el easter egg",
    socialLabel: "Redes",
    copyright: "© {year} Agustin Ciucani",
  },
};

export default es;
