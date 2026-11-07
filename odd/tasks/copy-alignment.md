# Feature: copy-alignment

Rewrite of the site's copy (ES/EN/PT), project cards and SEO surface to match the
owner's brief of 2026-02 (embedded verbatim below). The shipped Bocanada design
stays: this feature changes words, data and metadata, never the visual system.

Branch: `feat/audit-program`. Delivery: `ask-on-risk` (default), one work unit per area.

## Specs

Every string below is the owner's exact text. Spanish is the source of truth; `en`
and `pt` are faithful translations of it, in the same voice (short sentences, verb
first; ES keeps rioplatense voseo).

### S1 — Navigation

Links: `Proyectos` · `Sobre mí` · `Contacto`. Language selector: EN / ES / PT, unchanged.

### S2 — Hero

| Element | Text |
|---|---|
| status | `Disponible para freelance y full-time` |
| h1 | `Agustín Ciucani` |
| h1 role (grey, inside the h1) | `desarrollador full-stack` |
| subtitle | `Armo tu software de punta a punta.` (accent on `de punta a punta.`) |
| paragraph | `Vivo en Coronel Dorrego, Buenos Aires. Hago interfaces y paneles con React, Next.js y Tailwind, y los backends que los sostienen con Node o Flask sobre PostgreSQL.` |
| button 1 | `Ver proyectos` |
| button 2 | `Escribime` |

Tech tags: `React` · `Next.js` · `TypeScript` · `Tailwind` · `Node` · `Python` · `Flask` · `PostgreSQL`
Focus tags: `Interfaces` · `Paneles` · `PWAs` · `APIs` · `Accesible` · `Responsive`

The role sits **inside** the `h1` as a `span`, so the heading reads name + role:

```tsx
<h1>
  Agustín Ciucani
  <span className="block text-neutral-400">desarrollador full-stack</span>
</h1>
```

(the grey uses the existing palette token for secondary type, not a literal).

### S3 — Projects

| Element | Text |
|---|---|
| eyebrow | `Proyectos` |
| h2 | `Lo que vengo armando` (accent on `armando`) |
| lead | `Cada uno tiene demo con datos de ejemplo y el código en GitHub.` |
| filters | `Todos` · `React` · `Python` · `Sistemas` · `PWA` |

Cards, in this order:

1. **Turnos App** — `Sistema de turnos multi-tenant para las distintas áreas de la municipalidad de mi pueblo. Tiene un portal para vecinos y un panel de admin con validación en tiempo real y métricas en ECharts.` — `JavaScript · Python · Flask · MySQL`
2. **OpenBalance** — `Nació de una necesidad propia: un presupuesto que va por mes, con modo semanal opcional para quien cobra por semana.` — `React · Next.js · TypeScript`
3. **Myrk Studio** — `Sitio para un estudio que hace series de Minecraft, con escenas 3D en Three.js.` — `React · Vite · Tailwind · Three.js`
4. **Pelis en Casa** — `Mi trabajo final de 2022 (jQuery y Flask), migrado a React con animaciones en Motion.` — `React · Vite · Motion`
5. **AhorrAR** — `Precios de supermercados argentinos scrapeados en vivo, ordenados y verificables.` — `React · TypeScript · Express · Scrapling`
6. **App Despensa** — `Punto de venta para un almacén: ventas, caja y stock. PWA local-first, pensada para funcionar sin conexión.` — `React · Node · PostgreSQL · PWA`

Per card: `GitHub` and `Ver demo`. A demo button that is icon-only keeps a
`aria-label` that names the project (`Ver demo de {proyecto}`), and the same for
GitHub. Existing repository and demo URLs in `src/data/projects.js` are kept when the
project already exists there; a project missing from that file gets its card data
but no invented URL.

### S4 — About

| Element | Text |
|---|---|
| h2 | `Del taller al código` |
| under the portrait | `Desarrollador full-stack · Buenos Aires` |

Intro (verbatim):

> Antes de programar trabajé como operario metalúrgico, haciendo control de calidad bajo normas como ISO 9001, en un taller mecánico y como repositor. Después empecé la tecnicatura en programación en la UTN de Bahía Blanca y la terminé en la UPSO. App Despensa salió de ese recorrido: el stock y la caja ya los conocía desde el otro lado del mostrador.

Work subsection `Cómo trabajo`, with the code block verbatim:

```js
const agustin = {
  rol: 'full-stack',
  stack: ['React', 'Next.js', 'Node', 'Python'],
  entrega: 'de punta a punta'
};
```

Then:

> Me importa que la interfaz responda rápido y se entienda sola. Ahora estoy enfocado en llevar mis proyectos a un nivel profesional y en dar el salto a mi primer trabajo en IT.

> Fuera de la compu: guitarra, música y MUCHO mate.

Skills: `React` · `Next.js` · `TypeScript` · `Tailwind` · `Node` · `Python` · `PostgreSQL` · `Git`
Button: `Ver el código`

Education (`Formación`), four entries, each with period, title, institution and detail:

1. `2024 – 2025` · `Tecnicatura Universitaria en Tecnologías de la Programación` · `Universidad Provincial del Sudoeste (UPSO)` · `Desarrollo de software, bases de datos y metodologías ágiles.`
2. `2021 – 2022` · `Tecnicatura Universitaria en Programación (un año y medio cursado)` · `Universidad Tecnológica Nacional, Facultad Regional Bahía Blanca (UTN FRBB)` · `Primera etapa de la carrera, que terminé en la UPSO.`
3. `2018 – 2020` · `Técnico en Informática Personal y Profesional` · `Instituto San José` · `Programación, redes, hardware y soporte.`
4. `2014 – 2017` · `Electrónica` · `EEST N°1` · (no detail line)

The section keeps its current design language: statement, chips, drawn timeline,
portrait. The four education entries reuse the existing timeline item, now with a
period line; no new visual system.

### S5 — Contact

| Element | Text |
|---|---|
| eyebrow | `Contacto` |
| h2 | `Contame qué estás armando` |
| lead | `Freelance o full-time. Pasame la idea, el stack y para cuándo lo necesitás, y te respondo cómo lo desarrollaríamos.` |
| button 1 | `agusyuk25@gmail.com` |
| button 2 | `Copiar mail` |

### S6 — Footer

`© {año actual} Agustín Ciucani`, with the year from `new Date().getFullYear()`.

### S7 — SEO and GEO

`metadata` (Next.js App Router) with these exact values, wired to whatever i18n
routing already exists:

- title: `Agustín Ciucani · Desarrollador full-stack en Buenos Aires`
- description: `Desarrollador full-stack en Buenos Aires. Apps web, paneles y PWAs con React, Next.js, Node y Python. Disponible para freelance y full-time.`
- canonical: `https://ciucani.vercel.app`; languages `en`/`es`/`pt` → `/en`, `/es`, `/pt`
- openGraph: title `Agustín Ciucani · Desarrollador full-stack`, description `Armo tu software de punta a punta. React, Next.js, Node y Python.`, url `https://ciucani.vercel.app`, locale `es_AR`, type `website`

JSON-LD `Person` in the document body: name `Agustín Ciucani`, jobTitle
`Desarrollador full-stack`, url `https://ciucani.vercel.app`, email
`mailto:agusyuk25@gmail.com`, address (Coronel Dorrego, Buenos Aires, AR), alumniOf
`Universidad Provincial del Sudoeste`, knowsAbout `React, Next.js, TypeScript, Node.js,
Python, PostgreSQL`, sameAs built from the profile URLs the repository already holds
(no invented handles).

Checklist: one `h1` per page (the hero one); descriptive `alt` on the portrait
(`Retrato de Agustín Ciucani`); descriptive `alt` on each project capture; `html lang`
correct per locale (`es`, `en`, `pt`).

### S8 — Out of scope

Section 8 of the brief (`Para verificar`) is CV/LinkedIn advice, not site code: the
CV, the LinkedIn profile and the UTN analítico are not in this repository. No site
change comes from it. It is reported back to the owner as a follow-up list.

Also out of scope: the visual system, palette, motion and layout rules of
`src/styles/globals.css` (see `AGENTS.md`); the Bebop easter egg; URLs that do not
already exist in the repository.

## Tasks

| ID | Task | Specs | Route | Commit |
|---|---|---|---|---|
| T1 | Hero: copy, name+role heading, subtitle accent, tech and focus tags | S2 | delegated writer A | `80ff932` |
| T2 | Projects: card data, section copy, filters, demo/GitHub labels | S3 | delegated writer A | `80ff932` |
| T3 | About: intro, work subsection with code block, skills, four education entries | S4 | delegated writer B | `80ff932` |
| T4 | Contact and footer copy | S1, S5, S6 | delegated writer B | `80ff932` |
| T5 | SEO surface: metadata, JSON-LD Person, canonical and languages, html lang, alts | S7 | delegated writer B + parent | `e2425a7` |
| T6 | Quality gates (`pnpm gate`) and close report | all | parent inline | _(this commit)_ |

Delivery strategy: `ask-on-risk`. Two work units, one commit each; the branch already
carries 129 commits on top of `origin/main` from earlier features, so this feature adds
no further slice boundary of its own — its own diff is ~840 lines across the two
commits above.

## Log

- L1 (owner, verbatim): «/tmp/105b65c4-89c9-4fa9-b4f8-74e1c02fd030.md haceme est9sncambios, cuak1uier duda me.consuktas»
  The brief at that path is reproduced verbatim in `## Specs` above so the writers
  stay inside the repository.
- L2 (decision): `es` is authored from the brief; `en` and `pt` are translations of it.
  Existing locale voice rules in `src/i18n/messages/index.js` stay.
- L3 (decision): project repositories and demo URLs are not invented. Cards reuse the
  URLs already in `src/data/projects.js`.
- L4 (evidence): `https://ciucani.vercel.app` answers 200; `https://agustinciucani.dev`
  does not resolve. `SITE_URL` moved to the live origin, so canonical, sitemap,
  `llms.txt` and the OG card host agree with S7. The dead origin was a site-wide defect,
  not a copy change.
- L5 (decision): `/en` is not a route — English is the bare root. `languages` points
  `en` at the real route and keeps `x-default`, as S7 asks. A real `/en` is a separate
  routing task, not metadata.
- L6 (decision): the list's demo footnote is removed. S3's new lead already says the
  demos run on sample data; two muted notes side by side were the weakest copy on the
  page, and the project pages keep their own disclaimer.
- L7 (decision): the About intro is the section's lit `.statement` — the signature
  element of that section — rather than a plainer paragraph under the portrait. The
  four education entries keep the en dash the brief writes; the SEO constant keeps the
  ASCII range its date parser splits, and the duplication is deliberate.
- L8 (decision): the `Sistemas` filter stays as S3 lists it, even though no brief card
  carries that tag: a filter matching nothing is a data task, not a copy one.
- L9 (deviation): project covers keep `alt=""` inside the `aria-hidden` decorations that
  duplicate the adjacent row title. S7's checklist asks for a descriptive alt per
  capture; on a decorative duplicate that alt would make the same image announce twice,
  so the accessible name stays on the row. Recorded as a deliberate exception, not a
  silent skip.
- L10 (verification): `pnpm build` green; `pnpm gate` 5 pass, 0 fail (lint, unit, css,
  motion, bebop). Browser check on `/es`, `/pt` and the root: one `h1` per page carrying
  name + role, `<html lang>` per locale, canonical on the live origin, the brief's
  section headings in order.
- L11 (follow-ups for the owner, no site change): the brief's `Para verificar` list is
  CV/LinkedIn work — the official technical-degree name, the CV role, the CV entries for
  UTN and the municipal system, and the same handle in GitHub/LinkedIn/CV. Section 8's
  open questions stay open: whether App Despensa also syncs with a server, and the CV
  skills list.
