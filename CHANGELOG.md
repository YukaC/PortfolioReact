# Changelog

## Unreleased

### The hero paints before it is hydrated

- The lead paragraph was the largest paint on the page and it started at
  `opacity: 0`, so it could not count until React hydrated, an
  `IntersectionObserver` added `is-in` and a 1.1 s transition finished. That is
  2.2 s on a fast local connection, 4.0 s on Fast 3G and 10.5 s on Slow 3G — with
  the network to blame for none of the first figure.
- `[data-r="paint"]` is the same reveal, moved into CSS: same 1.1 s travel, same
  blur, same 70 ms word stagger, but it runs from the first frame. LCP now equals
  FCP on every profile measured: 244 ms local, 924 ms Fast 3G, 2.3 s Slow 3G.
  Below-the-fold reveals keep the observer.
- On a metered or slow connection the WebGL field is not requested at all.
  `getSimQuality()` returns `null` for `saveData` and for `effectiveType` of
  `slow-2g`, `2g` or `3g`, and re-reads the connection on `change`, so a phone that
  walks into coverage gets the live field without a reload. The CSS field is
  already what the page shows while the chunk is in flight; now it is what those
  users keep. Slow 3G: 402.6 -> 211.5 KB of JS, 578.1 -> 387.0 KB total.
- Fraunces is no longer preloaded. It is a 45 KB variable italic used once, in the
  footer wordmark, and it was being fetched ahead of the field on every cold load.

### The phone gets the whole field

- The liquid field no longer downgrades itself on a coarse pointer. `getSimQuality`
  returned `resolution 0.22 / 8 Poisson iterations` for `(pointer: coarse)` or a
  viewport under 768px, against `0.32 / 12` everywhere else, so a 390×844 phone ran
  its dye through 86×186 render targets — a fifth of the desktop grid's density —
  and the smoke read as a blur that never quite moved. Both profiles are gone;
  one pair of constants applies to every device, and the touch drag now drives the
  same field the desktop pointer does.
- Measured before flattening the constant, on the Pixel 8 profile at 4× CPU
  throttle: scroll 59.9 fps / 0 janky / 0 longtasks on both settings, renderer
  within 20 ms over 6 s, GPU within 20 ms — the lower resolution was buying
  nothing measurable. The change is visual only.
- Why not bake the animation instead: removing the WebGL layer entirely saves
  ≈0 idle CPU (2490 ms against 2480 ms over 6 s) and would delete the touch
  response, which is half of what felt broken on a phone. Task notes:
  `odd/tasks/mobile-field-parity.md`, numbers in `odd/tasks/scroll-perf-pass.md`.

### Back to the Bocanada accent

- The retone that followed the field-first redesign had drifted from the faro:
  a warm `#f3b7a1` accent, three field blobs whose hue swept violet, orange and
  green as the reading progress moved, and Fraunces extending past the wordmark
  into `.accent` and the tagline. All three are reverted; the navy field, the
  smoke and the coral lattice are untouched.
- Sky `#8fcbff` is the type accent, not coral: the field's own light on the
  emphasised word. `.accent` is the heading face at weight 600 in sky, and the
  technology band's second row (`.mq-accent`) is sky at 0.55. Coral returns to
  the lattice alone — as type it competed with the 48px dots for the same hue.
  Measured against the same backdrop behind the hero word: sky 10.57 p50 /
  2.93 p95, coral 6.04 / 1.67, paper 16.34 / 4.53. The p95 dip is a bright plume
  bloom passing under the word, the same trade the headline and the body copy
  already make on a live field.
- The blobs drift inside the cobalt range (204–224) instead of across the
  colour wheel, so the field no longer changes colour family as the reader
  scrolls. Progress bar, timeline and the giant-mail underline fade sky→paper.
- The `.accent` emphasis is colour rather than type: no serif italic in the
  headings, and the footer tagline drops it too. Fraunces stays in `_app.js` for
  one job only, the surname wordmark (`.footer-mark`), which reads as a mark in
  the serif and as a slab in the sans. The work monogram fallback is the heading
  face.
- Fixed while removing the serif: `body` declared `var(--font-manrope)` but sits
  above the element that carries the next/font variables, so every piece of
  running copy was falling back to the browser sans. The readable stack now
  lives on `.root-layout`; the lead and the tagline compute to Manrope.

### Field-first redesign (glass-motion reference)

- The layout, the type and the micro-interactions now follow the
  `portfolio-glass-motion` reference: a navy field, type as the hero, and glass
  only where a surface has a job.
- The field is retoned, not replaced. `#060b1a` base, a cobalt
  `.bocanada-field` gradient, three blobs whose hue follows the reading progress
  (later narrowed to the cobalt range, see above),
  the WebGL smoke and the coral 48px lattice with its spring flares (both drawn
  in the `LiquidEther` shader), the cursor light, grain, and a 2px progress bar.
  The smoke, the dots and the flares are untouched.
- One motion channel: `useFieldMotion` runs a single rAF loop with inertia and
  writes `--scy`, `--p`, `--hf`, `--px/--py`, `--mx/--my` on `:root`. Every layer
  reads from it, so nothing snaps.
- Fraunces italic joins Manrope and Space Grotesk as the display accent
  (`.accent`, the footer tagline, the wordmark); narrowed to the wordmark alone
  by "Back to the Bocanada accent" above. The composite font stacks are
  declared on `.root-layout`, the element that carries the next/font variables.
- The hero lost its card. Status line, headline split word by word (with a slow
  per-word parallax), lead, two CTAs and the stack line; the right side is a
  floating depth cluster that answers the pointer and the scroll.
- A technology band between hero and work: two rows travelling in opposite
  directions, their speed following the scroll velocity and the band skewing as
  it accelerates.
- Work is a filtered list: tabs with a sliding indicator, rows that dim their
  siblings and light the one under the cursor, a glass preview of that project's
  cover following the pointer, and inline thumbnails on touch.
- About lights its statement word by word with the scroll and draws the
  education timeline down the rail; the portrait, socials and stack chips moved
  here. Contact offers one giant mail with a gradient underline and a copy
  button that reports through a live region. The footer closes with three
  columns and the surname at scale, each letter lifting as the pointer passes.
- Reveal is CSS: one page-wide observer adds `.is-in` to every `[data-r]`, and
  `SplitHeading` clips each word in a `.w` box. `prefers-reduced-motion` settles
  every one of them.
- Copy that stands on the field carries a dark halo so a bloom of the plume
  cannot swallow it; solid fills reset it. Measured with the smoke stirred:
  status p50 6.36 / worst 6.18, headline p50 12.99 / worst 3.79, lead p50 8.60 /
  worst 3.21, stack line p50 7.16 / worst 1.84. Median and p95 clear AA
  everywhere; a small fraction of the pixels under body and meta copy can still
  dip when the reader drags a bright plume onto them, which is the trade the
  live field asks for.
- Removed: `ProfileCard`, `ProjectsGrid`, `Experience`, `useInView`, the four
  glass tiers, the copy veil, the footer beam and the footer wordmark's
  Space Grotesk recipe.

### Glass system (superseded by the field-first redesign above)

- Every surface over the Bocanada field — nav rail, mobile drawer, hero card,
  work cards, About, Contact, footer close — comes from one glass system in
  `globals.css`: `--glass-*` tokens plus `.glass-rail`, `.glass-panel`,
  `.glass-card`, `.glass-tile` and `.glass-nest`. Tiers, not one-offs.
- Aesthetic replicated 1:1 from the 21st.dev glass-calendar reference: flat
  `bg-black/20`, `border-white/10`, `backdrop-blur-xl`, `shadow-2xl`, the
  rounded-3xl / lg / md / full radius scale, nested `bg-black/20` panes, the
  live item as a solid white pill with black bold text, and the reference's
  pink to orange gradient on the current carousel item only. Text follows its
  hierarchy: white / white-60 / white-50.
- Frost is built rather than inherited: the field is low frequency, so a bare
  `backdrop-blur` had almost nothing to smear. A longer blur, a white wash from
  the top edge, a 1px inner highlight and a static grain layer that sits
  between the tint and the text.
- Controls are symmetric: one radius scale and one 44px control height.
- The copy veil lost its `backdrop-filter`, which was drawing a hard-edged
  rectangle behind the hero headline. Section hairlines are gone.
- The mobile drawer stays near-opaque on purpose: at glass translucency the
  hero's own copy sat behind the menu's own links.
- The 1:1 tint cost real legibility, so contrast was bought back without
  touching the frost: the neutral tint went black/20 to black/30, the top wash
  from .08 to .05, and the muted text floor from white/60 to white/75. Worst
  case-pixel AA failures fell from 38/68 to 13/68 at 1440px and from 39/62 to
  3/62 at 390px, and the lowest p95 under real body copy rose from 3.11 to
  4.77. On a phone the plume is proportionally denser behind the panels, so
  under 640px the tint steps to black/42.

### Changed

- Hero uses the same `site-shell` inset as the rest of the page, a single
  magnetic work CTA, and a glass card with a real project screenshot.
- Featured-repo carousel: previous/next, a pause control (WCAG 2.2.2), 44px
  labelled dots in the same 2px ice language as `btn-nav`, arrow keys, and a
  live region. Rotation pauses on hover/focus and stays still under reduced
  motion. The hero uses the About 5+6 column rhythm so insets match the rest
  of the page.
- Glass panel is more opaque against the Bocanada field, with a solid fill
  when `prefers-reduced-transparency` is set.
- Work section is one featured case plus a two-column grid, with problem /
  outcome copy. Project photos have a small transform-only parallax.
- About is a single section (`#about`). Nav is Projects + About + Get in Touch,
  with glass from the first pixel.
- Footer close: ice beam and cropped CIUCANI wordmark. Bebop hold-to-play
  line is unchanged.
- Magnetic CTAs initialize `x`/`y` before `quickTo` so GSAP does not warn
  on pointer move.

### Removed

- Hero orbs, skill pills, availability pulse, and the unstyled ghost CTA.
- Experience as a separate nav target (it collided with About in the spy).
