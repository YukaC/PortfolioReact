# Changelog

## Unreleased

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
