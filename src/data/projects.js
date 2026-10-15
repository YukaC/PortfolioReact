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
 */

/** @type {Record<string, ProjectOverride>} */
export const PROJECT_OVERRIDES = {
  PortfolioReact: {
    title: "Professional Portfolio",
    description:
      "Personal website featuring Server-Side Rendering for optimized SEO, built with modular and reusable Tailwind CSS components.",
    problem: "This site needed to read as a working practice, not a template.",
    outcome:
      "Next.js SSG/ISR, a Bocanada visual system, and a WebGL easter egg.",
    imgSrc: "/img3.webp",
    alt: "Portfolio Screenshot",
    tags: ["React", "Next.js", "Tailwind CSS"],
  },
  MuniDgoSaaS: {
    title: "Turnos App",
    description:
      "Multi-tenant appointment management app featuring real-time validation, an admin dashboard, and data visualization with ECharts.",
    problem:
      "A municipality needed one place to take appointments across tenants.",
    outcome:
      "A Flask and React app with live validation, an admin dashboard, and ECharts.",
    imgSrc: "/img1.webp",
    alt: "Turnos App Screenshot",
    tags: ["JavaScript", "Python", "Flask", "MySQL"],
    isFeatured: true,
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
  },
  "cowboy-bebop-grub-theme": {
    title: "Cowboy Bebop GRUB Theme",
    description: "Cowboy Bebop themed GRUB bootloader theme.",
    problem: "A boot menu that matches a Cowboy Bebop lockscreen.",
    outcome: "A GRUB theme with the series type and stills.",
    imgSrc: "/cowboy-bebop-grub-theme.webp",
    alt: "Cowboy Bebop GRUB theme boot menu screenshot",
    tags: ["Shell", "GRUB", "Linux"],
  },
  AppDespensa: {
    title: "App Despensa",
    description:
      "Local-first PWA POS for a pantry store: sales dashboard, caja, products, and stock intake (React + Node + PostgreSQL).",
    problem:
      "A pantry store needed sales, cash, and stock without a SaaS bill.",
    outcome: "A local-first PWA POS on React, Node, and PostgreSQL.",
    imgSrc: "/AppDespensa.webp",
    alt: "App Despensa admin dashboard screenshot",
    tags: ["React", "Node", "PostgreSQL", "PWA"],
  },
  cleanupDiskW11: {
    title: "cleanupDiskW11",
    description: "Windows 11 disk cleanup helper script.",
    problem: "Windows 11 installs leaving disk clutter after upgrades.",
    outcome: "A Python helper with a small GUI for cleanup tasks.",
    imgSrc: "/cleanupDiskW11.webp",
    alt: "cleanupDiskW11 Windows 11 cleaner GUI screenshot",
    tags: ["Python", "Windows"],
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
  },
};

/**
 * Used when the public profile scrape fails.
 * Keep in sync with current profile pins when possible.
 */
export const PINNED_FALLBACK = [
  {
    name: "PortfolioReact",
    title: "Professional Portfolio",
    description:
      "Personal website featuring Server-Side Rendering for optimized SEO, built with modular and reusable Tailwind CSS components.",
    problem: "This site needed to read as a working practice, not a template.",
    outcome:
      "Next.js SSG/ISR, a Bocanada visual system, and a WebGL easter egg.",
    imgSrc: "/img3.webp",
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
    imgSrc: "/img1.webp",
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
    imgSrc: "/AppDespensa.webp",
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
