/**
 * GitHub profile used for pinned repos (source of truth for the grid).
 * Optional overrides polish title / copy / screenshot / tags per repo slug.
 */
export const GITHUB_USERNAME = "YukaC";

/** GitHub profile pins cap at six; ISR refreshes the list hourly. */
export const MAX_PINNED_PROJECTS = 6;

/**
 * @typedef {object} ProjectOverride
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [problem]
 * @property {string} [outcome]
 * @property {string} [imgSrc]
 * @property {string} [alt]
 * @property {string[]} [tags]
 * @property {boolean} [isFeatured]
 * @property {Partial<Record<"es"|"pt", { title?: string, description?: string, problem?: string, outcome?: string }>>} [i18n]
 */

/** @type {Record<string, ProjectOverride>} */
export const PROJECT_OVERRIDES = {
  PortfolioReact: {
    title: "Professional Portfolio",
    description:
      "The site you are reading: server rendering for SEO, a hand-built visual system, and a WebGL easter egg.",
    problem: "This site needed to read as a working practice, not a template.",
    outcome:
      "Next.js App Router with ISR, a Tailwind design system, and a WebGL easter egg.",
    imgSrc: "/portfolio.webp",
    alt: "Portfolio home page screenshot",
    tags: ["React", "Next.js", "Tailwind CSS"],
    // Translations are opt-in per field: anything left out stays English (see
    // `localizeProject`), never blank.
    i18n: {
      es: {
        title: "Portfolio profesional",
        description:
          "El sitio que estás leyendo: render en servidor para SEO, un sistema visual hecho a mano y un easter egg en WebGL.",
        problem:
          "Este sitio tenía que transmitir trabajo real y no una plantilla.",
        outcome:
          "Next.js con ISR, un sistema de diseño en Tailwind y un easter egg en WebGL.",
      },
      pt: {
        title: "Portfólio profissional",
        description:
          "O site que você está lendo: renderização no servidor para SEO, um sistema visual feito à mão e um easter egg em WebGL.",
        problem:
          "Este site precisava mostrar trabalho de verdade, não um template.",
        outcome:
          "Next.js com ISR, um design system em Tailwind e um easter egg em WebGL.",
      },
    },
  },
  MuniDgoSaaS: {
    title: "Turnos App",
    description:
      "Multi-tenant appointment management app featuring real-time validation, an admin dashboard, and data visualization with ECharts.",
    problem:
      "A municipality needed one place to take appointments across tenants.",
    outcome:
      "A Flask and React app with live validation, an admin dashboard, and ECharts.",
    imgSrc: "/munidgo.webp",
    alt: "Turnos App Screenshot",
    tags: ["JavaScript", "Python", "Flask", "MySQL"],
    isFeatured: true,
    i18n: {
      es: {
        description:
          "App multi-tenant de gestión de turnos con validación en tiempo real, panel de administración y visualización de datos con ECharts.",
        problem:
          "Una municipalidad necesitaba un solo lugar para sacar turnos en distintas áreas.",
        outcome:
          "Una app Flask y React con validación en vivo, panel de administración y ECharts.",
      },
      pt: {
        description:
          "App multi-tenant de gestão de agendamentos com validação em tempo real, painel administrativo e visualização de dados com ECharts.",
        problem:
          "Uma prefeitura precisava de um só lugar para receber agendamentos de várias secretarias.",
        outcome:
          "Um app Flask e React com validação ao vivo, painel administrativo e ECharts.",
      },
    },
  },
  OpenBalance: {
    title: "OpenBalance",
    description:
      "Month-first personal finance: income, expenses, categories, and a weekly breakdown, no account required.",
    problem:
      "Most budgeting apps bury the monthly picture behind a week-based model.",
    outcome:
      "A local-first Next.js app with Zustand persistence that runs without a backend.",
    imgSrc: "/openbalance.webp",
    alt: "OpenBalance monthly summary screenshot",
    tags: ["React", "Next.js", "TypeScript"],
    isFeatured: true,
    i18n: {
      es: {
        description:
          "Finanzas personales organizadas por mes: ingresos, gastos, categorías y un desglose semanal, sin crear cuenta.",
        problem:
          "Casi todas las apps de presupuesto esconden el panorama mensual detrás de un modelo semanal.",
        outcome:
          "Una app Next.js local-first con persistencia en Zustand que funciona sin backend.",
      },
      pt: {
        description:
          "Finanças pessoais organizadas por mês: receitas, despesas, categorias e um detalhamento semanal, sem criar conta.",
        problem:
          "Quase todo app de orçamento esconde o panorama mensal atrás de um modelo semanal.",
        outcome:
          "Um app Next.js local-first com persistência em Zustand que roda sem backend.",
      },
    },
  },
  PelisEnCasa: {
    title: "Pelis en Casa",
    description:
      "Movie catalog and review site: search, genre and director filters, film detail, and reader comments.",
    problem:
      "A 2022 academic project (HTML + jQuery + Flask) that could not be shown as it was.",
    outcome:
      "Rebuilt as a static React app with embedded data and spring-based motion.",
    imgSrc: "/peliscasa.webp",
    alt: "Pelis en Casa movie catalog screenshot",
    tags: ["React", "Vite", "Motion"],
    isFeatured: true,
    i18n: {
      es: {
        description:
          "Catálogo y reseñas de películas: búsqueda, filtros por género y director, ficha de cada película y comentarios de lectores.",
        problem:
          "Un trabajo académico de 2022 (HTML + jQuery + Flask) que no se podía mostrar tal como estaba.",
        outcome:
          "Reconstruido como app estática en React, con datos embebidos y animaciones con springs.",
      },
      pt: {
        description:
          "Catálogo e resenhas de filmes: busca, filtros por gênero e diretor, ficha de cada filme e comentários dos leitores.",
        problem:
          "Um trabalho acadêmico de 2022 (HTML + jQuery + Flask) que não dava para mostrar como estava.",
        outcome:
          "Reconstruído como app estático em React, com dados embutidos e animações com springs.",
      },
    },
  },
  WLandStudio: {
    title: "Myrk Studio",
    description:
      "Brand site for a narrative Minecraft series: editorial single scroll, WebGL hero, and a whitelist flow.",
    problem:
      "A fictional series needed a site that felt like a studio, not a template.",
    outcome:
      "React, Vite, and Tailwind with GSAP/Three atmosphere, tuned for mobile scrolling.",
    imgSrc: "/myrkstudio.webp",
    alt: "Myrk Studio home page screenshot",
    tags: ["React", "Vite", "Tailwind CSS", "Three.js"],
    isFeatured: true,
    i18n: {
      es: {
        description:
          "Sitio de marca para una serie narrativa de Minecraft: scroll editorial de una sola pasada, hero en WebGL y flujo de whitelist.",
        problem:
          "Una serie ficticia necesitaba un sitio que se sintiera como un estudio y no como una plantilla.",
        outcome:
          "React, Vite y Tailwind con atmósfera GSAP/Three, ajustado para el scroll en mobile.",
      },
      pt: {
        description:
          "Site de marca para uma série narrativa de Minecraft: scroll editorial de página única, hero em WebGL e fluxo de whitelist.",
        problem:
          "Uma série fictícia precisava de um site que parecesse um estúdio, não um template.",
        outcome:
          "React, Vite e Tailwind com atmosfera GSAP/Three, ajustado para o scroll no celular.",
      },
    },
  },
  btrfs2ext4: {
    title: "btrfs2ext4",
    description:
      "In-place Btrfs to Ext4 converter for block devices and images: crash-recovery journal, rollback, and memory-aware scaling.",
    problem: "Moving a live filesystem from Btrfs to Ext4 without a full copy.",
    outcome:
      "An in-place converter with a crash-recovery journal and rollback.",
    imgSrc: "/btrfs2ext4.webp",
    alt: "btrfs2ext4 dry-run terminal screenshot",
    tags: ["C", "Linux", "btrfs", "ext4"],
    i18n: {
      es: {
        description:
          "Convertidor en el lugar de Btrfs a Ext4 para dispositivos de bloque e imágenes: journal de recuperación ante cortes, rollback y escalado según la memoria disponible.",
        problem:
          "Mover un sistema de archivos en vivo de Btrfs a Ext4 sin copiar todo de nuevo.",
        outcome:
          "Un convertidor en el lugar, con journal de recuperación y rollback.",
      },
      pt: {
        description:
          "Conversor no local de Btrfs para Ext4 em dispositivos de bloco e imagens: journal de recuperação após queda, rollback e escalonamento conforme a memória disponível.",
        problem:
          "Mover um sistema de arquivos em uso de Btrfs para Ext4 sem copiar tudo de novo.",
        outcome:
          "Um conversor no local, com journal de recuperação e rollback.",
      },
    },
  },
  "cowboy-bebop-grub-theme": {
    title: "Cowboy Bebop GRUB Theme",
    description: "Cowboy Bebop themed GRUB bootloader theme.",
    problem: "A boot menu that matches a Cowboy Bebop lockscreen.",
    outcome: "A GRUB theme with the series type and stills.",
    imgSrc: "/cowboy-bebop-grub-theme.webp",
    alt: "Cowboy Bebop GRUB theme boot menu screenshot",
    tags: ["Shell", "GRUB", "Linux"],
    i18n: {
      es: {
        description: "Tema de GRUB con la estética de Cowboy Bebop.",
        problem:
          "Un menú de arranque que combine con el lockscreen de Cowboy Bebop.",
        outcome:
          "Un tema de GRUB con la tipografía y los fotogramas de la serie.",
      },
      pt: {
        description: "Tema de GRUB com a estética de Cowboy Bebop.",
        problem:
          "Um menu de boot que combine com o lockscreen de Cowboy Bebop.",
        outcome:
          "Um tema de GRUB com a tipografia e os frames da série.",
      },
    },
  },
  AppDespensa: {
    title: "App Despensa",
    description:
      "Local-first PWA POS for a pantry store: sales dashboard, caja, products, and stock intake (React + Node + PostgreSQL).",
    problem:
      "A pantry store needed sales, cash, and stock without a SaaS bill.",
    outcome: "A local-first PWA POS on React, Node, and PostgreSQL.",
    imgSrc: "/appdespensa.webp",
    alt: "App Despensa admin dashboard screenshot",
    tags: ["React", "Node", "PostgreSQL", "PWA"],
    i18n: {
      es: {
        description:
          "POS PWA local-first para un almacén: panel de ventas, caja, productos e ingreso de stock (React + Node + PostgreSQL).",
        problem:
          "Un almacén necesitaba ventas, caja y stock sin pagar un SaaS.",
        outcome: "Un POS PWA local-first sobre React, Node y PostgreSQL.",
      },
      pt: {
        description:
          "PDV PWA local-first para uma mercearia: painel de vendas, caixa, produtos e entrada de estoque (React + Node + PostgreSQL).",
        problem:
          "Uma mercearia precisava de vendas, caixa e estoque sem pagar um SaaS.",
        outcome: "Um PDV PWA local-first em React, Node e PostgreSQL.",
      },
    },
  },
  cleanupDiskW11: {
    title: "cleanupDiskW11",
    description: "Windows 11 disk cleanup helper script.",
    problem: "Windows 11 installs leaving disk clutter after upgrades.",
    outcome: "A Python helper with a small GUI for cleanup tasks.",
    imgSrc: "/cleanupDiskW11.webp",
    alt: "cleanupDiskW11 Windows 11 cleaner GUI screenshot",
    tags: ["Python", "Windows"],
    i18n: {
      es: {
        description: "Script auxiliar de limpieza de disco para Windows 11.",
        problem:
          "Las instalaciones de Windows 11 que dejan basura en el disco después de actualizar.",
        outcome:
          "Un auxiliar en Python con una interfaz mínima para las tareas de limpieza.",
      },
      pt: {
        description: "Script auxiliar de limpeza de disco para o Windows 11.",
        problem:
          "Instalações do Windows 11 que deixam lixo no disco depois das atualizações.",
        outcome:
          "Um auxiliar em Python com uma interface mínima para as tarefas de limpeza.",
      },
    },
  },
  AhorrAR: {
    title: "AhorrAR",
    description:
      "Live price comparison for Argentine stores, ranked real offers with confirmed shipping (Scrapling + Express + React).",
    problem: "Argentine grocery prices scattered across store sites.",
    outcome: "A ranked live comparison with confirmed shipping.",
    imgSrc: "/ahorrar.webp",
    alt: "AhorrAR price comparison landing page screenshot",
    tags: ["React", "TypeScript", "Express"],
    i18n: {
      es: {
        description:
          "Comparación de precios en vivo para comercios argentinos, que ordena ofertas reales y confirma el envío (Scrapling + Express + React).",
        problem:
          "Los precios de los supermercados argentinos están dispersos entre sitios.",
        outcome: "Una comparación en vivo que ordena ofertas y confirma el envío.",
      },
      pt: {
        description:
          "Comparação de preços ao vivo para lojas argentinas, que ordena ofertas reais e confirma o frete (Scrapling + Express + React).",
        problem:
          "Os preços dos mercados argentinos estão espalhados entre sites.",
        outcome: "Uma comparação ao vivo que ordena ofertas e confirma o frete.",
      },
    },
  },
};

/**
 * Used when the public profile scrape fails.
 * Keep in sync with current profile pins when possible.
 */export const PINNED_FALLBACK = [
  {
    name: "PortfolioReact",
    title: "Professional Portfolio",
    description:
      "Personal website featuring Server-Side Rendering for optimized SEO, built with modular and reusable Tailwind CSS components.",
    problem: "This site needed to read as a working practice, not a template.",
    outcome:
      "Next.js SSG/ISR, a Bocanada visual system, and a WebGL easter egg.",
    imgSrc: "/portfolio.webp",
    alt: "Portfolio Screenshot",
    tags: ["React", "Next.js", "Tailwind CSS"],
    repoLink: "https://github.com/YukaC/PortfolioReact",
    isFeatured: false,
  },
  {
    name: "MuniDgoSaaS",
    title: "Turnos App",
    description:
      "Multi-tenant appointment management app featuring real-time validation, an admin dashboard, and data visualization with ECharts.",
    problem:
      "A municipality needed one place to take appointments across tenants.",
    outcome:
      "A Flask and React app with live validation, an admin dashboard, and ECharts.",
    imgSrc: "/munidgo.webp",
    alt: "Turnos App Screenshot",
    tags: ["JavaScript", "Python", "Flask", "MySQL"],
    repoLink: "https://github.com/YukaC/MuniDgoSaaS",
    isFeatured: true,
  },
  {
    name: "btrfs2ext4",
    title: "btrfs2ext4",
    description:
      "In-place Btrfs to Ext4 converter for block devices and images: crash-recovery journal, rollback, and memory-aware scaling.",
    problem: "Moving a live filesystem from Btrfs to Ext4 without a full copy.",
    outcome:
      "An in-place converter with a crash-recovery journal and rollback.",
    imgSrc: "/btrfs2ext4.webp",
    alt: "btrfs2ext4 dry-run terminal screenshot",
    tags: ["C", "Linux", "btrfs", "ext4"],
    repoLink: "https://github.com/YukaC/btrfs2ext4",
    isFeatured: false,
  },
  {
    name: "cowboy-bebop-grub-theme",
    title: "Cowboy Bebop GRUB Theme",
    description: "Cowboy Bebop themed GRUB bootloader theme.",
    problem: "A boot menu that matches a Cowboy Bebop lockscreen.",
    outcome: "A GRUB theme with the series type and stills.",
    imgSrc: "/cowboy-bebop-grub-theme.webp",
    alt: "Cowboy Bebop GRUB theme boot menu screenshot",
    tags: ["Shell", "GRUB", "Linux"],
    repoLink: "https://github.com/YukaC/cowboy-bebop-grub-theme",
    isFeatured: false,
  },
  {
    name: "AppDespensa",
    title: "App Despensa",
    description:
      "Local-first PWA POS for a pantry store: sales dashboard, caja, products, and stock intake (React + Node + PostgreSQL).",
    problem:
      "A pantry store needed sales, cash, and stock without a SaaS bill.",
    outcome: "A local-first PWA POS on React, Node, and PostgreSQL.",
    imgSrc: "/appdespensa.webp",
    alt: "App Despensa admin dashboard screenshot",
    tags: ["React", "Node", "PostgreSQL", "PWA"],
    repoLink: "https://github.com/YukaC/AppDespensa",
    isFeatured: false,
  },
  {
    name: "cleanupDiskW11",
    title: "cleanupDiskW11",
    description: "Windows 11 disk cleanup helper script.",
    problem: "Windows 11 installs leaving disk clutter after upgrades.",
    outcome: "A Python helper with a small GUI for cleanup tasks.",
    imgSrc: "/cleanupDiskW11.webp",
    alt: "cleanupDiskW11 Windows 11 cleaner GUI screenshot",
    tags: ["Python", "Windows"],
    repoLink: "https://github.com/YukaC/cleanupDiskW11",
    isFeatured: false,
  },
  {
    name: "AhorrAR",
    title: "AhorrAR",
    description:
      "Live price comparison for Argentine stores, ranked real offers with confirmed shipping (Scrapling + Express + React).",
    problem: "Argentine grocery prices scattered across store sites.",
    outcome: "A ranked live comparison with confirmed shipping.",
    imgSrc: "/ahorrar.webp",
    alt: "AhorrAR price comparison landing page screenshot",
    tags: ["React", "TypeScript", "Express"],
    repoLink: "https://github.com/YukaC/AhorrAR",
    isFeatured: false,
  },
];

/** Work filters: a project joins a group when its tags or repo name match. */
export const WORK_FILTERS = [
  { id: "all", label: "All" },
  { id: "react", label: "React" },
  { id: "python", label: "Python" },
  { id: "systems", label: "Systems" },
  { id: "pwa", label: "PWA" },
];

const CATEGORY_MATCHERS = {
  react: /^(react|next\.?js|typescript|javascript|node|express)$/i,
  python: /^(python|flask|django)$/i,
  systems: /^(c|shell|bash|linux|grub|btrfs|ext4|windows)$/i,
  pwa: /^pwa$/i,
};

/** Groups a project belongs to, derived from its tags and repo name. */
export function projectCategories(project) {
  const terms = [project.name ?? "", ...(project.tags ?? [])];
  return Object.entries(CATEGORY_MATCHERS)
    .filter(([, matcher]) => terms.some((term) => matcher.test(term)))
    .map(([id]) => id);
}

/** Single-letter monogram for a project with no screenshot. */
export function projectMonogram(project) {
  return (project.title ?? project.name ?? "?").trim().charAt(0).toUpperCase();
}
