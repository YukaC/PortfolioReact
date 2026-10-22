# Changelog

## Unreleased

### Field-first redesign (glass-motion reference)

- The layout, the type and the micro-interactions now follow the
  `portfolio-glass-motion` reference: a navy field, type as the hero, and glass
  only where a surface has a job.
- The field is retoned, not replaced. `#060b1a` base, a cobalt
  `.bocanada-field` gradient, three blobs whose hue follows the reading progress,
  the WebGL smoke and the coral 48px lattice with its spring flares (both drawn
  in the `LiquidEther` shader), the cursor light, grain, and a 2px progress bar.
  The smoke, the dots and the flares are untouched.
- One motion channel: `useFieldMotion` runs a single rAF loop with inertia and
  writes `--scy`, `--p`, `--hf`, `--px/--py`, `--mx/--my` on `:root`. Every layer
  reads from it, so nothing snaps.
- Fraunces italic joins Manrope and Space Grotesk as the display accent
  (`.accent`, the footer tagline, the wordmark). The composite font stacks are
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
