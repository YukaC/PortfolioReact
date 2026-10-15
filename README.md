# 🎷 Portfolio - Agustin Ciucani

> Fullstack Developer portfolio.

![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3-38B2AC?logo=tailwindcss)
![Three.js](https://img.shields.io/badge/Three.js-R3F-000000?logo=threedotjs)
![GSAP](https://img.shields.io/badge/GSAP-88CE02?logo=greensock&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11-F69220?logo=pnpm&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## 📚 Description

Personal portfolio built with **Next.js 16** and **React 19**, showcasing my projects and skills as a Fullstack Developer. It features a modern dark UI, smooth motion, and a Cowboy Bebop–themed easter egg (WebGL silhouette via React Three Fiber).

### ✨ Features

- **🚀 Performance** — Below-the-fold code-splitting, `next/image` (AVIF/WebP), Bebop timings kept off the critical path
- **♿ Accessibility** — ARIA labels, semantic roles, featured-repo pause/previous/next (44px targets), focus trap/restore in the easter egg
- **🎨 Responsive design** — Mobile-first, dark theme
- **🔤 Typography** — Manrope + Space Grotesk via `next/font`
- **🎬 Motion** — GSAP springs, scroll reveal, hero intro, image parallax; CRT intro + R3F fly-by
- **📱 Touch** — Hold the footer line to trigger the easter egg on mobile

## 🛠️ Tech Stack

| Category     | Technology                                 |
| ------------ | ------------------------------------------ |
| Framework    | Next.js 16 (Pages Router)                  |
| UI Library   | React 19                                   |
| Styling      | Tailwind CSS 4 + CSS variables (`@theme`)  |
| 3D / FX      | Three.js, R3F, Drei, postprocessing, GSAP  |
| Fonts        | Google Fonts (optimized)                   |
| Icons        | Custom SVGs (`Icon.jsx`)                   |
| Linting      | ESLint 9 + eslint-config-next              |
| Package mgr  | pnpm 11                                    |

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/YukaC/PortfolioReact.git
cd PortfolioReact

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Available Scripts

| Command               | Description                         |
| --------------------- | ----------------------------------- |
| `pnpm dev`            | Start the development server        |
| `pnpm build`          | Create a production build           |
| `pnpm start`          | Run the production build            |
| `pnpm lint`           | Run ESLint                          |
| `pnpm validate:bebop` | Validate Bebop easter egg invariants |

## 📁 Project Structure

```
PortfolioReact/
├── src/
│   ├── components/           # UI + Bebop
│   │   ├── Layout.jsx
│   │   ├── Navbar.jsx
│   │   ├── HeroSection.jsx
│   │   ├── SkillsTicker.jsx
│   │   ├── ProjectsGrid.jsx
│   │   ├── Experience.jsx
│   │   ├── Contact.jsx
│   │   ├── Footer.jsx
│   │   ├── Reveal.jsx
│   │   ├── Icon.jsx
│   │   ├── BebopAnimation.jsx
│   │   ├── BebopShip.jsx
│   │   └── bebop/            # R3F scene, ship, halftone, CSS module
│   ├── pages/                # Next.js Pages Router
│   ├── styles/               # globals.css (Tailwind v4 @theme)
│   ├── data/                 # constants, projects, bebop-timings, bebopShip, bebopShots
│   ├── hooks/                # useBebopAnimation, useInView
│   └── utils/                # scroll-to-section
├── public/                   # Static assets (WebP, bebop GLTF), robots.txt, sitemap
├── scripts/                  # validate-bebop-timing, bebop-ship-meta
├── .github/workflows/        # CI (Node 22, pnpm)
├── .nvmrc                    # Node 22 (matches CI)
├── LICENSE                   # MIT
└── package.json
```

## 🌐 Deploy

### Vercel (recommended)

```bash
pnpm add -g vercel
vercel
```

### Other platforms

Works with Netlify, Railway, and [Next.js Docker](https://nextjs.org/docs/deployment#docker-image).

## 🔧 Requirements

- **Node.js** 22+ (see `engines` in `package.json`, `.nvmrc`, and CI — local Node 26 OK)
- **pnpm** 11+ (see `packageManager` in `package.json`)

## 🐢 Local development on a slow disk (HDD)

Stay on **Next.js** (Vercel, ISR pins, Bebop). The slow part is not “Next vs Vite” in the abstract: this app pulls **three / R3F / drei / postprocessing / gsap**, and Turbopack is I/O-heavy. On a spinning HDD (e.g. `/mnt/JuegosHDD`) cold compile hurts; the same tree on NVMe is fine.

**Do not** symlink `.next` or `node_modules` across disks — Turbopack rejects out-of-root `node_modules` symlinks, and a cross-device `.next` breaks PostCSS.

**Recommended: NVMe git worktree**

```bash
# From the HDD checkout (stop any next first)
pnpm setup:ssd         # creates ~/ssd-cache/PortfolioReact/wt
pnpm setup:ssd:store   # optional: pnpm store-dir on NVMe inside the worktree
# Open that folder in Cursor, then:
cd ~/ssd-cache/PortfolioReact/wt && pnpm dev
```

Convenience from the HDD tree (runs inside the worktree — use after the worktree has your commits):

```bash
pnpm dev:nvme
pnpm build:nvme
```

Prefer **pnpm** (`packageManager`); `npm run …` works but locks/CI use pnpm.

**Not the main bottleneck:** GitHub pin scrape in `getStaticProps` (~hundreds of ms). See [#20](https://github.com/YukaC/PortfolioReact/issues/20).

## Visual system

Bocanada (cobalt field, coral lattice, ice accent) is the north star. Shared
layout is `.site-shell` (max 88rem, 24/48/64px inset) and `.section-y`.
Glass is a frosted panel (`.glass-card`), not a second theme. Hero, work,
about, and footer share `.site-shell`. The GitHub card in the hero has
previous / next / pause controls and a live region. Motion lives in
`src/motion/config.js`. Task notes: `odd/tasks/agency-bocanada-pass.md`.

Dark tokens live in `@theme` (`src/styles/globals.css`):

```css
@theme {
  --color-ink: #0a0f1c;
  --color-night: #0e1626;
  --color-deep: #131d33;
  --color-mist: #1b2742;
  --color-fog: #d0dceb;
  --color-paper: #e6ecf5;
  --color-ice: #8fb4e8;
}
```

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

**Built by [Agustin Ciucani](https://github.com/YukaC)** 🚀
