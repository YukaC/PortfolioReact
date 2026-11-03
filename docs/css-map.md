# CSS map — the reasoning behind the blocks in `src/styles/globals.css`

`AGENTS.md` keeps the stylesheet itself small: a block may stay in `@layer
components` only for one of four reasons, and it says which. The prose that used
to sit inside those blocks — the measurements, the failed attempts, the "why not
a `@utility`" — lives here instead, so the sheet stays readable and
`@layer components` stays inside its 28 KB ceiling (`pnpm check:css`).

Tailwind strips comments when it compiles, so moving a comment out of the sheet
does **not** move `componentsBytes`; the ceiling is earned with declarations
(§14.3, spec S14). This file is where the argument for those declarations lives.

---

## §reveal — `[data-r]`, `.w > span`, `[data-r="paint"]`

The default is a page that already reads. A reveal is decoration, and decoration
may never be the reason the page looks empty. Hidden is a state a script opts
into, and the opt-in is the `js` class an inline script puts on `<html>` before
the first paint (S1, audit.md §20.4-1). So the base stylesheet — what a visitor
without JavaScript gets, and what a script that fails before its observer mounts
leaves behind — is visible, still and unfiltered.

Measured before that inversion: with JS disabled, 19 of the 26 `.w > span` words
sat displaced outside their clipping box, and the viewport of a 6x-throttled
phone stayed invisible for 13.7 s in dev (P0-1).

**Reworked in T12 (owner report: "el reveal sigue deficiente").** The entrance was
`opacity + translateY(28px) + blur(6px)` over 1.1 s with a 70 ms per-word
stagger. It is now `opacity + translateY(16px)` over 0.45 s with a 45 ms
stagger, and no blur at all:

- `filter: blur()` on a reveal is the single most expensive thing one entrance
  asks of a phone GPU — a mid-range Android renders it smeared for seconds,
  which reads as "the reveal is broken". The `narrow-or-touch` variant that used
  to keep the blur on wide pointers is gone with it.
- `will-change` is not on the reveal either. A hint that outlives its transition
  is a permanent offscreen surface, which is the cost S4 removed; a composited
  `opacity`/`transform` transition is promoted anyway.
- The paint nodes (`[data-r="paint"]`) keep a CSS keyframe entrance so the hero
  is not gated on hydration: text that starts at `opacity: 0` cannot be the
  largest paint until the round trip finishes (2.2 s measured with no network,
  10.5 s on Slow 3G). `backwards` rather than `both` keeps nothing of the
  animation in the effect stack once it ends — a filled animation kept every
  hero node there for the life of the page and cost ~200 ms of extra style work
  across a six-second scroll.

The hidden state exists only under `html.js`, and the observer in
`useRevealOnEnter` only ever **adds** `.is-in`; it never hides anything, so a
node it fails to reach is visible rather than blank. Reduced motion is a state,
not a load-time decision: the observer runs under it (adding `.is-in` is a no-op
there) and a mid-session change reveals the document once, so flipping the
preference back off cannot strand a node.

## §identity — the lattice and its flares

The coral lattice is CSS and it is the only lattice there is: one tiled raster,
tile origin pinned at `0 0`, one 48 px cell, so the centre of a dot is at
`n * 48 + 24` in every state — `active`, `frozen`, `static`, reduced motion, no
WebGL (audit.md §18.2, §18.4). The shader used to draw its own `coverGrid` on top
of this layer, which is why keeping both read as doubled dots: two grids never
share an origin. The grid left the shader in T6, so there is exactly one, and the
canvas no longer has to stay awake to keep the field alive.

`fixed` + `contain: strict` is what makes it free: one viewport-sized raster whose
paint never invalidates the document, and it never grows to the length of the
page however far the reader scrolls.

Flares are positioned in **whole cell coordinates** — `calc(var(--cx) * 48px +
24px)` — never in percentages. A percentage of the viewport cannot land on a
fixed grid, which is exactly why the previous attempt at this design was reverted
(§19.3, commit `8164756`); "distance 0 from the nearest dot centre" is the
criterion that failed there.

**Cadence, reworked in T12** (owner report: "los destellos los siento muy
abruptos y esporádicos"). What was wrong: the keyframe went `0 → 1 → 0.6 → 0` in
three hard steps inside an 8 % window (≈ 0.6 s at 7–11 s cycles), with
permanently zero between strikes, and 36 independent long cycles put up to six
at once.

**Cadence, tempo-locked** (`odd/tasks/flare-tempo.md`; owner brief: the flares go
at 128 BPM "como respiracion", the tempo of Bocanada). The field used to carry 36
hand-tuned cycles of 8.7–9.3 s; it now carries one, and it is the song's:

- `--bpm: 128` is the only place the tempo is written down. `--beat: calc(60s /
  var(--bpm))` is 0.46875 s, `--breath: calc(8 * var(--beat))` is 3.75 s, and
  `.flare` runs its bell on `--breath`. Eight beats are exactly two 4/4 bars — 16
  breaths a minute, the rate of a calm human breath. One breath per beat would be
  2.13 Hz, and the count is `visible dots × duty cycle`: on 36 dots a 2.13 Hz
  breath only fits the 1–4 budget as a sub-50 ms flicker, which is the blink T12
  removed. `8` is the one knob for a faster or calmer field;
- the phases are whole slots of `--grid: calc(var(--beat) / 8)` — a 32nd note,
  58.59 ms — dealt in golden-ratio order over the 64 a breath holds, so every
  prefix comes out spread and every onset and every peak sits on the song's grid.
  `src/lib/field-flares.js` therefore carries `{ cx, cy, slot }` and nothing else:
  no seconds, no cycle, no arithmetic at runtime;
- one bell per density band — `flare` (36 dots), `flare-22`, `flare-12`,
  `flare-6` — resting at `0.04` (never `0`: the field is never completely dark),
  peaking at `0.5` instead of `1`, with both flanks eased by
  `--ease-in-out-field`, so no stop in the cycle is a step;
- the slice of the breath above the `0.05` "lit" threshold is set per band so that
  1–4 flares are lit at once however many dots the viewport carries (§19.2): the
  six-dot phone field gets a 1.84 s swell, the 36-dot field a 0.34 s one. Fewer,
  longer strikes are the only way to keep the count bounded — a long bright phase
  on 36 dots is arithmetically a crowd;
- the phases are staggered rather than unison (owner's choice): each dot has its
  own slot inside the breath, so the field stays a shimmer and not a strobe. The
  pattern repeats every breath by design — that is what being in tempo means.

`src/lib/field-flares.js` holds the table and its generator notes;
`src/lib/field-flares.test.js` pins the budget: peak ≤ 4 and at least one lit for
the certified minute at every density band, the never-zero floor, and the tempo
chain the stylesheet declares.

## §field — the blobs and the convolved blur

Blobs answer the reading progress: two fixed gradients per blob, cross-faded with
`opacity` (composited) instead of an `hsl()` interpolated by `--p`, because a hue
inside a background gradient re-resolves and re-rasterises the layer every frame.
`plus-lighter` adds the two premultiplied layers, so the pair composites to
exactly the alpha and colour of the interpolated gradient; a normal blend would
dim it mid-scroll, because both are translucent.

`filter: blur(110px)` is the narrow layout's glow. At 900 px and up the same six
layers are 1.69 Mpx of Gaussian surface against the §21.3 budget of 2 Mpx, so the
wide layout bakes the blur into the stops instead (`@variant wide`):

`blur(σ)` is linear, so blurring the radial ramp (`A` at the centre, transparent
at 68 % of the farthest corner, σ = 110 px) gives the profile sampled there:
`0.689 · A` at the centre, then `0.941, 0.782, 0.571, 0.356, 0.176, 0.066, 0.017`
of it every 12.5 % of the radius (blob1) and every 25 % (blobs 2–3, whose 0.26 and
0.12 peaks keep the linear error inside 0.007 alpha). Worst deviation from the
true blur: 0.004 alpha, under one 8-bit step. Same centres, same alphas, same
cross-fade.

## §status — the pulse

The pulse used to animate `box-shadow`, which no engine can composite: it forced
a style recalculation for the whole document on every frame, for ever (measured at
rest: 231 recalcs over 231 frames with zero DOM writes), so the document never
went quiet. That shadow had no blur and no offset — it was a filled disc of live
green behind the dot — and the same disc is now a pseudo-element that only fades
and scales, which the compositor owns. An idle page asks for 0 frames of work and
the geometry is unchanged: radius 3.5 px + spread, reproduced by `scale`.
