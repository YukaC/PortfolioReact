# 🎷 Portfolio - Agustin Ciucani

> Fullstack Developer portfolio.

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)
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
- **♿ Accessibility** — ARIA labels, semantic roles, focus trap/restore in the easter egg
- **🎨 Responsive design** — Mobile-first, dark theme
- **🔤 Typography** — Manrope + Space Grotesk via `next/font`
- **🎬 Motion** — Scroll reveal, hero entrance, skills ticker; CRT intro + R3F fly-by
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

## 🎨 CSS Variables

Dark tokens live in `@theme` (`src/styles/globals.css`):

```css
@theme {
  --color-primary: #825ca3;
  --color-secondary: #5e3b5a;
  --color-amber-glow: #ffbf00;
  --color-available: #3ecf8e;
  --color-bg-main: #19161c;
  --color-text: #e5e5e5;
  --color-text-muted: #9ca3af;
}
```

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

**Built by [Agustin Ciucani](https://github.com/YukaC)** 🚀
