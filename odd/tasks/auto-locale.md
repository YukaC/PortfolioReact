# Auto locale

Status: **implemented, verified, delivery open** — `/`, `/es`, `/pt` prerendered;
edge negotiation; region refined after mount.

## Specs

S1. "hace una funcion para el portfolio que detecte automaticamente la region del
usuario por su config de idioma del navegador". The site must read the visitor's
language configuration (`Accept-Language`, and the browser's own region tag) and
decide the language from it, without the visitor choosing anything.

S2. "y traduzca de antemano la web en la precarga". The translation must be
already in the document the visitor receives: the served HTML carries the
translated copy, the `<head>` title/description and social tags. No client-side
dictionary swap after hydration, and therefore no flash of English.

S3. The region survives where HTML can express it: `<html lang>` becomes `es-AR`
/ `pt-BR`, not just `es` / `pt`, as soon as the document is on screen. A
prerendered file cannot know a region, so the server ships the base language and
the client refines the attribute only — never the text.

S4. An explicit choice wins over detection and persists: `?lang=` beats the stored
cookie, the cookie beats `Accept-Language`, and English is the fallback. A
missing translation falls back to the English string, never to a blank or a raw
key.

S5. Nothing that already exists regresses: the hero reveal, the WebGL field, the
wordmark motion, the reduced-motion path, the a11y contracts and the pinned-project
ISR behave exactly as before, and the language is never part of the public URL.

S6. Project cards translate too: the GitHub pins arrive in English and the
translations live next to their existing override, applied per field.

S7. Verification: `pnpm test` (locale + dictionary parity), `pnpm lint`,
`pnpm build` (three prerendered pages + middleware), `e2e:a11y`, `e2e:motion`, and
a runtime probe of the negotiation matrix (header, cookie, query, `/es`, `/pt`,
unknown language) plus a hydration probe on the three pages.

## Design

- `src/i18n/locale.js` — pure decisions: `normalizeLocale`, `parseAcceptLanguage`,
  `pickLocale`, `toHtmlLang`, `htmlLangFromPath`. Pure so the edge runtime, the
  document shell and React can share one answer and the tests need no browser.
- `middleware.js` — the edge decision. `/` rewrites internally to `/es` or `/pt`,
  so the URL bar keeps `/`, and the choice travels to the render as
  `x-pf-locale` / `x-pf-html-lang`, plus `pf_locale` (one year) and
  `Vary: Accept-Language, Cookie`.
- `src/pages/{index,es,pt}.jsx` — three prerendered pages (ISR, one hour) that
  render the same `Home` with their own `locale`.
- `src/i18n/LocaleProvider.jsx` + `messages/` — dictionary resolution with a
  per-key English fallback; `t()` in components. The locale arrives as a page
  prop, so the first client render uses the server's dictionary: no `navigator`
  read during render, no hydration mismatch.
- `src/lib/project-i18n.js` — per-field translation of the pinned projects from
  the `i18n` blocks already owned by `src/data/projects.js`.
- `src/lib/i18n-locale.test.js` — the negotiation matrix and a parity test that
  every English key exists in Spanish and Portuguese.

## Tasks

| ID | Spec | Route | Status | Commit |
| --- | --- | --- | --- | --- |
| T1 | S1, S3, S4 | inline | DONE | `08e2c45` |
| T2 | S2 | inline | DONE | `08e2c45` |
| T3 | S2 | inline | DONE | `08e2c45` |
| T4 | S2, S4 | inline | DONE | `e08ab22` |
| T5 | S2, S5 | inline | DONE | `e08ab22` |
| T6 | S2, S5 | inline | DONE | `e08ab22` |
| T7 | S6 | inline | DONE | `e08ab22` |
| T8 | S7 | inline | DONE | `e08ab22` (evidence below) |
| T9 | S2, S5 | inline | DONE | this slice |

## Delivery

Owner picked **push + chained PRs**. `feat/agency-rebrand` is pushed and doubles as
the chain tracker (#51, draft, never merged); the chain itself is seven stacked
slices, each PR targeting the one before it, #44 (`main`) to #50:

| Slice | Branch | PR |
| --- | --- | --- |
| 01 foundation | `pr/01-rebrand-foundation` | #44 |
| 02 glass identity | `pr/02-glass-identity` | #45 |
| 03 frost system | `pr/03-frost-system` | #46 |
| 04 hero, profile, SEO | `pr/04-hero-profile-and-seo` | #47 |
| 05 sections and taste | `pr/05-sections-and-taste` | #48 |
| 06 perf budget | `pr/06-perf-budget` | #49 |
| 07 auto-locale | `pr/07-auto-locale` | #50 (tree = `feat/agency-rebrand`) |

This feature's own boundary is slice 07: the two i18n commits plus their records
and the refreshed card screenshots. `size:exception` is recommended on every
slice — the split follows authored passes, not a line count, because the branch is
one rebrand of one site.

`ciucani.vercel.app` deploys from `feat/agency-rebrand` and was redeployed after
this feature landed; merging to `main` stays the owner's call.

Route: inline for every task. The worker that started this feature was cut
mid-verification before it could commit, so the remaining work was verification,
one fix-less pass through the diff and the documentation — no second writer.

## Evidence

- `pnpm test` — 17 pass, 0 fail (8 negotiation cases, dictionary parity, the
  existing project-link suite).
- `pnpm lint` — clean.
- `pnpm build` — `/` 1107 ms, `/es` 1108 ms, `/pt` 1107 ms prerendered, plus
  `ƒ Proxy (Middleware)`.
- `e2e:a11y` against the production build — 16 OK / 0 fail / 0 skipped, including
  `console: sin errores en consola`, `first-tab`, `a11y-labels` and `reduced-motion`.
- `e2e:motion` — 13 OK / 0 fail, including `console/errors` and
  `console/reset-warning`.
- Negotiation matrix, `next start` on :3102:

  | request | Accept-Language | sent `lang` | copy |
  | --- | --- | --- | --- |
  | `/` | `es-AR,es;q=0.9,en;q=0.8` | `es` | "Convierto problemas reales…" |
  | `/` | `pt-BR,pt;q=0.9` | `pt` | "Transformo problemas reais…" |
  | `/` | `en-US,en;q=0.9` | `en` | "Turning real problems…" |
  | `/` | `fr-FR,fr;q=0.9` | `en` | English fallback |
  | `/es` | `es-AR` | `es` | Spanish |
  | `/?lang=pt` | `en-US` | `pt` | Portuguese, cookie `pf_locale=pt` |
  | `/` | `en-US` + cookie `pf_locale=pt-BR` | `pt` | cookie beats header |

  Titles are translated in the served HTML: `/es` is "Agustin Ciucani,
  desarrollador full-stack en Buenos Aires".

- Hydration probe (Playwright, production build): `/` + `es-AR` →
  `document.documentElement.lang === "es-AR"`, cookie `es-AR`, 0 console errors;
  `/pt` + `pt-BR` → `pt-BR`, 0 errors; `/` + `en-US` → `en-US`, 0 errors. The
  region refinement is the only thing that changes after mount.

## Log

L1. "hace una funcion para el portfolio que detecte automaticamente la region
del usuario por su config de idioma del navegador y traduzca de antemano la web
en la precarga"

L2. "de antemano … en la precarga" is read as prerendering, not as a client
effect: the three languages are built as static pages and the edge picks one, so
the bytes that arrive are already translated. A client-side dictionary swap would
satisfy "no extra click" but not "de antemano", and it would guarantee a flash.

L3. Rewriting `/` internally instead of redirecting to `/es` keeps the public URL
stable (S5) and keeps the visitor's address. The trade-off is that `Vary` has to
be honest about `Accept-Language` and `Cookie`, which the middleware sets.

L4. A prerendered file cannot carry a region, so the region cannot be in the
first byte: `/es` is built once for every Spanish speaker. The region is therefore
refined in `LocaleProvider` from the cookie (`es-AR`), which changes only
`<html lang>` — the text is already correct, so there is nothing to re-render.

L5. `es-419` (UN M49, Latin America) keeps the language and drops the region: HTML
has no exact regional tag for it, and inventing `es-419` as a `lang` value would
be worse than `es`.

L6. Project copy is translated next to the override that already owns the slug
rather than in a second translation table, so a slug's English and its
translations cannot drift apart.

L7. Verification caught no defect, so no correction round was needed. The build's
GitHub 403 fallbacks (`fetchRepoHomepage`) are the previous session's rate limit,
not this change: the fallback list is what renders, exactly as before.
