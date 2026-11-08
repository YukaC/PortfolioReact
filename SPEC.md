# SPEC — PortfolioReact / portfolio personal Next.js

§G
Portfolio público Agustin Ciucani: agency dark-violet + Bebop (R3F). Deploy Vercel.

§C
- stack: Next.js 16 Pages Router · React 19 · Tailwind 4 · pnpm 11 · Node 22+
- motion UI: `motion` · Bebop: GSAP + R3F/drei/three · fonts Manrope/Space Grotesk
- ! a11y en easter egg (focus trap/restore, ARIA)
- ! el árbol vive en NVMe (`/home/yuka/Proyectos/PortfolioReact`); `/mnt/JuegosHDD/Proyectos/PortfolioReact` es un symlink · ⊥ symlink `.next`/`node_modules` entre filesystems (Turbopack lo rechaza) · ⊥ worktree duplicado
- LICENSE MIT · remote `YukaC/PortfolioReact`
- docs: `README.md` · issue #20 HDD/dev perf · `odd/tasks/agency-rebrand.md`

§I
```
cmd: pnpm dev|dev:mobile|build|start|lint|validate:bebop|check:css|test|perf|perf:quick|perf:stress|perf:ablate
route: / (pages) · public assets WebP/GLTF
file: src/components/* · src/pages/* · src/data/* · next.config.js · scripts/perf/*
ci: .github/workflows
env: none required
```

§V
```
V1: ∀ Bebop timing constants → validate:bebop pasa
V2: production headers: frame deny + CSP report-only
V3: el árbol vive en NVMe (`~/Proyectos/PortfolioReact`, ruta HDD = symlink) · `next dev` sin warning de slow filesystem (⊥ symlink .next/node_modules cross-fs; ⊥ worktree duplicado; ⊥ blame pin-scrape)
V4: CTAs/tags WCAG AA contrast on primary surfaces
```

§T
```
id|status|task|cites
T1|x|portfolio UI + Bebop easter egg|§G
T2|x|docs/security/dependabot hygiene|§C
T3|x|README troubleshooting HDD/#20|V3
T4|x|árbol movido a NVMe + symlink en la ruta HDD; tooling de worktree eliminado|V3
T5|.|agency rebrand violet + Motion UI|§G,V4
T6|.|audit a11y/skills/scrape guards|V4
T7|.|Bebop CRT shell → agency palette|V1
```

§B
```
id|date|cause|fix
B1|2026-09-28|slow filesystem HDD next turbopack|V3
```
