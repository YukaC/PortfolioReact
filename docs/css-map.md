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
stagger, and no blur at all. On a coarse pointer it is `translateY(6px)` with no
stagger: a finger scrolls through the entrance instead of watching it, so the rise
has to be small enough that several blocks entering at once do not read as the
page wobbling (`R3`-era phone report, 6 nov 2026 — the reveal was the only
surviving anomaly once the meter's own sampling lag was fixed):

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

**A fling is not an entrance** (owner report: "al hacer flick rápido/agresivo, el texto
desaparece por instantes"). A wheel or trackpad flick covers more than a screen inside
`--duration-reveal`, so a block is observed and still rising from `opacity: 0` while the
reader is already on it. `smoothScroll.js` writes `fling` on `<html>` while the smoothed
layer travels faster than 2200 px/s (and clears it below 900 px/s, so the class cannot
chatter), and `html.js.fling [data-r]` / `html.js.fling .w > span` carry `transition: none`.
Measured on a 1280×800 desktop: 15 of 71 frames with invisible text at the centre of the
screen before, 1 of 72 after. The node rule must match on both sides of the moment
`.is-in` lands — scoped to `:not(.is-in)` it stops applying exactly when the class
arrives, the transition returns, and the block still fades in (15 ghost frames again).
At reading speed nothing changes.

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
  var(--bpm))` is 0.46875 s, `--breath: calc(12 * var(--beat))` is 5.625 s, and
  `.flare` runs its bell on `--breath`. Twelve beats are exactly three 4/4 bars —
  about 10.7 breaths a minute. The path is the whole story: eight beats read “muy
  rápidos”, sixteen read “muy despacio” (L5, L8), and twelve is the point where a
  breath is slow enough to be one and still visibly happening. The tempo of the
  song stays 128: what stretches is the breath, because the tempo belongs to the
  song and the breath is the design decision. The multiplier in `--breath` is the
  one knob for a faster or calmer field;
- the phases are whole slots of `--grid: calc(var(--breath) / 64)` — 87.89 ms at
  the shipped cycle — dealt in golden-ratio order over the 64 a breath holds, so
  every prefix comes out spread and every onset and every peak sits on the
  subdivision. The grid is derived from the **cycle**, never from the beat: with a
  `--beat`-derived grid, lengthening the breath packs all 36 phases into its first
  half and leaves the rest dark (the count simulation read 0 lit and 6 lit at once
  when that happened). `src/lib/field-flares.js` therefore carries `{ cx, cy, slot
  }` and nothing else: no seconds, no cycle, no arithmetic at runtime;
- one bell for every density — `flare`, and nothing else: a **tide with a bloom on
  top**. The dot rests at `0.02` (never `0`: the field is never completely dark),
  drifts up to a dim `0.16` by 38 % of the cycle, blooms to `0.6` at the middle and
  is back down by 62 %. That shape answers L10 (“el ritmo está bien pero que no se
  prendan tantas a la vez”): a flat window cannot give a long swell *and* a low lit
  count, because the lit population is `count × duty`. With the crest short the
  bright population is ~4 of 36 at any instant (measured 3–8) while the dot still
  moves for most of its 5.6 s breath. `--ease-in-out-field` eases every segment, so
  no stop is a step. The three earlier shapes are recorded so nobody re-tries them:
  a per-band sliver (0.68 s of glow in a 7.5 s cycle) read as sparkles (L6), a
  window covering the whole cycle read as “muy despacio y juntos” (L8), and a flat
  half-cycle window lit half the field at once (L10);
- the disc itself is a **two-layer glow**: a coral core lifted toward white, a
  short shoulder and a wide soft tail, in a 28 px element centred on the dot. A
  single steep gradient was tried first and read as a flat disc (“perdió ese toque
  de glow”, L10): the halo, not the peak opacity, is what makes the dot read as
  light. The footprint is also capped by the rest state — a 34 px halo at 4 % read
  as a semi-transparent circle parked on the field (“quedaron unos circulos semi
  transparentes”, L11), so the disc is 28 px and the rest is 0.02;
- no `animation-name` overrides by viewport any more. One cycle covers 6 and 36
  dots alike: the band decides how many dots are painted and never how they
  breathe, so a fractional viewport cannot land in a band with another cadence;
- the field's calm is no longer a headcount. §19.2's “1–4 lit at once” was the
  arithmetic of those narrow windows and the owner retired it (L6): with half the
  cycle lit, roughly half the band is above the threshold at any instant, and the
  cold count is what keeps it from reading as a wash: 0.18, 0.3 and 0.45 all read
  as tenue (L8–L12), and the crest is `0.6` — what separates “flash” from “light”
  is the crest being brief, not the amplitude being low. The floor that survives
  unchanged is “never completely dark”;
- the phases are still staggered rather than unison (owner's choice, L2): each dot
  has its own slot inside the breath, so the field scatters instead of pulsing as
  one flat wash. The pattern repeats every breath by design — that is what being in
  tempo means.

`src/lib/field-flares.js` holds the table and its generator notes;
`src/lib/field-flares.test.js` pins the contract: one bell whose window is half the
cycle, a crest between 0.5 and 0.7 (the sheet ships 0.6) at every density band,
the never-zero floor, and the tempo
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

## §buttons — one motion, four boxes

The button motion is one recipe in two layers: a label that rises while its copy
enters from below (`.lb > span` translated `-100 %`, the copy painted by
`span::after` with `data-t`), and an arrow that leaves while its copy arrives
(`.ar > svg`, the second glyph parked at minus one step and swapped to `none`).
Everything is a `transform` on a clipped inline box, so the compositor owns it
and nothing repaints.

Four boxes carry it: `.btn` (the page's own buttons — hero, About, project pages,
the work list), `.nav-cta` (the navbar's contact pill), `.work-row` (the list
rows, on `:focus-within` because the row is the click target) and `.bigmail`
(the contact block). The triggers are one `:is()` list per state, not one group
per recipe: adding a box to the motion is one name in one list, and the compiled
`@layer components` stays flat instead of growing a block per selector.

`@utility nav-cta` shares the arrow swap and nothing else: **no label roll**. Its
padding (`0.6875rem 1rem`) and `--text-ui-sm` are what keeps the floating pill at
its 62 px rhythm — `.btn`'s `0.875rem 1.625rem` and `--text-ui` are the hero's
scale, and inheriting them would push the header taller at every scroll state —
and the roll inside a 41 px-tall pill read as a second, smaller button (owner's
brief). The nav's CTA is the same motion where the box has room for it, and only
there.

Its surface is a ladder step, not a colour of its own: `--hover` (white/10) over
the field with white type, `--soft` under a pointer, plus the existing sky glow.
A solid `--color-white` fill was the only opaque slab in a row made of a hairline
pill and bare links, and it read as a louder button than the ones beside it
(owner's brief). Because the pill is now translucent it takes the `.nav-pill`
halo instead of resetting it, so the glyphs stay readable when the plume blooms
behind them.
