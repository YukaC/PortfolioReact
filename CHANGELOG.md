# Changelog

## Unreleased

### Glass system

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
