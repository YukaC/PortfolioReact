/**
 * Brazilian Portuguese copy (neutral register).
 *
 * Any key missing here falls back to the English dictionary — that fallback is
 * explicit in `getMessages`, never silent in the components.
 *
 * Voice: full-stack React/Next. Frases curtas, o verbo primeiro, sem adjetivo
 * que não possa ser medido.
 */
const pt = {
  meta: {
    title: "Agustin Ciucani — Desenvolvedor full-stack em Buenos Aires",
    description:
      "Desenvolvedor full-stack em Buenos Aires. Levo produto React e Next.js do painel ao deploy: PWAs, painéis e as APIs por trás deles.",
    imageAlt:
      "Retrato de Agustin Ciucani, desenvolvedor full-stack em Buenos Aires",
  },
  a11y: {
    skipToContent: "Ir para o conteúdo",
    newTab: " (abre em uma nova aba)",
    bebopDialog: "Animação do easter egg de Cowboy Bebop",
    bebopSkip: "Pular",
  },
  nav: {
    main: "Navegação principal",
    home: "Ir para o início",
    openMenu: "Abrir menu",
    closeMenu: "Fechar menu",
    contact: "Contato",
    links: {
      portfolio: "Projetos",
      about: "Sobre mim",
    },
  },
  switcher: {
    label: "Idioma",
    current: "Idioma atual: {language}",
  },
  hero: {
    status: "Disponível para freelance e tempo integral",
    title: "Do painel ao deploy, sem intermediários",
    accent: "intermediários",
    lead:
      "Agustin Ciucani, desenvolvedor full-stack em Buenos Aires. Construo o painel, a API e o deploy que coloca tudo online.",
    seeWork: "Ver o trabalho",
    getInTouch: "Fale comigo",
    stackLabel: "Stack",
  },
  marquee: {
    traits: ["Painéis", "APIs", "PWAs", "React", "Next.js", "Postgres"],
  },
  work: {
    eyebrow: "Trabalhos selecionados",
    title: "Demos que funcionam, não maquetes",
    accent: "maquetes",
    lead: "Painéis, apps e ferramentas. Cada um com seu código-fonte.",
    demoNotice:
      "Cada link de \"Ver demo\" abre uma demo: uma versão de amostra que funciona, não o deploy de produção do projeto.",
    filterLabel: "Filtrar projetos",
    filters: {
      all: "Todos",
      react: "React",
      python: "Python",
      systems: "Sistemas",
      pwa: "PWA",
    },
    empty: "Nada com esse filtro.",
    viewDemo: "Ver demo",
    github: "GitHub",
    githubProfile: "Perfil no GitHub",
    repoAria: "{title} no GitHub",
    demoAria: "{title} — ver demo",
  },
  about: {
    eyebrow: "Sobre mim",
    title: "Como eu trabalho: uma pessoa, o ciclo completo",
    accent: "completo",
    statement:
      "Levo interfaces, painéis e PWAs do brief ao deploy em React e Next.js: front, API e o servidor onde rodam.",
    portraitAlt: "Retrato de {name}",
    role: "Desenvolvedor full-stack",
    socialAria: "{name} (abre em uma nova aba)",
    workTitle: "Como eu trabalho",
    introStrong: "Trabalho em produção com React, Next.js e Tailwind.",
    introRest: "Acessível, responsivo e previsível onde previsível é o certo.",
    offClock: "Fora do horário: música, um Ford Fiesta 95 e o violão.",
    skillsLabel: "Ferramentas",
    source: "Ver o código",
    educationTitle: "Formação",
    education: [
      {
        title: "Tecnólogo Universitário em Tecnologias da Programação",
        company: "Universidad Provincial del Sudoeste (UPSO)",
        description:
          "Desenvolvimento de software, bancos de dados, métodos ágeis e prática de programação.",
      },
      {
        title: "Técnico em Informática Pessoal e Profissional",
        company: "EEST N°1 / Instituto San José",
        description:
          "Fundamentos de programação, redes, hardware e suporte técnico.",
      },
    ],
  },
  contact: {
    eyebrow: "Contato",
    title: "Manda o problema. Eu devolvo o plano.",
    accent: "plano.",
    lead:
      "Freelance ou tempo integral. Com o objetivo, a stack e o prazo já dá para começar.",
    copy: "Copiar e-mail",
    copied: "Copiado ✓",
    manual: "Selecione acima",
    copiedAnnouncement: "E-mail copiado para a área de transferência",
    manualAnnouncement: "Não foi possível copiar. Selecione o e-mail acima.",
    mailSubject: "Consulta de projeto",
  },
  footer: {
    // The tagline is the Bebop trigger line and stays in English in every
    // language: it is a quote, not copy. Deliberately absent from this file so
    // the per-key fallback resolves it to `en`.
    triggerTitle: "Segure por 1,5 segundos...",
    triggerAria: "Segure por 1,5 segundos para abrir o easter egg",
    socialLabel: "Redes sociais",
    copyright: "© {year} Agustin Ciucani",
  },
};

export default pt;
