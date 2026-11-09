# 🎷 Agustín Ciucani — Portfolio

> *I build your software, end to end.*

**[ciucani.vercel.app](https://ciucani.vercel.app)** · English · Español · Português

Hey, welcome in. Pull up a chair — this is the room where I keep my work.

It's my personal portfolio: a single page that plays like a set. A quiet intro,
the projects up front, a little about me, and an easy way to get in touch.
Under it all the background never stops moving — slow smoke, a grid of coral
lights breathing in time, and one secret waiting at the very end.

## 🎺 Why I built it

I made this portfolio to show my work, get known in the IT world and land my
first job in the field. This is its second take: the first version had fallen
behind and no longer represented the work I'm doing today, so I rebuilt it from
the ground up.

## 🎶 The little winks

- **The smoke and the coral lights come from _Bocanada_.** The dots behind every
  page pulse at **128 BPM** — the tempo of Cerati's song *Bocanada* — peaking
  right on the beat.
- **The smoke listens to you.** Move the cursor (or drag a finger) and it
  follows; leave it alone and it settles and goes still.
- **Your surname, played by hand.** The big *Ciucani* in the footer leans toward
  the pointer, letter by letter.
- **The logo is my signature.** Point at it and a stroke draws itself underneath
  while the ink catches the light.
- **The tech band feels your scroll.** The rows speed up and lean into a fast
  scroll, then straighten out on their own when you stop.
- **"I think it's time to blow this scene."** Hover that line in the footer (or
  hold it on a phone) and see what happens: an old CRT switches on and the
  ship flies past in halftone print, straight out of the *Tank!* opening.
  3, 2, 1… let's jam.
- **It speaks your language.** English, Spanish or Portuguese, picked from your
  browser before the page even arrives.

## 🌌 Inspiration

Two records play in this room.

**_Bocanada_ by Gustavo Cerati** — one of my favorite artists, and the album
that gives the visual system its name. The smoke drifting behind every page and
the coral dots glowing through it come straight from that cover.

**_Cowboy Bebop_** — the jazz, the late-night navy, and a ship that crosses the
screen when you find the easter egg in the footer.

---

## ✨ Features

- **Living background** — a WebGL fluid smoke over a CSS coral lattice; the
  lattice keeps the identity when WebGL, motion or JavaScript are off.
- **Motion that rests** — scroll-driven effects, a drifting tech marquee and
  word-by-word reveals, with zero frames requested while the page is still.
- **Three languages** — English, Spanish and Portuguese, prerendered and
  negotiated from the browser with no flash of English.
- **Accessible** — semantic structure, keyboard focus, `prefers-reduced-motion`
  and a readable no-JS version.
- **Fast on a phone** — the live smoke waits for a connection that can afford
  it; above-the-fold text paints on the first frame.
- **The Bebop easter egg** — a CRT intro and a React Three Fiber ship fly-by.

## 🛠️ Tech stack

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwindcss)
![Three.js](https://img.shields.io/badge/Three.js-R3F-000000?logo=threedotjs)
![GSAP](https://img.shields.io/badge/GSAP-3-88CE02?logo=greensock&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11-F69220?logo=pnpm&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

| Category  | Technology                                          |
| --------- | --------------------------------------------------- |
| Framework | Next.js 16 (App Router) · React 19                  |
| Styling   | Tailwind CSS 4 (`@theme static` tokens)             |
| Motion    | GSAP 3 · Lenis · Web Animations                     |
| 3D / FX   | Three.js · React Three Fiber · Drei · postprocessing |
| Fonts     | Manrope · Space Grotesk · Fraunces (`next/font`)    |
| Testing   | Node test runner · Playwright                       |
| Tooling   | ESLint · pnpm 11 · Node 22+                         |

## 🚀 Getting started

```bash
git clone https://github.com/YukaC/PortfolioReact.git
cd PortfolioReact
git lfs install   # the visual baseline screenshots live in Git LFS
pnpm install
pnpm dev          # http://localhost:3000
```

Requires **Node.js 22+** and **pnpm 11+**. To open the dev server from a phone on
the same network, run `pnpm dev:mobile` (the host must be listed in
`allowedDevOrigins` in `next.config.js`).

## 📦 Scripts

| Command               | What it does                                             |
| --------------------- | -------------------------------------------------------- |
| `pnpm dev`            | Development server                                       |
| `pnpm dev:mobile`     | Development server reachable from a phone                |
| `pnpm build` / `start`| Production build / serve it                              |
| `pnpm gate`           | Every quality gate (lint, unit, CSS, motion…) in one run |
| `pnpm test`           | Unit tests                                               |
| `pnpm lint`           | ESLint                                                   |
| `pnpm check:css`      | CSS budget: colour literals, dead classes, size drift    |
| `pnpm e2e:*`          | Browser suites: `a11y`, `functional`, `nojs`, `runtime`, `motion` |
| `pnpm visual:baseline` / `visual:diff` | Capture / compare the visual baseline   |
| `pnpm perf`           | Full performance and stress suite ([details](scripts/perf/README.md)) |
| `pnpm validate:bebop` | Bebop easter egg timing invariants                       |

## 🌍 Languages

`/` answers in the visitor's language through an internal rewrite to the
prerendered `/es` or `/pt` page, so the URL stays `/`. The order is `?lang=` →
cookie → `Accept-Language` → English. The logic lives in `src/proxy.js` and
`src/i18n/locale.js`; the dictionaries in `src/i18n/messages/` fall back to
English key by key.

## 🔄 Project data

The work list comes from `src/data/pinned-projects.json`, validated by
`src/lib/validate-projects.js`. The build never calls GitHub: a scheduled
workflow (`.github/workflows/projects-sync.yml`) refreshes the file every 6 hours
and commits it only when it changed.

## 📁 Project structure

```
PortfolioReact/
├── src/
│   ├── app/          # App Router routes, metadata, sitemap, OG images
│   ├── components/   # Sections, the field (AppBackground, LiquidEther), Bebop
│   ├── motion/       # Smooth scroll, scroll progress, GSAP setup
│   ├── hooks/        # Field motion, reveals, pointer light, Bebop
│   ├── i18n/         # Locale negotiation and dictionaries
│   ├── data/         # Projects, constants, Bebop timings
│   ├── lib/          # Pure helpers + unit tests
│   └── styles/       # globals.css (Tailwind v4 tokens and recipes)
├── public/           # Images, Bebop model, icons
├── scripts/          # Quality gates, e2e suites, perf tooling
├── docs/             # Design audit and CSS map
└── visual/           # Visual baseline (Git LFS)
```

For the reasoning behind the design and its measurements, see
[`docs/audit.md`](docs/audit.md) and [`docs/css-map.md`](docs/css-map.md).

## 📄 License

[MIT](./LICENSE)

---

**Built by [Agustín Ciucani](https://github.com/YukaC)** — see you, space cowboy. 🎷
