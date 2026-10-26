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
| `pnpm dev:mobile`     | Same, bound to `0.0.0.0` for a phone|
| `pnpm build`          | Create a production build           |
| `pnpm start`          | Run the production build            |
| `pnpm lint`           | Run ESLint                          |
| `pnpm e2e:a11y`       | Browser check of the real site      |
| `pnpm e2e:motion`     | Footer wordmark motion, in a browser|
| `pnpm check:motion`   | Static GSAP reset-target guard      |
| `pnpm validate:bebop` | Validate Bebop easter egg invariants |

`pnpm e2e:a11y` runs the house browser verifier (`~/.agents/scripts/browser-verify`) against
the real site, using the rules declared in `browser-verify.json`: document metadata, a single
`h1`, `alt` on every image, resolvable in-page anchors, no console errors, a usable first Tab
stop, accessible names, a hero that survives `prefers-reduced-motion`, and no horizontal
overflow. It reuses a dev server already running for this checkout, or starts one.

```bash
pnpm e2e:a11y                                      # uses browser-verify.json
pnpm e2e:a11y -- --base-url http://localhost:3000  # reuse a specific server
pnpm e2e:a11y -- --json --report .browser-verify/report.json
```

### Wordmark motion

The footer surname reacts to the pointer: each letter lifts, scales and brightens. That
contract needs real input and computed styles, which the declarative catalog cannot express,
so it has its own runner. `pnpm e2e:motion` drives real pointer moves and asserts every
observable effect — the `--b` brightness channel, `scaleX`/`scaleY` staying equal and above 1,
the `translateY` lift, the falloff for letters out of reach, the return to rest when the
pointer leaves, a clean console — plus `prefers-reduced-motion: reduce` and a touch device,
where the effect must stay off. It reuses a running dev server or starts one.

```bash
pnpm e2e:motion                                   # reuses localhost:3000
pnpm e2e:motion -- --base-url http://localhost:3000
pnpm e2e:motion -- --headed                       # watch it happen
```

`pnpm check:motion` is the cheap half: a static guard, no browser. `gsap.quickTo()` resets a
tween through `resetTo()`, which can only rewrite a property GSAP already tracks under that
exact name. CSSPlugin expands a few properties before that point (`scale` → `scaleX` +
`scaleY`, and the same for `autoAlpha`/`alpha`), so a `quickTo(…, "scale")` warns
"not eligible for reset" once per call and animates nothing. The guard reads the alias list
from the installed GSAP and fails on any alias used as a reset target.

### Phone access (Tailscale or LAN)

Next 16 already binds `next dev` to `0.0.0.0`; `pnpm dev:mobile` states it explicitly for the
case where the flag matters (older Next, or a wrapper that overrides the default). What
actually blocks a phone is `allowedDevOrigins` in `next.config.js`: an origin that is not
listed gets its `/_next/*` requests rejected, so the HTML loads but the client chunks and
HMR do not.

```bash
pnpm dev:mobile
# then on the phone, same tailnet:
#   http://yuka.tail901e3b.ts.net:3000   (MagicDNS)
#   http://100.120.254.30:3000           (Tailscale IP, no DNS needed)
```

Both hosts are allow-listed. `0.0.0.0` also exposes the dev server to the LAN, not only to
Tailscale: if that matters, bind the tailnet address alone with `pnpm dev -- -H 100.120.254.30`.
Re-check the hosts after a tailnet rename or an IP change (`tailscale ip -4`,
`tailscale status --json`).

## 📁 Project Structure

```
PortfolioReact/
├── src/
│   ├── components/           # UI + Bebop
│   │   ├── Layout.jsx
│   │   ├── Navbar.jsx
│   │   ├── HeroSection.jsx
│   │   ├── Marquee.jsx
│   │   ├── WorkList.jsx
│   │   ├── About.jsx
│   │   ├── Contact.jsx
│   │   ├── Footer.jsx
│   │   ├── AppBackground.jsx
│   │   ├── LiquidEther.jsx
│   │   ├── Reveal.jsx        # + SplitHeading, RollingLabel, SwapArrow
│   │   ├── Icon.jsx
│   │   ├── BebopAnimation.jsx
│   │   ├── BebopShip.jsx
│   │   └── bebop/            # R3F scene, ship, halftone, CSS module
│   ├── pages/                # Next.js Pages Router
│   ├── styles/               # globals.css (Tailwind v4 @theme static)
│   ├── data/                 # constants, projects, bebop-timings, bebopShip, bebopShots
│   ├── hooks/                # useFieldMotion, useRevealOnEnter, usePointerLight, useBebopAnimation
│   └── utils/                # scroll-to-section
├── public/                   # Static assets (WebP, bebop GLTF), robots.txt, sitemap
├── scripts/                  # e2e-a11y, e2e-footer-motion, check-motion-aliases, validate-bebop-timing
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

Bocanada is the north star, retoned for a navy field: the smoke, the coral
lattice and its spring flares are the only things allowed to move on their own.
Shared layout is `.site-shell` (max 80rem, 44–128px inset) and `.section-y`
(top padding only — sections breathe through space, not borders).

One motion channel feeds every layer: `useFieldMotion` writes `--scy`, `--p`,
`--hf`, `--px/--py` and `--mx/--my` on `:root` from a single rAF loop with
inertia; About and Footer own `--tlp` and `--fp` through ScrollTrigger scrubs.
Text stands directly on the field and carries a dark halo; glass (`.glass`) is
used only where a surface has a job — the scrolled nav pill, the work preview
and its tag. Motion presets live in `src/motion/config.js`. Task notes:
`odd/tasks/glass-motion-rebrand.md`.

### Field quality on a phone

The liquid field is one simulation with one set of constants. `getSimQuality` in
`src/components/AppBackground.jsx` returns `{ resolution: 0.32, iterationsPoisson: 12 }` for
every device; the only things that turn it off are `prefers-reduced-motion` and
`navigator.connection.saveData`, and then the CSS field underneath carries the section on its
own.

`resolution` is relative to the canvas, so one constant means one thing everywhere: the dye's
simulation targets are 0.32 of the viewport, which is the same density of dye cells per CSS
pixel on a phone as on a desktop. A 390×844 phone gets 125×270 targets against a 1440×900
desktop's 460×288 — a third of the cells, and a third of the cost. That is also why there is no
separate coarse-pointer profile any more: measured on a 4× throttled Pixel 8 profile, the old
`0.22 / 8` bought nothing (59.8 vs 59.9 fps, 0 janky on both, renderer within 20 ms over 6 s of
scroll) and cost the smoke its detail. The canvas itself runs at `pixelRatio = 1`
(`LiquidEther.jsx`), so a DPR-3 phone is not paying three times the pixels either.
Two consequences worth knowing before touching the constants: the dye's *fluidity* is the
render-target grid, not the pointer, and the touch drag is part of the design — `touchstart` /
`touchmove` drive the same field the desktop pointer does. Task notes:
`odd/tasks/mobile-field-parity.md`.

Dark tokens live in `@theme static` (`src/styles/globals.css`):

```css
@theme static {
  --color-ink: #060b1a;
  --color-night: #0a1226;
  --color-deep: #0e1830;
  --color-mist: #16233d;
  --color-fog: #c9d6ea;
  --color-paper: #eef2ff;
  --color-mut: #a9b6d3;
  --color-dim: #93a2ba;
  --color-sky: #8fcbff;   /* type accent */
  --color-ice: #8fcbff;   /* alias of sky */
  --color-coral: #e2727f; /* field lattice */
}
```

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

**Built by [Agustin Ciucani](https://github.com/YukaC)** 🚀
