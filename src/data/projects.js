/**
 * GitHub profile used for pinned repos. The cards themselves are NOT read from
 * GitHub here: `src/data/pinned-projects.json` is the served snapshot (§17).
 * `PROJECT_OVERRIDES` below is the copy and the screenshot for a pinned slug.
 */
export const GITHUB_USERNAME = "YukaC";

/** GitHub profile pins cap at six; the CI job refreshes the snapshot every 6 h. */
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

/**
 * Copy rule for every entry below: one sentence that names what the thing is
 * and what it proves, then a problem/outcome pair written as a claim the code
 * in that repository can back. No number that nobody measured.
 *
 * `description` is the line the work row prints and the project page opens with;
 * `problem`/`outcome` are the pair that page expands. Spanish is the source of
 * truth for the copy (it is what the owner briefs in); the English fields and
 * the `pt` block are translations of it, and `localizeProject` applies the
 * per-locale ones at render time.
 *
 * @type {Record<string, ProjectOverride>}
 */
export const PROJECT_OVERRIDES = {
  PortfolioReact: {
    title: "Professional Portfolio",
    description:
      "This site: server-rendered Next.js, a hand-built Tailwind system, and a WebGL field the GPU draws.",
    problem: "It had to read as working practice, not as a template.",
    outcome:
      "Next.js with ISR, design tokens as the single source of truth, and a shader-driven background.",
    imgSrc: "/portfolio.webp",
    alt: "Portfolio home page screenshot",
    tags: ["React", "Next.js", "Tailwind CSS"],
    // Translations are opt-in per field: anything left out stays English (see
    // `localizeProject`), never blank.
    i18n: {
      es: {
        title: "Portfolio profesional",
        description:
          "El sitio que estás leyendo: render en servidor con Next.js, un sistema en Tailwind hecho a mano y un campo WebGL que dibuja la GPU.",
        problem: "Tenía que transmitir trabajo real y no una plantilla.",
        outcome:
          "Next.js con ISR, tokens de diseño como única fuente de verdad y un fondo dibujado por shader.",
      },
      pt: {
        title: "Portfólio profissional",
        description:
          "O site que você está lendo: renderização no servidor com Next.js, um sistema em Tailwind feito à mão e um campo WebGL desenhado pela GPU.",
        problem: "Precisava mostrar trabalho de verdade, não um template.",
        outcome:
          "Next.js com ISR, tokens de design como fonte única de verdade e um fundo desenhado por shader.",
      },
    },
  },
  MuniDgoSaaS: {
    title: "Turnos App",
    description:
      "Multi-tenant appointment booking for the different areas of my town's municipality: a portal for residents and an admin panel with live validation and ECharts metrics.",
    problem: "One municipality, several areas, no shared place to take appointments.",
    outcome: "Flask and React on MySQL: live validation, a dashboard, and ECharts.",
    imgSrc: "/munidgo.webp",
    alt: "Turnos App Screenshot",
    tags: ["JavaScript", "Python", "Flask", "MySQL"],
    isFeatured: true,
    i18n: {
      es: {
        description:
          "Sistema de turnos multi-tenant para las distintas áreas de la municipalidad de mi pueblo. Tiene un portal para vecinos y un panel de admin con validación en tiempo real y métricas en ECharts.",
        problem:
          "Una municipalidad con varias áreas y ningún lugar común para sacar turnos.",
        outcome:
          "Flask y React sobre MySQL: validación en vivo, panel de administración y ECharts.",
      },
      pt: {
        description:
          "Sistema de agendamento multi-tenant para as diferentes secretarias da prefeitura da minha cidade. Tem um portal para os moradores e um painel de admin com validação em tempo real e métricas em ECharts.",
        problem:
          "Uma prefeitura com várias secretarias e nenhum lugar comum para agendar.",
        outcome:
          "Flask e React no MySQL: validação ao vivo, painel administrativo e ECharts.",
      },
    },
  },
  OpenBalance: {
    title: "OpenBalance",
    description:
      "It came out of a need of my own: a budget that runs by the month, with an optional weekly mode for anyone paid by the week.",
    problem: "Most budgeting apps hide the month behind a week-based model.",
    outcome: "Local-first Next.js with Zustand persistence and no backend.",
    imgSrc: "/openbalance.webp",
    alt: "OpenBalance monthly summary screenshot",
    tags: ["React", "Next.js", "TypeScript"],
    isFeatured: true,
    i18n: {
      es: {
        description:
          "Nació de una necesidad propia: un presupuesto que va por mes, con modo semanal opcional para quien cobra por semana.",
        problem:
          "Casi todas las apps de presupuesto esconden el mes detrás de un modelo semanal.",
        outcome: "Next.js local-first con persistencia en Zustand y sin backend.",
      },
      pt: {
        description:
          "Nasceu de uma necessidade minha: um orçamento que vai por mês, com modo semanal opcional para quem recebe por semana.",
        problem:
          "Quase todo app de orçamento esconde o mês atrás de um modelo semanal.",
        outcome: "Next.js local-first com persistência em Zustand e sem backend.",
      },
    },
  },
  PelisEnCasa: {
    title: "Pelis en Casa",
    description:
      "My 2022 final project (jQuery and Flask), migrated to React with animations in Motion.",
    problem: "A 2022 academic build (HTML, jQuery, Flask) nobody could show.",
    outcome: "Rebuilt as a static React app with embedded data and spring motion.",
    imgSrc: "/peliscasa.webp",
    alt: "Pelis en Casa movie catalog screenshot",
    tags: ["React", "Vite", "Motion"],
    isFeatured: true,
    i18n: {
      es: {
        description:
          "Mi trabajo final de 2022 (jQuery y Flask), migrado a React con animaciones en Motion.",
        problem:
          "Un trabajo académico de 2022 (HTML, jQuery, Flask) que no se podía mostrar.",
        outcome:
          "Reconstruido como app estática en React, con datos embebidos y motion con springs.",
      },
      pt: {
        description:
          "Meu trabalho final de 2022 (jQuery e Flask), migrado para React com animações em Motion.",
        problem:
          "Um trabalho acadêmico de 2022 (HTML, jQuery, Flask) que não dava para mostrar.",
        outcome:
          "Reconstruído como app estático em React, com dados embutidos e motion com springs.",
      },
    },
  },
  // Keyed by the repository name as GitHub reports it (`MyrkStudio`), because
  // `PROJECT_OVERRIDES[repo.name]` is the only lookup. The slug used to be
  // `WLandStudio`, which silently left this card on the generic
  // "Open-source project on GitHub." fallback after the rename.
  MyrkStudio: {
    title: "Myrk Studio",
    description:
      "Site for a studio that makes Minecraft series, with 3D scenes in Three.js.",
    problem: "A fictional series needed a site that felt like a studio, not a template.",
    outcome:
      "React, Vite, and Tailwind with GSAP and Three, tuned for mobile scroll.",
    imgSrc: "/myrkstudio.webp",
    alt: "Myrk Studio home page screenshot",
    tags: ["React", "Vite", "Tailwind", "Three.js"],
    isFeatured: true,
    i18n: {
      es: {
        description:
          "Sitio para un estudio que hace series de Minecraft, con escenas 3D en Three.js.",
        problem:
          "Una serie ficticia necesitaba un sitio que se sintiera como un estudio y no como una plantilla.",
        outcome:
          "React, Vite y Tailwind con atmósfera GSAP y Three, ajustado al scroll en mobile.",
      },
      pt: {
        description:
          "Site para um estúdio que faz séries de Minecraft, com cenas 3D em Three.js.",
        problem:
          "Uma série fictícia precisava de um site que parecesse um estúdio, não um template.",
        outcome:
          "React, Vite e Tailwind com atmosfera GSAP e Three, ajustado ao scroll no celular.",
      },
    },
  },
  btrfs2ext4: {
    title: "btrfs2ext4",
    description:
      "In-place Btrfs to Ext4 converter for block devices and images: crash-recovery journal, rollback, memory-aware scaling.",
    problem: "Move a live filesystem from Btrfs to Ext4 without copying it again.",
    outcome: "In-place conversion with a recovery journal and rollback.",
    imgSrc: "/btrfs2ext4.webp",
    alt: "btrfs2ext4 dry-run terminal screenshot",
    tags: ["C", "Linux", "btrfs", "ext4"],
    i18n: {
      es: {
        description:
          "Conversor en el lugar de Btrfs a Ext4 para dispositivos de bloque e imágenes: journal de recuperación ante cortes, rollback y escalado según la memoria disponible.",
        problem: "Mover un sistema de archivos en vivo de Btrfs a Ext4 sin copiarlo de nuevo.",
        outcome: "Conversión en el lugar con journal de recuperación y rollback.",
      },
      pt: {
        description:
          "Conversor no local de Btrfs para Ext4 em dispositivos de bloco e imagens: journal de recuperação após queda, rollback e escalonamento conforme a memória.",
        problem: "Mover um sistema de arquivos em uso de Btrfs para Ext4 sem copiar tudo de novo.",
        outcome: "Conversão no local com journal de recuperação e rollback.",
      },
    },
  },
  "cowboy-bebop-grub-theme": {
    title: "Cowboy Bebop GRUB Theme",
    description: "Cowboy Bebop GRUB theme: series type and stills on the boot menu.",
    problem: "A boot menu that matched a Cowboy Bebop lockscreen.",
    outcome: "A GRUB theme built from the series type and stills.",
    imgSrc: "/cowboy-bebop-grub-theme.webp",
    alt: "Cowboy Bebop GRUB theme boot menu screenshot",
    tags: ["Shell", "GRUB", "Linux"],
    i18n: {
      es: {
        description:
          "Tema de GRUB con la estética de Cowboy Bebop: tipografía y fotogramas de la serie en el menú de arranque.",
        problem: "Un menú de arranque que combinara con el lockscreen de Cowboy Bebop.",
        outcome: "Un tema de GRUB armado con la tipografía y los fotogramas de la serie.",
      },
      pt: {
        description:
          "Tema de GRUB com a estética de Cowboy Bebop: tipografia e frames da série no menu de boot.",
        problem: "Um menu de boot que combinasse com o lockscreen de Cowboy Bebop.",
        outcome: "Um tema de GRUB feito com a tipografia e os frames da série.",
      },
    },
  },
  AppDespensa: {
    title: "App Despensa",
    description:
      "Point of sale for a pantry store: sales, cash drawer and stock. A local-first PWA built to work offline.",
    problem: "A pantry store needed sales, cash, and stock without a SaaS bill.",
    outcome: "A local-first PWA POS on React, Node, and PostgreSQL.",
    imgSrc: "/appdespensa.webp",
    alt: "App Despensa admin dashboard screenshot",
    tags: ["React", "Node", "PostgreSQL", "PWA"],
    i18n: {
      es: {
        description:
          "Punto de venta para un almacén: ventas, caja y stock. PWA local-first, pensada para funcionar sin conexión.",
        problem: "Un almacén necesitaba ventas, caja y stock sin pagar un SaaS.",
        outcome: "Un POS PWA local-first sobre React, Node y PostgreSQL.",
      },
      pt: {
        description:
          "Ponto de venda para uma mercearia: vendas, caixa e estoque. PWA local-first, pensada para funcionar sem conexão.",
        problem: "Uma mercearia precisava de vendas, caixa e estoque sem pagar um SaaS.",
        outcome: "Um PDV PWA local-first em React, Node e PostgreSQL.",
      },
    },
  },
  cleanupDiskW11: {
    title: "cleanupDiskW11",
    description: "Windows 11 disk cleanup helper with a small GUI.",
    problem: "Windows upgrades leaving disk clutter behind.",
    outcome: "A Python helper with a minimal GUI for the cleanup tasks.",
    imgSrc: "/cleanupDiskW11.webp",
    alt: "cleanupDiskW11 Windows 11 cleaner GUI screenshot",
    tags: ["Python", "Windows"],
    i18n: {
      es: {
        description: "Auxiliar de limpieza de disco para Windows 11 con una interfaz mínima.",
        problem: "Las actualizaciones de Windows 11 que dejan basura en el disco.",
        outcome: "Un auxiliar en Python con una interfaz mínima para las tareas de limpieza.",
      },
      pt: {
        description: "Auxiliar de limpeza de disco para Windows 11 com uma interface mínima.",
        problem: "Atualizações do Windows 11 que deixam lixo no disco.",
        outcome: "Um auxiliar em Python com uma interface mínima para as tarefas de limpeza.",
      },
    },
  },
  AhorrAR: {
    title: "AhorrAR",
    description:
      "Argentine supermarket prices scraped live, ranked and verifiable.",
    problem: "Grocery prices scattered across store sites.",
    outcome: "A live ranking with confirmed shipping.",
    imgSrc: "/ahorrar.webp",
    alt: "AhorrAR price comparison landing page screenshot",
    tags: ["React", "TypeScript", "Express", "Scrapling"],
    i18n: {
      es: {
        description:
          "Precios de supermercados argentinos scrapeados en vivo, ordenados y verificables.",
        problem: "Los precios de los supermercados argentinos están dispersos entre sitios.",
        outcome: "Un ranking en vivo con el envío confirmado.",
      },
      pt: {
        description:
          "Preços de supermercados argentinos raspados ao vivo, ordenados e verificáveis.",
        problem: "Os preços dos mercados argentinos estão espalhados entre sites.",
        outcome: "Um ranking ao vivo com o frete confirmado.",
      },
    },
  },
};

/* The cards the site serves are NOT here: `src/data/pinned-projects.json` is
   the one source (validated by `src/lib/validate-projects.js`, refreshed by
   `scripts/sync-projects.mjs`). A second, unvalidated copy used to live in
   this file as `PINNED_FALLBACK`, and because `WorkList` defaulted to it, a
   call site that forgot the prop rendered seven stale rows instead of the six
   the snapshot serves. It is gone: the render path has one input, and
   `WorkList` throws when it is missing. */

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
