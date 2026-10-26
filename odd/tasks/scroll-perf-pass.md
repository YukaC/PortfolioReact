# Feature: scroll-perf-pass — PortfolioReact (feat/agency-rebrand)

Optimize scroll/animation fluidity and runtime resource cost on desktop and mobile,
keeping the visual language identical at rest.

Status: T2/T3/T4 landed and verified (2026-10-26). T3 v2 (slow breathing) shipped and
measured. T5 measured on the mobile profile and decided: keep the glass — the blur costs
nothing on mobile and the desktop win does not justify changing the style (L11).

## Specs

- S1 — verbatim request (2026-10-24): "optimiza la fluidez de scroll y de las  qnimaciones, junto con el consumo de rexursos tanto en pc como mobile que es deficiente, sin dacrificar el estilo visual."
- S2 — Visual parity: at rest and in motion the rendered composition (layers, colors, blur, typography, layout) stays the same; no effect may be removed, dimmed or restyled to buy performance. Only invisible timing detail may change (the inertia curve keeps its character).
- S3 — Scroll fluidity (desktop 1440x900, production build): frame p95 and janky-frame count during a 9s wheel scroll improve against the baseline in "Evidence".
- S4 — Animation fluidity: field band, reveal, marquee, footer wave and work-row spotlight keep their motion character (S2) while their per-frame main-thread work drops.
- S5 — Resource consumption: renderer CPU, GPU CPU, main-thread TaskDuration share, style/layout recalc counts and JS heap during idle+scroll drop against baseline; the WebGL sim releases GPU time when nothing changes.
- S6 — Mobile: same gates at 390x844 DPR3 + 4x CPU throttle; no desktop-only work (fine-pointer effects) and no permanent compositor layers it does not use.
- S7 — Existing contracts preserved: reduced-motion path, no-WebGL fallback, a11y (aria-current, skip link, focus order), and `check:lint`, `build`, `check:motion`, `e2e:motion`, `validate:bebop` keep passing.

## Tasks

| ID | Specs | Route | Task | State |
| --- | --- | --- | --- | --- |
| T1 | S3-S6 | inline (read-only) | Baseline + attribution measurement with a scratch Playwright/CDP harness (prod build in a scratch clone, real GPU). | DONE |
| T2 | S5, S3 | delegated | Motion channel rewrite (the dominant cost, see Evidence): stop writing 7 custom properties on `documentElement` every frame. Write element-scoped values (or inline `translate`/`opacity`) on the few nodes that use them, dirty-check each channel, cache `innerHeight`/`scrollHeight` (currently read per frame), and drop `--p` out of the blobs' `hsl()` background (cross-fade two fixed gradients by `opacity` instead, same color trajectory, no repaint). Idle style churn (recalcs ≈60/s) turned out to be a decorative keyframe on `.status i`, pre-existing in both builds and ~0.02ms per 2s: deliberately left alone under S2. | DONE |
| T3 | S5, S6 | delegated | LiquidEther idle cost: on mobile-throttled idle the renderer burned 4.9s of CPU in a 6s window (≈81% of a core) with `autoDemo={false}` — nothing on screen changes. Present only when the simulation actually advanced or a resize happened; keep the existing offscreen/visibility pause; make the window `mousemove` listener passive and gate its `getBoundingClientRect()` read behind rAF; dispose the 9 HalfFloat render targets, materials and `paletteTex` on unmount; coalesce ResizeObserver reallocation. Premise corrected by measurement (see Evidence): the 81% idle figure is a throttled-harness floor, the real site cost is a 15 presents/s idle loop. v2 added after the freeze was rejected in review: the field now re-composites at ~7 ticks/s after 2.2s instead of going still (8.1 draw calls/s vs the base's 17.5, same visible drift). | DONE |
| T4 | S3, S5 | delegated | Per-frame JS hot spots: navbar scroll-spy (cached section offsets, class writes only when the active section changes), `will-change` lifetime on `.work-row`, rAF-gated pointer light, footer wave geometry cache (`offsetLeft/Top/Width/Height` read per pointer frame), About scrub word writes (skip when unchanged, cache viewport height). `.work-row` `will-change` was measured neutral and left untouched. | DONE |
| T5 | S5, S2 | deciding | GPU/background budget: removing `backdrop-filter` cut GPU time 24% and renderer 9% on desktop, but it is visible style. Measured on the mobile profile (2026-10-26): no difference at all, because no glass surface is painted at 390px — the cost is desktop-only, and the user chose to keep the glass rather than trade style for it (L11). Grain (`mix-blend-mode: overlay`) measured neutral on desktop. | DONE — kept as is (L11) |
| T6 | S2-S7 | inline + verifier | Verify: rebuild, re-run the same harness (desktop + mobile-throttled), screenshot parity at rest (hero/about/work/footer, desktop + mobile), existing scripts. | DONE |
| T7 | — | inline | Close: evidence in this doc, Engram mirror, CHANGELOG/README only if the perf contract becomes documented behavior. | TODO |

## Evidence

Harness (scratch, not in the repo): `/home/yuka/ssd-cache/PortfolioReact/perf-measure.mjs` and
`perf-attr.mjs`, run from the clean prod clone `/home/yuka/ssd-cache/PortfolioReact/perf-clone`
(HEAD of feat/agency-rebrand + the current uncommitted diff applied; `next build` + `next start -p 3100`).
Browser: Playwright 1.64 Chromium, headless, **real GPU** (`ANGLE / Vulkan / AMD Radeon RX 570 / radv`) —
without `--enable-gpu --use-gl=angle --use-angle=vulkan` Playwright falls back to SwiftShader and every
number becomes software-raster noise (that first run is kept as `perf-baseline-desktop.json`, ignore it).
Mobile profile = 390x844 DPR3 + `Emulation.setCPUThrottlingRate 4`. Touch `Input.synthesizeScrollGesture`
does not scroll this page in headless (Lenis/native), so mobile scroll is driven with wheel deltas plus the
coarse-pointer context — mobile numbers describe paint/style/JS cost, not touch-scroll physics.
Raw JSON: `/home/yuka/ssd-cache/PortfolioReact/perf-*.json` and `attr-*.json`.

Baseline, 9s scroll window / 6s idle window (ms are CPU-time inside the window):

| Profile | Window | fps | p95 | janky | main-thread | style recalc | recalc count | renderer CPU | GPU CPU |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| desktop | idle | 59.8 | 16.7 | 0 | 2.3% | 27ms | 361 | 280ms | 530ms |
| desktop | scroll | 59.7 | 16.8 | 1 | 50.8% | **3254ms** | 2152 | 5970ms | 2540ms |
| mobile 4x | idle | 59.9 | 16.7 | 0 | 7.0% | 81ms | 361 | **4870ms** | 350ms |
| mobile 4x | scroll | 39.0 | 33.4 | **176** | 81.6% | **5380ms** | 697 | 9290ms | 830ms |

Attribution (desktop scroll, same window; one subsystem neutralised):

| Variant | main-thread | style recalc | renderer CPU | GPU CPU | Note |
| --- | --- | --- | --- | --- | --- |
| none (baseline) | 50.8% | 3254ms | 5970ms | 2540ms | |
| `novars` — `documentElement.style.setProperty` disabled | **15.7%** | **311ms** | **2270ms** | 2290ms | ≈90% of the main-thread cost is the per-frame custom-property writes |
| `canvas` — WebGL layer hidden | 49.3% | 3146ms | 5690ms | 2220ms | canvas is not the desktop cost |
| `blobs` — `filter: blur(110px)` removed | 48.3% | 3115ms | 5600ms | 2280ms | blur is not the desktop cost |
| `grain` — `mix-blend-mode` layer removed | 53.9% | 3432ms | 6270ms | 2570ms | neutral/noisy on desktop |
| `glass` — all `backdrop-filter` removed | 46.2% | 3019ms | 5410ms | **1940ms** | −24% GPU, −9% renderer, but it is visible style (T5) |
| `willchange` — `.work-row` promotion removed | 51.0% | 3268ms | 5950ms | 2590ms | neutral on its own |

Diagnosis (what the numbers say):

1. **`useFieldMotion` writes 7 inherited custom properties on `<html>` every frame** (`src/hooks/useFieldMotion.js:62-77`). Each write invalidates style for the whole document, and `--p` sits inside the blobs' `hsl(...)` backgrounds (`src/styles/globals.css:171,184,197`), so scroll also repaints three `blur(110px)` 64vw layers. This is the single dominant cost: removing it takes the scroll window from 50.8% main-thread to 15.7% and from 3254ms to 311ms of style recalc, and cuts renderer CPU by 3.5s per 9s. Same code also reads `window.innerHeight`/`root.scrollHeight` per frame (forced layout) and writes every channel even when the value did not change.
2. **[corrected 2026-10-26]** The "mobile idle burns ~81% of a core" reading is a **harness artifact**: `Emulation.setCPUThrottlingRate` alone puts 76% of a core on an inert `data:text/html` page (76.0% mobile DPR3 4x, 76.3% desktop DPR1 4x, 0% at rate 1). The site-side idle cost it masked is a WebGL present loop: the old build presents **15 frames/s forever** at rest (draw-call probe; 1131 draws over 10s). The same correction retires the "idle churn comes from the marquee" claim: the ≈60 recalcs/s are a decorative `box-shadow` keyframe on `.status i` (`globals.css:364`, `@keyframes ping` `:1656`), present in both builds, 0.35–0.46ms per 12s of idle. Left alone (S2).
3. Desktop already holds 60fps on this GPU; the cost shows up as main-thread saturation (50%) and as mobile frame drops (39fps, 176 janky frames). So the fix is main-thread and idle-GPU work, not "make the animation cheaper".
4. Not the bottleneck (measured, do not touch for perf): the blur blobs on desktop, `backdrop-filter` on desktop main thread, grain, `.work-row` `will-change`.

### After (2026-10-26)

Built from the repo's exact `src/`+`public/` (`BUILD_ID` newer than the newest source file),
served at :3100 against the pre-change source rebuilt at :3101, measured serially.

**Measurement floor (read every throttled number through it).** `setCPUThrottlingRate`
makes an inert page burn 76% of a core in the renderer process, so every throttled
renderer-CPU figure carries a `0.76 × wall` floor unrelated to the page. Desktop runs are
unthrottled (floor 0) and are quoted raw. Page-scoped metrics (frames, TaskDuration,
style recalc, recalcs, layouts) and GPU CPU are unaffected by the floor.

Desktop 1440x900, 9s scroll:

| Metric | base | after | Δ |
| --- | --- | --- | --- |
| fps / p95 / frameMax | 59.7 / 16.8 / 33.3 | 59.9 / 16.7 / **16.8** | = / = / −50% |
| janky frames | 1 | **0** | — |
| main thread | 50.0% | **22.1%** | −56% |
| style recalc / recalcs | 3168ms / 2138 | **721ms** / 1268 | −77% / −41% |
| layouts / layoutMs | 162 / 34 | 130 / 34 | −20% / = |
| script | 281ms | 329ms | +17% |
| renderer CPU | 5970ms | **3110ms** | −48% |
| GPU CPU | 2400ms | 2550ms | +6% |
| JS heap | 7.0MB | 6.9MB | −1% |

Mobile 390x844 DPR3, 4x throttle, 9s scroll:

| Metric | base | after | Δ |
| --- | --- | --- | --- |
| frames / fps | 352 / 39.0 | **544 / 59.9** | +55% / +54% |
| p50 / p95 / frameMax | 33.2 / 33.4 / 66.7 | **16.7 / 16.7 / 16.8** | −50% / −50% / −75% |
| janky frames | 176 | **0** | −100% |
| longtasks / longest | 4 / 74ms | **0 / 0** | −100% |
| main thread | 81.6% | **40.2%** | −51% |
| style recalc / recalcs | 5380ms / 697 | **813ms** / 1090 | −85% / +56% |
| layouts / layoutMs | 68 / 52 | **0 / 0** | −100% |
| script | 297ms | 772ms | +160% |
| renderer CPU (floor-adjusted) | 9290 → 2390 | 8330 → **1430** | **−40%** |
| GPU CPU | 830ms | 870ms | +5% |
| JS heap | 6.1MB | 7.2MB | +18% |

Worse, not hidden: recalcs +56% and script +160% on mobile are the cost of replacing one
whole-document invalidation with ~16 element-scoped writes — 544 frames drawn instead of 352
also means ~1.5x more frames each paying its small per-frame script cost; style recalc fell 7x
because invalidation is now subtree-scoped. Heap +18% (6.1 → 7.2MB) is the cached geometry
(section tops, letter boxes) and is flat at idle.

Idle (what T3 actually bought):

| Probe | base | after |
| --- | --- | --- |
| WebGL draws at rest, 10 × 1s | 644, 367, then **15/s forever** (1131) | 644, 364, then **0/s** from s≈3 (1008) |
| rAF ticks at rest | 124–126/s | 124–126/s |
| warmed idle renderer CPU (4s window) | 3.00s (≈floor) | 3.26s (≈floor) |

The rAF loop keeps running in both builds; what stops is the draw work. The site's idle
renderer cost is ≈0 in both builds once the floor is subtracted.

Visual parity (S2) — 5 sections × 2 profiles, screenshot pairs:

| Comparison | mean | >TOL(6) pixels | max |
| --- | --- | --- | --- |
| same build, two runs (noise floor) | 0.00–0.03 | 0.000–0.096% | 2–54 |
| base vs after, canvas hidden (DOM/CSS only) | 0.03–0.28 | 0.000–0.129% | 3–68 |
| base vs after, full frame | 0.12–0.70 | 0.13–2.3% | 86–157 |

So the DOM/CSS layer sits at the run-to-run noise floor; its uniform ≈0.2/255 mean is the
designed plus-lighter blob cross-fade. The full-frame residual was the **WebGL canvas clock
phase** — the after build's shader clock was frozen at idle while the base build's kept
drifting, so the haze wisps and the flare sat in different places. That was T3's open visual
call; it is closed below, and the residual is the size of the field's own motion between two
shots, not a style regression.

### Idle breathing (2026-10-26)

T3 v1 froze the field after 2.2s: no simulation step, no present, so the time-driven haze and
the lattice flares stopped until input returned. A first attempt advanced one full simulation
step per slow tick and was measured at **112.9 draw calls/s** — *more* GPU work than the 17.5
draws/s the base build spends re-compositing an unchanged image, because one simulation step is
~10 draw calls. Discarded.

The shipped form is the opposite: a breath tick re-composites only (`shouldSimulate=false`,
`shouldPresent=true`), which still advances the composite pass's `time` uniform (`Output.update`
feeds it `Common.time`), so the haze keeps drifting while a tick costs exactly one draw call.

| at rest, mobile 390×844 DPR3 4× | base (HEAD) | after (breathing) |
| --- | ---: | ---: |
| WebGL draw calls / s (11.96s window) | 17.5 | **8.1** |
| canvas motion, 5 shots 2s apart — mean / max / >6 px | 0.38–0.53 / 152–166 / 1.5–2.2% | 0.38–0.49 / 152–164 / 1.5–2.1% |

Same visible drift, half the draws. The canvas-motion row also retires the old worry that the
two builds look different at rest: their at-rest motion is the same size.

### T5 mobile probe (2026-10-26)

The desktop attribution said removing `backdrop-filter` buys −24% GPU / −9% renderer. On the
mobile profile it buys nothing:

| mobile 4×, 9s scroll (new build) | fps | p95 | mainPct | styleMs | renderer signal | gpuMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| run 1, as shipped | 57.4 | 16.8 | 59.7% | 2276 | 1890ms | 1240 |
| run 1, `backdrop-filter:none` | 56.6 | 16.8 | 58.9% | 2259 | 1930ms | 1250 |
| run 2, as shipped | 59.4 | 16.8 | 57.9% | 2199 | 1900ms | 1170 |
| run 2, `backdrop-filter:none` | 59.4 | 16.8 | 56.1% | 2181 | 1900ms | 1010 |

Renderer signal is raw minus the 0.76 × wall harness floor; GPU run-to-run spread on the *same*
config is 6%, i.e. as large as the difference being measured. Reason, checked in the DOM: no
glass surface is painted at 390px — `.work-preview` and `.orn-orb` are 0×0 or hidden and the
drawer is near-opaque. The blur only costs where it renders, which is desktop.

Verification chain (one run, exit 0): `check:lint` 0 · `check:motion` 0 (`check-motion-aliases:
clean`) · `validate:bebop` 0 (25 shots · 3317ms) · `e2e:motion` 13 OK / 0 FALLA / 0 SKIP ·
`next build` exit 0 in the scratch clone (compiled 1046ms, 3/3 static pages). Re-run after the
breathing change: `check:lint` 0, `check:motion` 0, `validate:bebop` 0 (25 shots · 3317ms),
`e2e:motion` 13 OK / 0 FALLA / 0 SKIP, `next build` exit 0. Parity tooling:
`shots.mjs` / `shotdiff.py` in the same scratch root, `TOL=6` per channel.

Visual-parity notes for T2: the blob hue currently interpolates `hsl(212 → 222deg)` with `--p`. Two fixed gradient layers cross-faded by `opacity` reproduce the same trajectory without repainting; the `translate` part of the same rule is already compositor-only and stays. `--p` still drives the progress bar (`scaleX`) and the blobs' translate.

## Log

- L1 (verbatim): "optimiza la fluidez de scroll y de las  qnimaciones, junto con el consumo de rexursos tanto en pc como mobile que es deficiente, sin dacrificar el estilo visual."
- L2 (verbatim, 2026-10-24): "frena todo en punto seguro y documenta hadta fonde llegadte, necesito que frenes, despues continuo" → work stopped; scratch prod server on :3100 killed, the user's dev server on :3000 untouched, no source edits made, this document is the record.
- L3 (evidence): baseline + attribution tables above; dominant cost is the per-frame `documentElement` custom-property channel.
- L4 (decision, 2026-10-26): resume scope = T2 + T3 + T4; T5 stays blocked on the S2 decision. 
- L5 (unit error, corrected): `SystemInfo.getProcessInfo.cpuTime` is **seconds**, not milliseconds — every earlier "3ms renderer at idle" reading was 3s. Caught with a 2s renderer busy-loop (`wall 2006ms`, `rawDelta.renderer 1.96`).
- L6 (evidence): the throttled idle burn is a harness floor — measured with an inert `data:text/html` page across 4 profiles (mobile DPR3 1x/4x, desktop DPR1 1x/4x): 76.0% / 0.0% / 0.0% / 76.3%. Diagnosis item 2 and half of L3 retracted; replaced by the draw-call probe (old 15 presents/s at rest, new 0), which is immune to the floor and is the S5 evidence.
- L7 (evidence): T6 parity. Full-frame max 86–157 comes from the canvas clock phase (T3's freeze), not from style; with the canvas hidden on both sides the diff is mean ≤0.28/255 and ≤0.13% pixels over TOL, i.e. at the same-build noise floor (≤0.096%, max 54). S2 holds for everything the diff touches; the drift freeze is the open call.
- L8 (finding): the ≈60 recalcs/s at idle are `@keyframes ping` animating `box-shadow` on `.status i` (`globals.css:364`, `:1656`), pre-existing in both builds; pausing all animations drops 120 → 1 recalcs per 2s. Cost 0.35–0.46ms per 12s. Not touched (S2, decorative).
- L9 (decision + evidence, 2026-10-26): user picked a slow breath over the hard freeze. First implementation (one simulation step per tick) measured **112.9 draws/s** — worse than the base build's 17.5 — so it was replaced by a present-only tick; final **8.1 draws/s** vs base 17.5, canvas drift identical in magnitude (mean 0.38–0.49, max 152–164, 1.5–2.1% over TOL).
- L10 (evidence, 2026-10-26): T5 on the mobile profile shows no difference (renderer signal 1890 vs 1930 / 1900 vs 1900 ms; GPU 1240 vs 1250 / 1170 vs 1010, i.e. inside the 6% same-config spread), because no glass surface renders at 390px. Removing `backdrop-filter` is a desktop-only GPU win and therefore a style decision, not a perf requirement.
- L11 (decision, 2026-10-26): T5 closed as **keep the glass**. The desktop −24% GPU is real but the blur is shipped style (S2) and the only desktop surfaces carrying it are the scrolled nav pill and the work preview; the mobile profile — the one the brief called deficient — gains nothing. No style change, no `CHANGELOG` entry (the perf contract is internal, not documented behavior).
- L12 (handoff, 2026-10-26): the field's quality constants were out of scope here and are now owned by `odd/tasks/mobile-field-parity.md` — the coarse-pointer `0.22 / 8` profile is gone, and its removal measured flat on this document's own mobile harness (59.9 fps / 0 janky either way, renderer within 20 ms over 6 s). The `0.22` figure quoted in `archive/extreme-perf.md` is that archive's history, not current behaviour.
