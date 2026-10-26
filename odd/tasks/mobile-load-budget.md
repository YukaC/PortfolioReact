# Mobile load budget

Status: **open** — three fixes measured; T4 verification green, delivery open.

## Problem

The 3G phone is the acceptance target, and it is not the same budget as the
scroll work that closed `scroll-perf-pass` and `mobile-field-parity`. Those
measured a page that was already loaded. On a slow network the page is not slow
because of the field: it is slow because of what has to arrive, and because of
when the hero is allowed to paint.

## Specs

S1. On a mid/low-end phone over 3G with CPU throttling, the page must perform as
well as it can: a mid/low-end device is the *standard*, not an edge case.
S2. The measuring profile is fixed: 390x844 @ DPR 3, CPU 4x, and both Slow 3G
(400 kbps down, 400 ms RTT) and Fast 3G (1.6 Mbps down, 150 ms RTT).
S3. No entry animation may delay first paint of above-the-fold text. The
animation itself stays; only the gate goes.
S4. On a slow connection, or when the browser reports `saveData`, the WebGL
field must not be downloaded or mounted. The existing CSS field is the fallback.
S5. The look is preserved: this feature changes *when* things paint and what is
spent to paint them, never the composition.
S6. Fonts are trimmed to the families and weights actually in use, without
changing how type renders.
S7. Verification: `next build`, `check:lint`, `check:motion`, `e2e:a11y`,
`e2e:motion`, plus the load probe on all three network profiles and the scroll
probe at 4x.

## Baseline (measured, 390x844 DPR3, CPU 4x, `load-probe.mjs`)

| network | load | FCP | LCP | canvas mounted | JS | fonts |
| --- | --- | --- | --- | --- | --- | --- |
| none (local) | 358 ms | 308 ms | 2184 ms | — | 403 KB | 92 KB |
| Fast 3G | 2191 ms | 904 ms | 3992 ms | — | 403 KB | 92 KB |
| Slow 3G | 8695 ms | 2296 ms | 10492 ms | 13416 ms | 403 KB | 92 KB |

LCP element in all three runs: `p.lead`. Cause: `[data-r]` sets `opacity: 0`
until React hydrates, an IntersectionObserver adds `is-in`, and a 1.1s
transition finishes. The field chunk (`three`, 181 KB gzip) is fetched after
`load` and the canvas only exists at 13.4s on Slow 3G; until then the page shows
the CSS field. Four long tasks, 272 ms blocking, during load.

## Tasks

| ID | Spec | Route | Status | Commit |
| --- | --- | --- | --- | --- |
| T1 | S3 | inline | DONE | `f64356e` |
| T2 | S4 | inline | DONE | `a8db502` |
| T3 | S6 | inline | DONE | `a8db502` |
| T4 | S1-S7 | inline | DONE | this slice |
| T5 | S5, S7 | inline | DONE | this slice |

## Results

LCP is no longer a hydration metric. `[data-r="paint"]` keeps the travel, the
blur and the 70ms word stagger, but drives them from CSS on the first frame
instead of waiting for an observer to add `is-in`:

| network | load before | load after | FCP before | FCP after | LCP before | LCP after |
| --- | --- | --- | --- | --- | --- | --- |
| none | 358 ms | 362 ms | 308 ms | 244 ms | 2184 ms | **244 ms** |
| Fast 3G | 2191 ms | 2196 ms | 904 ms | 924 ms | 3992 ms | **924 ms** |
| Slow 3G | 8695 ms | 8700 ms | 2296 ms | 2320 ms | 10492 ms | **2320 ms** |

LCP equals FCP in every profile. On Slow 3G the hero text is readable 8.2s
earlier.

The connection gate changes what Slow 3G pays, not when the page finishes
loading, because the field chunk was always requested after `load`:

| Slow 3G | before | after |
| --- | --- | --- |
| JS transferred | 402.6 KB | **211.5 KB** |
| total transferred | 578.1 KB | **387.0 KB** |
| first WebGL frame | 13416 ms | never (CSS field) |

Fraunces is no longer preloaded: two font preloads instead of three, FCP 2320 ->
2232 ms on Slow 3G. The font itself still arrives when the footer needs it.

Scroll at 4x CPU throttle, same session, base commit against this change, two
runs each: base 59.8 / 59.9 fps, 0 janky, 0 longtasks, main 46.8% / 46.3%, style
1179 / 1183 ms; with the paint reveal 59.8 / 59.8 fps, 0 janky, 0 longtasks, main
47.3% / 49.1%, style 1261 / 1324 ms. The cost of the reveal is under 3 points of
main thread and about 100 ms of style work over six seconds — it buys 8.2s of
LCP. `animation-fill-mode: backwards` rather than `both` is what keeps it that
cheap: a filled animation stays in the effect stack for the life of the page
(measured 200 ms over the same scroll).

What is left, and why it was not cut: after these two fixes the 211.5 KB that
remains on Slow 3G is React and GSAP (`react-dom` 260 KB raw, GSAP + ScrollTrigger
134 KB raw). Cutting further means rewriting the animation layer, which is a
different feature with a different risk.

## Log

L1. "escucha, pero al final que implementaste? no hiciste el loop de anim que
dijimos para mobile."

L2. "en realidad lo que quiero es que en mobile sea más fluidas todas las
animaciones por que con 3g y un x4 de throttling se muere la web, y yo quiero
que rinda lo mejor posible en un celular gama media/baja como estandar."

L3. Reframed against the earlier bake decision: the bake saves idle CPU
(2490 ms vs 2480 ms with the canvas removed) and adds payload, so it cannot fix
a slow first load. The measured bottleneck on 3G is LCP and the initial JS
transfer, not the simulation loop.
