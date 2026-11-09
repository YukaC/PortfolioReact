/**
 * Brazilian Portuguese copy (neutral register), a translation of `es.js`.
 *
 * Any key missing here falls back to the English dictionary — that fallback is
 * explicit in `getMessages`, never silent in the components.
 *
 * Voice: full-stack React/Next. Frases curtas, o verbo primeiro, sem adjetivo
 * que não possa ser medido.
 */
const pt = {
  meta: {
    // Uma tradução de `es.js`, que carrega as strings do brief na íntegra (S7).
    // `ogTitle`/`ogDescription` são o par mais curto do card social.
    title: "Agustín Ciucani · Desenvolvedor full-stack em Buenos Aires",
    description:
      "Desenvolvedor full-stack em Buenos Aires. Apps web, painéis e PWAs com React, Next.js, Node e Python. Disponível para freelance e tempo integral.",
    ogTitle: "Agustín Ciucani · Desenvolvedor full-stack",
    ogDescription:
      "Desenvolvo seu software de ponta a ponta. React, Next.js, Node e Python.",
    imageAlt:
      "Retrato de Agustín Ciucani, desenvolvedor full-stack em Buenos Aires",
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
    // O título é o nome, com o cargo como segunda linha (dentro do h1).
    name: "Agustín Ciucani",
    role: "desenvolvedor full-stack",
    // O subtítulo: o trecho final em destaque, e o `\n` o põe em linha própria em
    // qualquer largura.
    title: "Desenvolvo seu software\nde ponta a ponta.",
    accent: "de ponta a ponta.",
    lead:
      "Moro em Coronel Dorrego, Buenos Aires. Faço interfaces e painéis com React, Next.js e Tailwind, e os backends que os sustentam com Node ou Python sobre PostgreSQL.",
    seeWork: "Ver projetos",
    getInTouch: "Me escreve",
    stackLabel: "Stack",
    focus: ["Interfaces", "Painéis", "PWAs", "APIs", "Acessível"],
  },
  work: {
    eyebrow: "Projetos",
    title: "O que venho construindo",
    accent: "construindo",
    lead: "Cada um tem demo com dados de exemplo e o código no GitHub.",
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
    demoAria: "Ver demo de {title}",
  },
  about: {
    eyebrow: "Sobre mim",
    title: "Da oficina ao código",
    accent: "código",
    statement:
      "Antes de programar trabalhei como operário metalúrgico, fazendo controle de qualidade sob normas como a ISO 9001, numa oficina mecânica e como repositor. Depois comecei o tecnólogo em programação na UTN de Bahía Blanca e terminei na UPSO. O App Despensa saiu desse caminho: estoque e caixa eu já conhecia do outro lado do balcão.",
    portraitAlt: "Retrato de {name}",
    role: "Desenvolvedor full-stack",
    socialAria: "{name} (abre em uma nova aba)",
    workTitle: "Como eu trabalho",
    workP1:
      "Me importa que a interface responda rápido e se explique sozinha. Agora estou focado em levar meus projetos a um nível profissional e em dar o salto para o meu primeiro trabalho em TI.",
    workP2: "Fora do computador: violão, música e MUITO mate.",
    skillsLabel: "Ferramentas",
    source: "Ver o código",
    educationTitle: "Formação",
    // As mesmas quatro entradas de `EDUCATION` em src/data/constants.js (o
    // JSON-LD e o llms.txt leem aquela); esta é a cópia que a linha do tempo
    // renderiza.
    education: [
      {
        period: "2024 – 2025",
        title: "Tecnólogo Universitário em Tecnologias da Programação",
        company: "Universidad Provincial del Sudoeste (UPSO)",
        description: "Desenvolvimento de software, bancos de dados e métodos ágeis.",
      },
      {
        period: "2021 – 2022",
        title: "Tecnólogo Universitário em Programação (um ano e meio cursado)",
        company:
          "Universidad Tecnológica Nacional, Facultad Regional Bahía Blanca (UTN FRBB)",
        description: "Primeira etapa do curso, que terminei na UPSO.",
      },
      {
        period: "2018 – 2020",
        title: "Técnico em Informática Pessoal e Profissional",
        company: "Instituto San José",
        description: "Programação, redes, hardware e suporte.",
      },
      {
        period: "2014 – 2017",
        title: "Eletrônica",
        company: "EEST N°1",
      },
    ],
  },
  contact: {
    eyebrow: "Contato",
    title: "Conta o que você está construindo",
    accent: "construindo",
    lead:
      "Freelance ou tempo integral. Me manda a ideia, a stack e para quando você precisa, e eu respondo como a gente desenvolveria.",
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
    copyright: "© {year} Agustín Ciucani",
    privacy: "Privacidade",
  },
  errors: {
    notFound: {
      title: "Essa faixa não está\nno disco.",
      accent: "no disco.",
      lead: "A página que você procurou não existe, ou mudou de lugar. Os projetos, o sobre mim e o contato continuam no palco principal.",
      home: "Voltar ao início",
    },
    server: {
      title: "A banda errou\numa nota.",
      accent: "uma nota.",
      lead: "Algo quebrou do meu lado. Tente de novo e, se continuar, me escreva.",
      retry: "Tentar de novo",
      home: "Voltar ao início",
    },
  },
  privacy: {
    title: "Privacidade",
    lead: "A versão curta: este site não rastreia você com cookies, não vende nada e não pede seus dados.",
    sections: [
      {
        title: "O que é medido",
        body: "As visitas são contadas com o Vercel Web Analytics. Ele registra a página aberta, o site que levou até ela e o país, navegador, sistema operacional e tipo de dispositivo, como números agregados e sem cookies. Não identifica você nem segue você para outros sites.",
      },
      {
        title: "O único cookie",
        body: "Um cookie chamado pf_locale lembra o idioma que o site escolheu para você, por um ano, para que sua próxima visita abra nele. É funcional, não de rastreamento, e você pode apagá-lo no navegador quando quiser.",
      },
      {
        title: "Hospedagem",
        body: "O site é hospedado na Vercel, que mantém os registros normais do servidor, como o endereço IP e o horário de cada requisição, para operar e proteger o serviço.",
      },
      {
        title: "Se você me escrever",
        body: "Se você me mandar um e-mail, uso seu endereço e sua mensagem só para responder. Não compartilho nem adiciono você a nenhuma lista.",
      },
    ],
    contact: "Dúvidas sobre algo disso?",
    updated: "Última atualização: 9 de novembro de 2026",
  },
};

export default pt;
