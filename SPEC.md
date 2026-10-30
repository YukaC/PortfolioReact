# SPEC — PortfolioReact / portfolio personal Next.js

§G
Portfolio público Agustin Ciucani: agency dark-violet + Bebop (R3F). Deploy Vercel.

§C
- stack: Next.js 16 Pages Router · React 19 · Tailwind 4 · pnpm 11 · Node 22+
- motion UI: `motion` · Bebop: GSAP + R3F/drei/three · fonts Manrope/Space Grotesk
- ! a11y en easter egg (focus trap/restore, ARIA)
- ! cold compile en HDD → `pnpm setup:ssd` (worktree NVMe; ⊥ symlink node_modules)
- LICENSE MIT · remote `YukaC/PortfolioReact`
- docs: `README.md` · issue #20 HDD/dev perf · `odd/tasks/agency-rebrand.md`

§I
```
cmd: pnpm dev|build|start|lint|validate:bebop|setup:ssd|setup:ssd:store|dev:nvme|build:nvme
route: / (pages) · public assets WebP/GLTF
file: src/components/* · src/pages/* · src/data/* · next.config.js · scripts/setup-ssd-cache.mjs · scripts/run-nvme.mjs
ci: .github/workflows
env: none required · .ssd-cache local marker (worktree path)
```

§V
```
V1: ∀ Bebop timing constants → validate:bebop pasa
V2: production headers: frame deny + CSP report-only
V3: cold next en HDD → NVMe worktree via setup:ssd (⊥ symlink node_modules; ⊥ blame pin-scrape)
V4: CTAs/tags WCAG AA contrast on primary surfaces
```

§T
```
id|status|task|cites
T1|x|portfolio UI + Bebop easter egg|§G
T2|x|docs/security/dependabot hygiene|§C
T3|x|README troubleshooting HDD/#20|V3
T4|x|NVMe worktree setup:ssd + run-nvme|V3
T5|.|agency rebrand violet + Motion UI|§G,V4
T6|.|audit a11y/skills/scrape guards|V4
T7|.|Bebop CRT shell → agency palette|V1
```

§B
```
id|date|cause|fix
B1|2026-09-28|slow filesystem HDD next turbopack|V3
```
