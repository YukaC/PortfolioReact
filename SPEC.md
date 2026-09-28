# SPEC — PortfolioReact / portfolio personal Next.js

§G
Portfolio público Agustin Ciucani: proyectos/skills + easter egg Bebop (R3F). Deploy Vercel.

§C
- stack: Next.js 16 Pages Router · React 19 · Tailwind 4 · pnpm 11 · Node 22+
- motion: GSAP + R3F/drei/three · fonts Manrope/Space Grotesk
- ! a11y en easter egg (focus trap/restore, ARIA)
- LICENSE MIT · remote `YukaC/PortfolioReact`
- docs: `README.md` · issue #20 HDD/dev perf

§I
```
cmd: pnpm dev|build|start|lint|validate:bebop
route: / (pages) · public assets WebP/GLTF
file: src/components/* · src/pages/* · src/data/* · next.config.js
ci: .github/workflows
env: none required for static portfolio
```

§V
```
V1: ∀ Bebop timing constants → validate:bebop pasa
V2: production headers: frame deny + CSP report-only
V3: cold next dev en HDD → documentar SSD/cache (⊥ chase pin-scrape como root cause)
```

§T
```
id|status|task|cites
T1|x|portfolio UI + Bebop easter egg|§G
T2|x|docs/security/dependabot hygiene|§C
T3|x|README troubleshooting HDD/#20|V3
T4|.|opcional distDir/.next en SSD script|V3
```

§B
```
id|date|cause|fix
B1|2026-09-28|slow filesystem HDD next turbopack|V3
```
