# ODD — glassmorphism-trust-hero

**Status:** in progress
**Branch:** `nvme/feat-agency-rebrand` (this worktree; twin of `feat/agency-rebrand`)
**delivery_strategy:** ask-on-risk
**Forecast authored lines:** ~250–350 (HeroSection rewrite + CSS additions + index.jsx wiring)

## Objective

Rebuild the portfolio hero following the 21st.dev "Glassmorphism Trust Hero" pattern: bold headline with gradient accent, a glass stats card, and a technology strip — adapted to Agustin's GitHub-driven content instead of fake social proof.

## Why

Current hero (photo + code terminal) reads generic. User wants a trust-first hero whose proof is real (his GitHub profile), with new headline copy.

## Specs (user request, verbatim)

- **S1:** "podemos implementar esto en el hero? que el texto sea "Turning Real Problems Into Working Software""
- **S2:** "https://21st.dev/@jahed/components/glassmorphism-trust-hero" (visual/structural reference)
- **S3:** "lo de proyectos entregados cambialo por otra tarjeta que se adapte a mi perfil de github o mi contenido"
- **S4:** "lo de trusted by industry leaders, tal vez sea mejor poner las tecnologias que utilizamos o algo así"
- **S5:** "tomáte tus libertades."

## Constraints (from repo history / prior sessions)

- No new dependencies (lucide-react in reference is OUT; use existing `Icon` component).
- English in code/UI, Spanish only to the user.
- Respect `prefers-reduced-motion` (existing pattern in globals.css).
- Keep existing tokens (jazz dark, primary #825ca3, amber glow), `hero-enter` stagger, a11y patterns (focus-ring, sr-only).
- Keep `id="home"` + `scrollToSectionByHash` CTA behavior.
- GitHub card data must come from the existing ISR scrape (`fetch-pinned-projects`), not a new fetch path.

## Design liberties taken (under S5)

- Remove profile photo + fake code terminal from hero (user previously rejected photo heroes; reference is card-based, no photo).
- Headline: "Turning Real Problems Into" + gradient-accented "Working Software".
- Glass card = "Live from GitHub": rotates through pinned repos (5s fade), pauses on hover, dots to select, static first repo under reduced motion. Footer links to github.com/YukaC.
- Tech strip ("Built with") reuses `SKILLS` icons as glass pills — replaces "Trusted by industry leaders".
- Subtle noise texture + radial glow behind card for the glassmorphism depth.

## Tasks

- **T1** (S2,S5, route: inline): globals.css — glass card utilities, card swap keyframes, reduced-motion guards.
- **T2** (S1,S2,S3,S4,S5, route: inline): rewrite `HeroSection.jsx` (headline, glass GitHub card, tech strip); wire `projects` prop in `index.jsx`.
- **T3** (all, route: inline): verify — `pnpm build`, `pnpm lint`, `pnpm e2e:a11y`; work-unit commit(s); record evidence here.

## Acceptance criteria

- Hero headline reads exactly "Turning Real Problems Into Working Software" (gradient on "Working Software").
- No "projects delivered" fake metric; glass card content derives from pinned repos data (adapts when profile pins change, via existing ISR).
- No "trusted by industry leaders"; tech strip shows technologies used.
- `pnpm build`, `pnpm lint`, `pnpm e2e:a11y` pass.
- Reduced motion: no rotation animation, static first repo.

## Log

- L1 (2026-10-14): Original request (S1–S5 above, verbatim).
- L2 (2026-10-14): T1/T2 implemented (route inline, single cohesive unit). Verification so far: `pnpm lint` PASS; `pnpm build` PASS after stale `.next` cache purge (first run failed on `next/font/google` module-not-found — stale cache, not the change; clean rebuild EXIT=0, 3 static pages, ISR 1h). `pnpm e2e:a11y` UNAVAILABLE: `playwright` not installed in this worktree (`ERR_MODULE_NOT_FOUND`) — environmental, script renders synthetic HTML only. Functional check in progress: serve production build and assert hero strings in served HTML.
