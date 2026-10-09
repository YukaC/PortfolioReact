# ODD — agency-rebrand

**Status:** in progress  
**Branch:** `feat/agency-rebrand` (tracker)  
**delivery_strategy:** ask-on-risk → chain chosen  
**chain_strategy:** feature-branch-chain  
**Forecast authored lines:** ~1200–2500 (excl. lockfile) → oversized path

## Objective

Rebrand PortfolioReact to modern agency dark-violet with Motion + vendored 21st/react-bits patterns; ship open audit fixes; speed local `pnpm dev`/`build` when the tree lives on HDD.

## Why

Portfolio reads template-purple; audit left contrast/skills/hero brand; cold Turbopack on HDD dominates DX (SPEC V3/B1).

## Scope

- Tokens violet oklch, Motion UI, hero brand-first, section motion, audit a11y/skills/scrape, Bebop CRT shell palette, SSD distDir/modules setup.
- Out: CSP enforce, TS migration, App Router, 3D ship remake, shadcn init.

## Constraints

- GSAP only Bebop; no idle Three prefetch; validate:bebop; MIT; EN UI copy.
- Deps: `motion` only (user-authorized). Prefer `pnpm` over npm.

## Delivery

| Slice | Work unit | PR target (planned) |
|-------|-----------|---------------------|
| W0 | SSD cache distDir + docs (T4) | child → tracker |
| W1 | tokens + `motion` | child → prior |
| W2 | hero + nav brand-first | … |
| W3 | sections Motion | … |
| W4 | audit fixes | … |
| W5 | Bebop shell palette | … |
| W6 | SPEC/README verify + LH notes | … |

## Checklist

- [x] T-ODD-01 Authorize chain + create feature doc
- [x] T-W0-01 NVMe worktree scripts (`setup:ssd` / `dev:nvme`) + README/SPEC T4
- [ ] T-W0-02 Create worktree, `pnpm install`, timed `pnpm build` on NVMe
- [ ] T-W1-01 Add `motion`, agency tokens
- [ ] T-W2-01 Hero brand-first + magnetic CTAs
- [ ] T-W3-01 Reveal → Motion sections
- [ ] T-W4-01 Contrast AA, skills, scrape guard, a11y labels
- [ ] T-W5-01 Bebop CRT/endcard tokens
- [ ] T-W6-01 lint / validate:bebop / build / LH notes

## Acceptance

- Cold compile writes land on NVMe when `.ssd-cache` present.
- Visual agency violet; Bebop timings still validate.
- Audit P0–P2 from GGC canvas addressed except CSP/TS.

## Progress / evidence

- 2026-10-09: `chain_strategy=feature-branch-chain`; root cause HDD confirmed (`df` sdb1 vs nvme home); W0 implemented in tree.
- Commits: pending (first work-unit after W0 verify).

## Next

Apply SSD cache locally, verify timed build, commit W0, start W1.
