# ODD — agency-bocanada-pass

**Status:** done
**Branch:** `feat/agency-rebrand`
**delivery_strategy:** ask-on-risk
**Forecast authored lines:** ~700–900 (hero, work, about, nav, footer, tokens, docs)

## Objective

Bring the public site in line with the Bocanada editorial system so it reads as a working software practice: same shell as the rest of the page, a glass panel that can sit on the cobalt field, accessible featured-repo controls, one contact intent, a featured-plus-grid work section, glass nav from rest, and a quiet beam wordmark at the close.

## Why

The body already uses ice/fog/`site-shell`. The hero was a second genre (pills, orbs, `rounded-3xl`, `px-6`). Glass washed out on the Bocanada field. Carousel pips were 6px with no previous/next. Work zigzagged six GitHub pins. About and Experience both lit in the spy.

## Constraints

- Bocanada is the faro. No re-theme. No new dependencies.
- No custom cursor. No newsletter. No second marquee (`SkillsTicker` stays unmounted).
- English UI copy. No em-dashes in visible strings.
- GSAP + Lenis + ScrollTrigger only. Honor `prefers-reduced-motion` and `prefers-reduced-transparency`.
- Keep Bebop hold-to-play on the footer line. Keep `id="home"` / `#portfolio` / `#contact`.
- One CTA intent for contact (`Get in Touch` → `#contact` / mailto). Hero CTA is work.

## Tasks

- **T1** Data + tokens: `problem` / `outcome` / `isFeatured` on pins; glass contrast; `site-nav` glass at rest; magnetic `x`/`y` init.
- **T2** Hero: `site-shell`, `min-h-[100dvh]`, screenshot in glass, one magnetic CTA, prev/next/pause + 44px dots in `btn-nav` language, keyboard, `aria-live`. Same 5+6 column rhythm as About.
- **T3** Work: one featured case + two-column tiles; practice copy; image parallax (`transform` only).
- **T4** About: practice copy, smaller education, single nav item `#about`. Nav spy without Experience/About collision.
- **T5** Footer: ice beam + cropped wordmark. Bebop line unchanged.
- **T6** Docs: this file, `CHANGELOG.md`, README feature line. Verify lint, build, browser.

## Acceptance

- Hero and sections share `.site-shell` inline padding (24 / 48 / 64).
- `.glass-card` reads against `#02122d`; solid fill when `prefers-reduced-transparency`.
- Featured-repo control: previous, next, pause (WCAG 2.2.2), labelled 44px dots in `btn-nav` language, arrow keys, live region, pause on hover/focus, static under reduced motion.
- No `btn-ghost`. One primary hero button.
- Work is 1 featured + remaining tiles, not a six-row zigzag.
- Nav has Projects + About (+ Get in Touch). About and Experience do not double-light.
- Footer has a cropped wordmark and one ice beam. No newsletter. Bebop trigger still works.
- `pnpm lint` and `pnpm build` pass. Desktop and a mobile viewport checked in the browser.

## Log

- L1 (2026-10-15): Authorized from audit + user notes (glass contrast, carousel a11y, hero margins).
- L2 (2026-10-15): T1–T5 implemented. Hero on `site-shell` + screenshot glass + prev/next. Work featured+grid + parallax. About `#about`. Nav glass at rest. Footer beam/wordmark. Magnetic `gsap.set` before `quickTo`. Docs: CHANGELOG + README tokens.
- L3 (2026-10-15): Browser pass on `:3002` (HDD tree). Hero shell aligns with nav (logo/h1 left 548px). Carousel next swaps screenshot. Work is Turnos featured + 2-col tiles. Footer wordmark `CIUCANI`, beam present, no `btn-ghost`. Mobile: hamburger + stacked hero. Follow-up: drop gradient clip on "Working Software" (shadow made it muddy); stack GitHub link under controls. `pnpm lint` PASS. `pnpm build` after visual follow-up.
- L4 (2026-10-15): User asked to land the audit plus carousel a11y and even hero insets. Added pause/play (`aria-pressed`, live region "paused"), `arrow_back`/`pause`/`play` icons, dots as 2px ice ticks matching `btn-nav`, hamburger as `btn-icon`. Hero copy `col-span-6` / card `col-span-5 col-start-8` so the title is two lines and padding matches the nav (both 64px / h1 left 77). Verified on `:3000`: pause, dots, ArrowRight, Turnos featured + tiles, footer wordmark, mobile hamburger 44px. `pnpm lint` PASS. `pnpm build` PASS.
