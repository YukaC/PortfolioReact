/**
 * Spanish copy (rioplatense, voseo). The source of truth for every other
 * dictionary: `en` and `pt` translate these strings, never the other way round.
 *
 * Any key missing here falls back to the English dictionary — that fallback is
 * explicit in `getMessages`, never silent in the components.
 *
 * Voice: full-stack React/Next. Frases cortas, el verbo primero, voseo
 * rioplatense en los imperativos ("contame", "escribime"), sin adjetivos que
 * no se puedan medir.
 */
const es = {
  meta: {
    // S7: the brief's strings, verbatim. `ogTitle`/`ogDescription` are the pair
    // the social card shows — one line for the name and the role, one for the
    // pitch — so they are shorter than the document's own title and description.
    title: "Agustín Ciucani · Desarrollador full-stack en Buenos Aires",
    description:
      "Desarrollador full-stack en Buenos Aires. Apps web, paneles y PWAs con React, Next.js, Node y Python. Disponible para freelance y full-time.",
    ogTitle: "Agustín Ciucani · Desarrollador full-stack",
    ogDescription:
      "Armo tu software de punta a punta. React, Next.js, Node y Python.",
    imageAlt:
      "Retrato de Agustín Ciucani, desarrollador full-stack en Buenos Aires",
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
    status: "Disponible para freelance y full-time",
    // The heading is the name, with the role as its second line (inside the h1).
    name: "Agustín Ciucani",
    role: "desarrollador full-stack",
    // The subtitle: the phrase at the end carries the sky accent, and the `\n`
    // puts it on its own line at every width. The break cannot ride on the
    // available width: at 1440 the phrase used to break after "de", leaving the
    // first accented word alone at the end of the previous line.
    title: "Armo tu software\nde punta a punta.",
    accent: "de punta a punta.",
    lead:
      "Vivo en Coronel Dorrego, Buenos Aires. Hago interfaces y paneles con React, Next.js y Tailwind, y los backends que los sostienen con Node o Flask sobre PostgreSQL.",
    seeWork: "Ver proyectos",
    getInTouch: "Escribime",
    stackLabel: "Stack",
    // The band's accent track and the hero's second tag row: the same vocabulary,
    // read twice on the page (hero and `Marquee`), so it lives in one key.
    focus: ["Interfaces", "Paneles", "PWAs", "APIs", "Accesible", "Responsive"],
  },
  work: {
    eyebrow: "Proyectos",
    title: "Lo que vengo armando",
    accent: "armando",
    lead: "Cada uno tiene demo con datos de ejemplo y el código en GitHub.",
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
    demoAria: "Ver demo de {title}",
  },
  about: {
    eyebrow: "Sobre mí",
    title: "Del taller al código",
    accent: "código",
    statement:
      "Antes de programar trabajé como operario metalúrgico, haciendo control de calidad bajo normas como ISO 9001, en un taller mecánico y como repositor. Después empecé la tecnicatura en programación en la UTN de Bahía Blanca y la terminé en la UPSO. App Despensa salió de ese recorrido: el stock y la caja ya los conocía desde el otro lado del mostrador.",
    portraitAlt: "Retrato de {name}",
    role: "Desarrollador full-stack",
    socialAria: "{name} (se abre en una pestaña nueva)",
    workTitle: "Cómo trabajo",
    workP1:
      "Me importa que la interfaz responda rápido y se entienda sola. Ahora estoy enfocado en llevar mis proyectos a un nivel profesional y en dar el salto a mi primer trabajo en IT.",
    workP2: "Fuera de la compu: guitarra, música y MUCHO mate.",
    skillsLabel: "Herramientas",
    source: "Ver el código",
    educationTitle: "Formación",
    // `EDUCATION` (src/data/constants.js) carries the same four entries for the
    // JSON-LD and llms.txt; this array is the copy the timeline renders, period
    // included, so the visible range keeps its en dash.
    education: [
      {
        period: "2024 – 2025",
        title: "Tecnicatura Universitaria en Tecnologías de la Programación",
        company: "Universidad Provincial del Sudoeste (UPSO)",
        description:
          "Desarrollo de software, bases de datos y metodologías ágiles.",
      },
      {
        period: "2021 – 2022",
        title:
          "Tecnicatura Universitaria en Programación (un año y medio cursado)",
        company:
          "Universidad Tecnológica Nacional, Facultad Regional Bahía Blanca (UTN FRBB)",
        description: "Primera etapa de la carrera, que terminé en la UPSO.",
      },
      {
        period: "2018 – 2020",
        title: "Técnico en Informática Personal y Profesional",
        company: "Instituto San José",
        description: "Programación, redes, hardware y soporte.",
      },
      {
        period: "2014 – 2017",
        title: "Electrónica",
        company: "EEST N°1",
        // No detail line: the brief gives none for this entry, and the timeline
        // omits the paragraph instead of printing an empty one.
      },
    ],
  },
  contact: {
    eyebrow: "Contacto",
    title: "Contame qué estás armando",
    accent: "armando",
    lead:
      "Freelance o full-time. Pasame la idea, el stack y para cuándo lo necesitás, y te respondo cómo lo desarrollaríamos.",
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
    copyright: "© {year} Agustín Ciucani",
  },
};

export default es;
