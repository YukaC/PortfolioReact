# Feature: mobile-field-parity — PortfolioReact (feat/agency-rebrand)

Make the dye on a phone look like the dye on a desktop. The plan the user approved was "bake a video
of the field and stop simulating on touch"; the source read and the measured evidence retired that
plan before any code was written, and the replacements below are cheaper and keep the touch response.

Status: closed (2026-10-26). Field parity shipped, T2 dropped, checks green. Nothing committed —
the branch still carries the whole uncommitted rebrand/perf pass, and commit grouping is the user's
decision.

## Specs

- S1 — verbatim request (2026-10-26): "si es lo recomendado, implementalo entonces, documenta todo lo necesario. el faro es que se mantenga lo mas similar ql live de desktop"
- S2 — verbatim, the symptom: "no se que recomendas, creo que la anima ya hecha seria mejor por que la fluidez del humo se pierde en el touchscreen y no se aplica xomo en pc"
- S3 — verbatim, the goal: "me parece mejor approach en mobil3 dejar una animacion ya hecha, cosa de no renderizarla y maximizariamos el rendimiento a full."
- S4 — From S1: on a coarse pointer the dye must read as the desktop dye — same relative detail, same drift, same density — and must still answer a touch drag.
- S5 — From S3: whatever ships must not cost mobile frame time or mobile idle CPU. If the numbers regress, the cheaper route wins even when it is not the original plan.
- S6 — Fine pointer is untouched: same simulation, same pointer takeover, same 0.32 resolution.
- S7 — Existing contracts preserved: reduced motion and `saveData` fall back to the CSS field, no-WebGL falls back, `check:lint`, `build`, `check:motion`, `e2e:motion`, `validate:bebop` keep passing.
- S8 — Everything a maintainer needs to re-check this must be written down: the cause, the numbers, and the command that reproduces them.

## Correction of the approved plan (read before the tasks)

The bake was approved on three claims. Two were wrong and the third is neutral:

1. **Wrong: "the canvas renders at DPR 3, cap it".** `CommonClass.init` sets `this.pixelRatio = 1`
   (`src/components/LiquidEther.jsx:104-129`), so a 390×844 phone already gets a 390×844 drawing
   buffer. There is no DPR bill to cut.
2. **Wrong: "mobile is coarse because of the phone".** It is coarse because of one constant:
   `getSimQuality` (`src/components/AppBackground.jsx:17-26`) returns `resolution: 0.22,
   iterationsPoisson: 8` for `(pointer: coarse) || width < 768`, against `0.32 / 12` on desktop. The
   simulation's own render targets on a 390×844 phone are therefore **86×186 px for the whole
   screen**, upscaled to the viewport. That, not the touchscreen, is S2's flatness.
3. **Neutral: "not rendering it would maximise performance".** Measured on the mobile profile: 6 s of
   idle renderer CPU is **2490 ms with the canvas and 2480 ms with the canvas removed** — the WebGL
   layer costs ≈0 at idle, and after the `scroll-perf-pass` work it draws 8.1/s at rest. There is no
   CPU left for a bake to save. Mobile scroll is already 59.9 fps / 0 janky / 0 longtasks.

And one argument that decides it against the bake: **a baked loop has no touch response at all**,
while the live simulation does answer `touchstart`/`touchmove` (`LiquidEther.jsx:290-304`). S2 names
the interaction as part of the complaint ("no se aplica como en pc"), so baking would remove the
remaining half of what the user is missing while saving nothing measurable.

What the bake was right about: the mobile field must not be a phone-shaped toy. It should be the
desktop field. That is reachable by giving the coarse pointer the desktop constants.

## Tasks

| ID | Specs | Route | Task | State |
| --- | --- | --- | --- | --- |
| T0 | S3, S5 | inline | Decide bake vs. not, on evidence. Decided: **no bake** — ≈0 CPU saved, and it removes the touch response the user is missing. Recorded in the Log. | DONE |
| T1 | S1, S2, S4, S6 | inline | Give the coarse pointer the desktop simulation constants in `getSimQuality`, so the mobile dye is as detailed as the desktop one relative to its viewport. Measured before/after. | DONE |
| T2 | S5 | inline | If T1 regresses the mobile numbers, the cheaper route wins: keep the lower resolution and re-open the bake as the fallback. Only runs when the numbers say so. | DROPPED — T1 measured flat, no regression to react to |
| T3 | S8 | inline | Docs: feature doc evidence, README if the field's quality contract becomes documented behavior, CHANGELOG only if user-visible. | pending |
| T4 | S7, S8 | inline + spot | Verify: `check:lint`, `check:motion`, `e2e:motion`, `validate:bebop`, `next build`, and a fresh mobile 4× measurement against the baseline in Evidence. | pending |

Route note: inline because the change is two constants in one file; the repository is also a separate
clone outside this session's root, so a delegated writer would need per-call interactive consent for
`repository_root`, and the write is one mechanical edit plus measurement.

## Evidence

### Numbers this feature is judged against (from `odd/tasks/scroll-perf-pass.md`)

| mobile 390×844 DPR3, 4× throttle | baseline |
| --- | --- |
| scroll fps / p95 / frameMax | 59.9 / 16.7 / 16.8 |
| janky frames / longtasks | 0 / 0 |
| main thread during scroll | 40.2% |
| idle renderer CPU, 6 s window | 2490 ms (2480 ms with the canvas removed) |
| WebGL draws at rest | 8.1/s |
| simulation render target size | **86×186** (`resolution 0.22`) |

### Where the visible flatness comes from

| profile | viewport | sim resolution | simulation render target | target ÷ viewport width |
| --- | --- | --- | --- | --- |
| desktop | 1440×900 | 0.32 | 460×288 | 0.32 |
| mobile (shipped) | 390×844 | 0.22 | 86×186 | 0.22 |
| mobile (proposed) | 390×844 | 0.32 | 125×270 | 0.32 |

The dye is a dye: its detail is set by the render-target grid, and the grid is what the eye reads as
"the smoke flows" or "the smoke is a blur". Desktop and mobile should carry the same fraction of the
viewport, or the phone is showing a different field.

### T1 — the change

`src/components/AppBackground.jsx`: `getSimQuality` no longer branches on the pointer. One
`SIM_QUALITY = { resolution: 0.32, iterationsPoisson: 12 }` for every device; `saveData` still
returns `null`, and `prefers-reduced-motion` still resets `canUseWebgl`, so both no-simulation
paths are intact. The comment above the constant records why a separate coarse profile is wrong,
pointing here.

What the browser sees: `canvas` drawing buffer 390×844 with `pixelRatio = 1` on both builds
(verified at runtime), so the only variable between the two arms is the simulation grid —
125×270 against 86×186.

### T1 — measured before/after (Pixel 8 profile 390×844 DPR3, 4× CPU throttle)

Two runs per arm, same built clone, same harness, only the constant differs.

| window | metric | 0.22 / 8 (shipped) | 0.32 / 12 (this change) |
| --- | --- | --- | --- |
| idle 6 s | renderer CPU | 4790 / 4790 ms | 4800 / 4810 ms |
| idle 6 s | GPU | 180 / 190 ms | 190 / 190 ms |
| idle 6 s | main thread | 2.7 / 2.8% | 3.3 / 3.1% |
| real scroll 6 s | fps | 59.8 / 59.9 | 59.9 / 59.9 |
| real scroll 6 s | janky / longtasks | 0 / 0 | 0 / 0 |
| real scroll 6 s | main thread | 36.0 / 35.6% | 36.0 / 37.2% |
| real scroll 6 s | style recalc | 930 / 940 ms | 933 / 975 ms |
| real scroll 6 s | renderer CPU | 5530 / 5520 ms | 5550 / 5580 ms |
| real scroll 6 s | GPU | 530 / 540 ms | 530 / 550 ms |

Flat within run-to-run noise: ≤20 ms of renderer, ≤20 ms of GPU and ≤25 ms of style over a 6 s
window. The viewport scrolled to the same place (5467 px) in both arms, so the workload matched.

Harness note: `perf-measure.mjs` drives mobile with `Input.synthesizeScrollGesture`, which does not
scroll this page (both arms end at `y: 0`), so its "scroll" window is really a touch-driven
simulation window. The table above therefore comes from `scroll-probe.mjs`, which sends wheel
deltas on a coarse-pointer context — the same technique `scroll-perf-pass` used for its mobile
numbers. Both were run; both agree.

Visual check, same touch sequence on the same state: at 0.22 the drag leaves a dim smear that the
navy swallows within a second; at 0.32 the wisps survive and keep their edges. Screenshots kept
outside the repo (`shots-parity/m22.png`, `m32.png`, `d32.png`).

### T1 — checks (S7)

Run against the built clone that carries this diff (`perf-clone` :3100), not against a dev server,
so the numbers are the production bundle:

| check | result |
| --- | --- |
| `next build` | ✓ compiled, `/` prerendered 1177 ms |
| `pnpm check:lint` | clean |
| `pnpm check:motion` | clean — no CSSPlugin alias used as a reset target |
| `pnpm validate:bebop` | 25 shots · 3317 ms, all invariants OK |
| `scripts/e2e-footer-motion.mjs` | 13 OK · 0 fail (desktop, reduced motion, coarse pointer) |
| `scripts/e2e-a11y.mjs` | 16 OK · 0 fail (incl. reduced-motion hero, no console errors, no overflow) |

`pnpm e2e:motion -- --base-url …` fails with `unknown argument: --`; the script takes its flags
straight, so the working invocation is `node scripts/e2e-footer-motion.mjs --base-url …`.

## Log

- L1 (verbatim): "si es lo recomendado, implementalo entonces, documenta todo lo necesario. el faro es que se mantenga lo mas similar ql live de desktop"
- L2 (verbatim, prior turn): "me parece mejor approach en mobil3 dejar una animacion ya hecha, cosa de no renderizarla y maximizariamos el rendimiento a full."
- L3 (verbatim, prior turn): "no se que recomendas, creo que la anima ya hecha seria mejor por que la fluidez del humo se pierde en el touchscreen y no se aplica xomo en pc"
- L4 (correction): the canvas already runs at `pixelRatio = 1`; the mobile simulation already runs at `resolution 0.22` (86×186 targets). The DPR-cap item is withdrawn as based on a wrong reading, and the target size is recorded as the real cause of L3.
- L5 (decision, T0): **the approved bake is withdrawn**, because removing the canvas saves ≈0 idle CPU (2490 vs 2480 ms, 6 s window) while a baked loop cannot answer a touch drag, and L3 names the interaction. Replaced by resolution parity, which targets the actual symptom at one constant.
- L6 (reversal discipline): the bake is not deleted from the record, it is demoted to T2 — the fallback that runs only if resolution parity shows a real mobile cost.
- L7 (T0/T1 result): the parity change is free. Neither the idle window nor a real 6 s scroll moved outside noise at 4× throttle, and the smoke survives the drag instead of dissolving. T2 is dropped because there is nothing to fix.
- L8 (scope note): `odd/tasks/archive/extreme-perf.md` still records the old `0.22` coarse profile. It is an archive of a past pass, so it is left as written; this document is the current record.
- L9 (T3, docs): the contract is written where a maintainer will hit it — README `### Field quality on a phone` (why one constant, what `resolution` means per viewport, why no coarse profile, why `pixelRatio = 1` matters) and a `CHANGELOG` entry, because a sharper field on a phone is user-visible. `scroll-perf-pass.md` gets L12 so its reader is routed here instead of copying an obsolete constant.
- L10 (T4, checks): all six S7 checks pass on the production bundle. `e2e:a11y` additionally confirms the reduced-motion hero and the CSS field still stand in for the simulation, which is the contract this change could have broken.
