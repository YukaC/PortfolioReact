/**
 * GitHub profile used for pinned repos (source of truth for the grid).
 * Optional overrides polish title / copy / screenshot / tags per repo slug.
 */
export const GITHUB_USERNAME = "YukaC";

/** @type {Record<string, { title?: string, description?: string, imgSrc?: string, alt?: string, tags?: string[] }>} */
export const PROJECT_OVERRIDES = {
  PortfolioReact: {
    title: "Professional Portfolio",
    description:
      "Personal website featuring Server-Side Rendering for optimized SEO, built with modular and reusable Tailwind CSS components.",
    imgSrc: "/img3.webp",
    alt: "Portfolio Screenshot",
    tags: ["React", "Next.js", "Tailwind CSS"],
  },
  MuniDgoSaaS: {
    title: "Turnos App",
    description:
      "Multi-tenant appointment management app featuring real-time validation, an admin dashboard, and data visualization with ECharts.",
    imgSrc: "/img1.webp",
    alt: "Turnos App Screenshot",
    tags: ["JavaScript", "Python", "Flask", "MySQL"],
  },
  btrfs2ext4: {
    title: "btrfs2ext4",
    description:
      "In-place Btrfs → Ext4 converter for block devices and images — crash-recovery journal, rollback, and memory-aware scaling.",
    imgSrc: "/btrfs2ext4.webp",
    alt: "btrfs2ext4 dry-run terminal screenshot",
    tags: ["C", "Linux", "btrfs", "ext4"],
  },
  "cowboy-bebop-grub-theme": {
    title: "Cowboy Bebop GRUB Theme",
    description: "Cowboy Bebop–themed GRUB bootloader theme.",
    imgSrc: "/cowboy-bebop-grub-theme.webp",
    alt: "Cowboy Bebop GRUB theme boot menu screenshot",
    tags: ["Shell", "GRUB", "Linux"],
  },
  AppDespensa: {
    title: "App Despensa",
    description:
      "Local-first PWA POS for a pantry/grocery store — sales dashboard, caja, products, and stock intake (React + Node + PostgreSQL).",
    imgSrc: "/AppDespensa.webp",
    alt: "App Despensa admin dashboard screenshot",
    tags: ["React", "Node", "PostgreSQL", "PWA"],
  },
  cleanupDiskW11: {
    title: "cleanupDiskW11",
    description: "Windows 11 disk cleanup helper script.",
    imgSrc: "/cleanupDiskW11.webp",
    alt: "cleanupDiskW11 Windows 11 cleaner GUI screenshot",
    tags: ["Python", "Windows"],
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
    imgSrc: "/img3.webp",
    alt: "Portfolio Screenshot",
    tags: ["React", "Next.js", "Tailwind CSS"],
    repoLink: "https://github.com/YukaC/PortfolioReact",
  },
  {
    name: "MuniDgoSaaS",
    title: "Turnos App",
    description:
      "Multi-tenant appointment management app featuring real-time validation, an admin dashboard, and data visualization with ECharts.",
    imgSrc: "/img1.webp",
    alt: "Turnos App Screenshot",
    tags: ["JavaScript", "Python", "Flask", "MySQL"],
    repoLink: "https://github.com/YukaC/MuniDgoSaaS",
  },
  {
    name: "btrfs2ext4",
    title: "btrfs2ext4",
    description:
      "In-place Btrfs → Ext4 converter for block devices and images — crash-recovery journal, rollback, and memory-aware scaling.",
    imgSrc: "/btrfs2ext4.webp",
    alt: "btrfs2ext4 dry-run terminal screenshot",
    tags: ["C", "Linux", "btrfs", "ext4"],
    repoLink: "https://github.com/YukaC/btrfs2ext4",
  },
  {
    name: "cowboy-bebop-grub-theme",
    title: "Cowboy Bebop GRUB Theme",
    description: "Cowboy Bebop–themed GRUB bootloader theme.",
    imgSrc: "/cowboy-bebop-grub-theme.webp",
    alt: "Cowboy Bebop GRUB theme boot menu screenshot",
    tags: ["Shell", "GRUB", "Linux"],
    repoLink: "https://github.com/YukaC/cowboy-bebop-grub-theme",
  },
  {
    name: "AppDespensa",
    title: "App Despensa",
    description:
      "Local-first PWA POS for a pantry/grocery store — sales dashboard, caja, products, and stock intake (React + Node + PostgreSQL).",
    imgSrc: "/AppDespensa.webp",
    alt: "App Despensa admin dashboard screenshot",
    tags: ["React", "Node", "PostgreSQL", "PWA"],
    repoLink: "https://github.com/YukaC/AppDespensa",
  },
  {
    name: "cleanupDiskW11",
    title: "cleanupDiskW11",
    description: "Windows 11 disk cleanup helper script.",
    imgSrc: "/cleanupDiskW11.webp",
    alt: "cleanupDiskW11 Windows 11 cleaner GUI screenshot",
    tags: ["Python", "Windows"],
    repoLink: "https://github.com/YukaC/cleanupDiskW11",
  },
];
