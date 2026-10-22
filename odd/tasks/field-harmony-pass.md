# Feature: field-harmony-pass

Pulido a fondo del sistema de superficies contra el fondo animado (Bocanada:
cobalt field + LiquidEther dye + spark lattice). El faro de `AGENTS.md` dice que
el fondo es el centro de atención; el pass elimina todo lo que lo contradice.
Causa raíz encontrada antes de tocar diseño: el CSS servido perdía
`backdrop-filter` (solo salía `-webkit-backdrop-filter`, alias que Chromium ya
no implementa), así que **ninguna** superficie tenía frost en Blink: los paneles
eran placas negras planas con el lattice coral y el humo nítidos por encima.

## Specs

- **S1 (pedido)** — "puli a fondo mi web hay discrepancias de diseño respecto
  al fondo con animaciones que es el centro de atencion de mi web"
- **S2 (sistema)** — `globals.css` declara el frost de vidrio como la receta de
  los cuatro tiers (rail/panel/card/tile): "The tint, the ice edge and the top
  sheen are what read as glass". Un panel sin frost contradice el faro.
- **S3 (medido)** — el tint variaba por breakpoint y por estado de scroll
  (0.30 / 0.34 / 0.42). Con frost restaurado el peor caso mobile de `white/75`
  sobre el plume es 6.17:1 a 0.26 y 7.91:1 a 0.42 → el override ya no compra
  nada y rompe la receta única.
- **S4 (estado)** — la pill activa del nav (fondo `#fff`) tenía label a
  `white/75` = 1:1. Las reglas de estado viven en `@layer components` y la
  utility `text-white/75` (`@layer utilities`) les gana.
- **S5 (sistema)** — el `text-shadow` global de `.site-content` existe para el
  texto que se para sobre el campo; dentro de un panel con frost es un halo.
- **S6 (sistema)** — inset de panel único: `p-6 / md:p-8 / lg:p-10`. El hero
  usaba 20–24px y el resto 40px en desktop.
- **S7 (sistema)** — el nido se lee recesado; un nido de 583px con 348px de
  contenido es una placa vacía, y la profile card quedaba a 56px del margen del
  shell sin relación con la card vecina.
- **S8 (medido)** — el grain del nido lo aclaraba 14% y se comía el recess:
  el vidrio anidado quedaba a -7% del card y leía como placa clara.
- **S9 (medido)** — el acento ice sobre el panel medía 4.17:1 desktop y
  3.59:1 mobile: el énfasis del titular leía más débil que su propio cuerpo.
- **S10 (sistema)** — el fallback sin frost era un gradiente cobalto propio y
  el de `prefers-reduced-transparency` era negro 82%: dos respuestas distintas
  y ninguna hecha del ink del campo. `.glass-blur` no existía como clase.

## Tasks

| ID | Spec | Task | Route | Commit |
|----|------|------|-------|--------|
| T1 | S1,S2 | globals.css: una sola declaración estándar de `backdrop-filter` (el build agrega el prefijo); frost vivo en Blink | inline | `9bb0de1` |
| T2 | S3 | globals.css: un `--glass-tint` (0.30) para rail/panel/card/tile; fuera overrides de mobile y de nav scrolled; fallback sólido con el ink del campo en vez de negro 82% | inline | `9bb0de1` |
| T3 | S4 | globals.css: estados del nido/pill en una capa que gane a las utilities → pill blanca con label negro | inline | `9bb0de1` |
| T4 | S5 | globals.css: `text-shadow` solo en `.site-nav` y `.copy-veil`; fuera el halo global y el de h1–h3 | inline | `9bb0de1` |
| T5 | S6 | HeroSection/ProfileCard: inset `p-6 md:p-8 lg:p-10` en card de copy y en ambas caras de la profile card | inline | `f83cbbd` |
| T6 | S7 | Contact: nido del email a `w-fit`; ProfileCard alineada al margen derecho del shell en `lg` | inline | `f83cbbd` |
| T7 | S5 | globals.css: `::selection`/`caret-color` del campo; borrar tokens muertos (`--accent-warm`, `--glass-bar-fill-solid`, `.label`, `.site-content`, `.glass-blur`) | inline | `9bb0de1` |
| T8 | S1–S7 | Verificar: `backdrop-filter` computado ≠ none, contraste medido desktop/mobile, screenshots, detector, lint, build | inline | — |
| T9 | S8 | globals.css: el nido pierde el grain (recess por fill solo) | inline | `9bb0de1` |
| T10 | S9 | globals.css: acento ice mezclado 68/32 con paper para uso display | inline | `9bb0de1` |
| T11 | S10 | globals.css: un solo fallback (ink del campo) + `.glass-blur` fantasma fuera; `::selection`/caret del campo; tokens muertos fuera | inline | `9bb0de1` |
| T12 | S1–S10 | Cierre: doc + mirror + 3 work units | inline | `9bb0de1`, `f83cbbd`, `067aa3c` |

## Log

- **L1** — pedido del user, verbatim en S1 (sesión 2026-10-21).
- **L2** — evidencia de causa raíz: CSS servido
  `/_next/static/chunks/[root-of-the-server]__0byu7xy._.css` emitía
  `-webkit-backdrop-filter` sin la estándar; `getComputedStyle(.glass-card)
  .backdropFilter === "none"` y Chromium 155 no reconoce el alias. Probe inline:
  `backdrop-filter: blur(20px)` sí computa.
- **L3** — mediciones (screenshots con texto oculto, luminancia relativa +
  contraste): h1 7.26–8.09, `white/75` en card 8.63, ice accent 4.48 (large
  text ✓), `white/55` 6.41; Work header sobre el campo con veil 5.34–9.03.
  El `copy-veil` baja el p50 del backdrop de 0.102 a 0.055: hace trabajo real,
  se queda.
- **L4** — fix del frost verificado en dev y en el build de producción
  (`.next/static/chunks/1g8-15101lsr8.css` emite `-webkit-backdrop-filter` +
  `backdrop-filter`); `getComputedStyle(.glass-card).backdropFilter ===
  "blur(40px) saturate(1.12)"`. Tint único `#0000004d` (0.302).
- **L5** — medición post-fix, texto oculto + luminancia, peor caso (p95 del
  backdrop): h1 6.97 / 6.30, `white/75` en panel 7.14 / 6.81, `white/55` 7.34 /
  7.41, Work header sobre el campo 6.44 / 6.44 (large/body AA ✓). Acento ice
  nuevo (68% ice + 32% paper — #abc6ec): 5.37 / 4.63.
- **L6** — estado del nav: `text-white/75` (utilities) ganaba a
  `.glass-nest-item[aria-current]` (components) → pill blanca con label blanco
  (1:1). Movido a `@layer utilities`; medido después: `color rgb(0,0,0)` sobre
  `rgb(255,255,255)`, weight 700.
- **L7** — verificación: `pnpm lint` ✓, `pnpm build` ✓, `pnpm e2e:a11y`
  10 OK / 0 FALLA / 0 SALTADO (2 corridas), detector impeccable `[]`,
  sin overflow horizontal (desktop 1440 y mobile 390).
- **L8** — frontera de entrega: la rama `feat/agency-rebrand` ya trae slices
  previos; este pass agrega tres unidades chicas en la punta (`9bb0de1`
  sistema de superficies, `f83cbbd` alineación de paneles, `067aa3c`
  higiene de artefactos) más este doc.

---

## Pass 2 — taste gate (2026-10-22)

Segunda pasada sobre el mismo pedido, esta vez con el gate de `design-taste-frontend`
(`lint.mjs` + `inspect.mjs`). El gate se corre con `--allow` para los dispositivos que
son identidad del mundo vigente, no descuido:

- `gradient` (el campo Bocanada y los hairlines de `item-rule`), `glass` (los cuatro
  tiers), `shadow` / `text-shadow` / `button-fx` / `outlined-box` (la receta de vidrio
  y el halo del texto sobre el campo), `hairline` (el borde inferior del rail),
  `mono` (una línea: el trigger del easter egg, que es la señal de terminal de Bebop),
  `font-count` / `size-count` (Space Grotesk + Manrope son las caras del faro),
  `no-footage` (la imagen en movimiento es el canvas WebGL vivo, no un clip).

### Specs

- **S11 (medido)** — titular de 3 líneas a 1440 y 4 a 390; el gate lo prohíbe en
  cualquier viewport.
- **S12 (medido)** — "body 14px": el texto corrido de educación y de proyectos estaba
  en 14. Las leyes piden 16–20 para lectura.
- **S13 (medido)** — 4 bloques bajo 13px (12px en `profile-chip` y `btn-nav`, 10.4px en
  la etiqueta "Stack", 12px en el trigger) y 3 usos de mono fuera de código.
- **S14** — el mundo vigente manda: ningún `--allow` cambia la identidad; solo se
  arreglan tamaño, medida y lectura.

### Tasks

| ID | Spec | Task | Commit |
|----|------|------|--------|
| T13 | S11 | Hero: card de copy a `lg:col-span-7`, profile a `lg:col-start-9 lg:col-span-4` (mide 720/384, misma card) → titular 2 líneas a 1440 y 768 | `polish(hero): two-line headline measure` |
| T14 | S11 | Titular: piso del clamp 2.25rem → 2rem (390: 36px/4 líneas → 32px/3 líneas) | idem |
| T15 | S12 | `Experience` descripción y `ProjectsGrid` problem a `text-base` | idem |
| T16 | S13 | `profile-chip` y `btn-nav` a 13px; etiqueta "Stack" → `sr-only`; handle de GitHub a la cara de texto; trigger del egg a 13px | idem |
| T17 | S11–S14 | Verificar con el gate: 0 FAIL / 0 WARN con los `--allow` de identidad (queda 1 FAIL en 390: el titular pide 3 líneas) | gate |

### Log

- **L9** — gate corrido: `lint.mjs src` → 43 FAIL / 16 WARN (todos identidad salvo
  mono, body-size, small-text, headline-lines). `inspect.mjs` con
  `CHROME_PATH=/usr/bin/brave` (el script no encuentra Chrome solo).
- **L10** — medición antes/después: titular 3→2 líneas a 1440 y 2 a 768 (antes 2 con
  36px); 390: 4→3 líneas (32px). `body 14px` → `16px`. Tamaños en uso 11 → 9.
- **L11** — el único FAIL restante es el titular a 390 (3 líneas). No se toca la copia
  del user: para 2 líneas hace falta ≤32 caracteres ("Real problems, working software"
  = 31). Decisión suya.
- **L12** — `pnpm lint` ✓ · `pnpm e2e:a11y` 10 OK / 0 FALLA · `pnpm build` ✓.
