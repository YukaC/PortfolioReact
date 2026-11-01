# audit-program — implementar `audit.md` al 100%

Feature branch: `feat/audit-program` (desde `feat/prod-polish`, sin push).
Alcance: los 33 hallazgos de render/perf (§10), centralización de tokens (§14),
retículo vivo + humo en dos capas (§18–§19), fallback sin JS (§20), suites y gates
(§21), App Router (§16), datos de proyectos (§17) y SEO/GEO/AEO/AIO (§22–§26).
Fuente de verdad de los criterios: `audit.md` (no se resume: se cita).

## Specs

**S1 — Contenido legible sin JS (P0-1, §20.4-1).** El estado oculto lo pone JS:
`<html class="js">` inline en el `<head>` de `_document`. Default CSS = visible y
quieto. Criterio: con `javaScriptEnabled: false`, **0 palabras desplazadas**
(`transform: none` en las 26 `.w > span`) y los 4 headings leen su texto.

**S2 — Un solo dueño del scroll suavizado (P0-2, §11-2).** Salto de scroll a
progreso 0.5: `--p` al 95 % en **< 100 ms** (hoy 479–716 ms); `--scy` no duplica
lerp; cualquier lerp restante usa `damp(value, target, lambda, dt)` y no un factor
por frame. `smoothScroll.js` deja de pasar `lerp` y `duration` a la vez.

**S3 — Tiers de calidad + watchdog (P0-3, §18.6).** Tres estados `full` / `lite` /
`static` decididos por renderer+memoria+saveData+pointer+ancho; watchdog de 60
frames al montar y 60 en el primer scroll: p95 > 24 ms baja de tier y no vuelve a
subir. `pixelRatio = min(devicePixelRatio, 2)` solo en `full`; `powerPreference`
`default`. El gate por dispositivo (`static` sin canvas) **solo se activa después**
de S5 (retículo en CSS), tal como advierte §19.3.

**S4 — Canal de movimiento acotado (P1-1) y blur reducido (P1-2).** `--scy/--p/--px/
--py` se escriben solo en sus lectores (ya hecho en `scroll-perf-pass`), el parallax
del hero pasa a **un** wrapper compuesto, y el presupuesto de blur baja: superficie
total con `filter/backdrop` **≤ 2 Mpx** a 1440×900 (hoy 4.83), `will-change` solo
durante el gesto. Criterio: `RecalcStyleCount` de un scroll completo **< 150** (hoy 513).

**S5 — Retículo vivo en CSS y humo en dos capas (§18.2–§18.5, §19.2).**
`position: fixed; inset: 0`, densidad derivada del viewport (≤640 → **6**, ≤1024 →
**12**, ≤1600 → **22**, mayor → **36** destellos), posiciones en **coordenadas de
celda enteras** (`left: calc(var(--cx) * 48px + 24px)`), `--dur` 7–11 s y `--delay`
0–8 s, solo `opacity`/`transform`, cero JS. `coverGrid()` sale del shader. Fases del
humo `active → settling (350 ms, dissipation 0.993) → frozen (0 rAF)`. Criterio
§18.8/§19.4: reposo 30 s = **0 draws** y los destellos siguen; mobile 390×844 = **sin
`<canvas>`** y misma retícula; 6/12/22/36 contados por `display` computado; cada
destello cae **sobre el centro de un punto** (distancia 0 a `n × 48 + 24`).

**S6 — Ningún control que mienta (§20.4-3) y navegación sin JS (§20.4-2).** En
390 px con JS off se llega a `#portfolio`, `#about` y `#contact`: drawer sobre
`<details>/<summary>`. Filtros de trabajo, "Copiar mail" y el tagline de Bebop se
ocultan sin JS (`js-only`) salvo que tengan equivalente estático; el tagline queda
como texto sin `role="button"`.

**S7 — Tokens de §14.4, sin mover un pixel (§14.5).** Tres capas: `@theme` solo con
consumidor, `:root` semántico para el campo, capa 3 para movimiento. Se copian los
`clamp()` **literales** con su `line-height` y `letter-spacing`; `999px`/`9999px` →
`--radius-pill`; la escalera de alfa (`line 9 %`, `glass 5 %`, `hover 10 %`,
`soft 13 %`, `strong 22 %`) reemplaza 25 pasos literales. Eliminar: 13
`rgb(143 203 255)`, `#4ade80` → `--color-live`, `#07102a` → `--color-on-solid`,
`bg-[#060b1a]` → `bg-ink`, tokens fantasma (`bg-bg`, `text-text-muted`, …),
`tailwind.config.js` sin `@config`, `autoprefixer`, `.sr-only` a mano, `.focus-ring`
duplicando el `:focus-visible` global, `.site-logo`/`.work-repo` sin regla.
Criterio: `grep -rn "rgb(143 203 255)\|#4ade80\|#07102a" src` = 0;
`grep -rn "bg-\[#" src` = 0; capturas 390/768/900/1280/1440 con diff ≤ 0.1 %.

**S8 — Una sola rampa de movimiento (P2-24, §14.7 S2c).** Cada duración/curva de
`src/motion/config.js` existe como token `--duration-*`/`--ease-*`; ningún `0.xs`
literal en CSS ni en `config.js`.

**S9 — Breakpoints y z-index con un solo vocabulario (P2-25, §14.7 S2d).** El
conjunto de anchos de `matchMedia`/`innerWidth` en JS ⊆ media queries del CSS;
`--breakpoint-*` y módulo JS único que los deriva; `--z-*` semántico. Capturas en
800/900 px idénticas al baseline.

**S10 — Snapshot de proyectos validado (§17).** `validate()` fail-closed con las 5
reglas: solo `https:`, host en allowlist (`github.com`, `*.github.io`, `vercel.app`
+ `PROJECT_OVERRIDES`), rechazo de `javascript:`/`data:`/protocol-relative/URLs con
credenciales; `name` contra `^[A-Za-z0-9._-]{1,100}$`; descripción sin HTML, espacios
colapsados, ≤ 240 chars, sin caracteres de control; ≤ `MAX_PINNED_PROJECTS`; sin
duplicados por `repoLink`; escritura atómica (tmp + rename) con `sha256` en el log.
Si cualquier ítem falla **no se escribe nada**. El render lee solo del snapshot: 0
requests a GitHub desde el render y build sin red.

**S11 — Suites y gates (§21.2–§21.3).** Bloquean el merge: unit (`node:test`),
contract CSS, e2e funcional, **e2e sin JS**, e2e motion, visual, performance (desktop
/ mobile 4× / **software GL**) y a11y. Números: LCP ≤ 2500 ms · CLS ≤ 0.1 · TBT ≤
300 ms · JS inicial ≤ 260 kB; scroll p95 ≤ 24 ms y jank ≤ 2 %; **SwiftShader p95 ≤
24 ms**; reposo 10 s con **0 draws**, `RecalcStyleCount ≤ 1.5/frame`, `TaskDuration ≤
100 ms`; 0 long tasks > 250 ms; blur ≤ 2 Mpx; `pnpm audit --prod --audit-level=high`
= 0. CI `.github/workflows/quality.yml` con los 8 jobs como required checks.

**S12 — App Router (§16).** Coexisten `pages/` y `app/` y se migra ruta por ruta:
`app/layout.jsx` con `<html lang={locale}>` desde `headers()`, `app/page.jsx` (en) +
`app/[lang]/page.jsx` con `generateStaticParams` y `dynamicParams = false`,
`revalidate = 21600`, `generateMetadata` por locale (14 metas equivalentes 1:1),
split `PageFrame` (server) / `MotionRoot` (isla), islas de §16.2, `Reveal` /
`useRevealOnEnter` eliminados. Criterio: JS inicial −40 % vs baseline, diff 0 %, sin
warnings de hidratación, `/`, `/es`, `/pt` prerenderizadas.

**S13 — SEO/GEO/AEO/AIO (§24 S1–S6).** Sitemap con 3 `loc` + 3 alternates + `x-default`
y `lastmod` ISO; OG 1200×630 por idioma en `/og/{lang}.png` con `og:image:width/height`;
canonical determinista (una URL por idioma, `Vary` sin `Cookie` en HTML público);
JSON-LD con `ProfilePage`, `alumniOf` desde `EDUCATION`, `dateModified` y datos por
proyecto; `robots.txt` con 8 bloques nombrados (`GPTBot`, `OAI-SearchBot`,
`ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`, `CCBot`,
`Applebot-Extended`), `/llms.txt` y `/projects.json`; una URL por proyecto
(`/work/<slug>` + `/es`, `/pt`) y 4 Q&A visibles con `FAQPage` construidas **solo**
con datos del repo (texto 1:1 con lo visible).

**S14 — Tailwind por buckets (§13.2, §13.3 S3–S7).** Bucket A → utilidades inline por
sección (About → Contact → Footer → Work → Hero), Bucket B → `@utility`
(`glass`, `btn`, `nav-pill`, `work-tab`, `focus-ring`, `skip-link`), estados a
variantes (`pointer-coarse:`, `pointer-fine:`, `max-nav:`), CSS restante ordenado en
el orden del documento, y `pnpm check:css` que falla con un literal de color, una
clase muerta, un token huérfano o CSS compilado que crezca > 5 %. Criterio: `@layer
components` ≤ 28 KB y pixel diff ≤ 0.1 % en 390/1024/1440.

**S15 — Entrega en rama, sin publicar.** Commits Conventional por unidad de trabajo en
`feat/audit-program`; sin push, sin PR, sin deploy; `main` y `feat/prod-polish`
intactas. Cada decisión extra se reporta al cierre.

## Tasks

| ID | Specs | Ruta | Commit |
|---|---|---|---|
| T1 | S1, S7 | worker `css-tokens` (tokens + reveal CSS + config) | `70362f1` |
| T2 | S7b, S9 | worker `token-scale` (escala tipográfica, radios, blur, sombras, breakpoints) | `6216a79` |
| T3 | S2, S3 | worker `runtime-perf` (scroll dueño único + tiers) | `5d48e78`, `fe375c0` |
| T4 | S1 | parent (`html.js` en `_document`) + worker (observer) | `317e861`, `5d48e78` |
| T5 | S10 | worker `data-snapshot` (validate + snapshot + cron) | `d31f21a`, `951dcd5` |
| T6 | S5 | worker `field-layers` (retículo CSS + fases del humo) | `bfcfb5d` |
| T7 | S6 | worker `nojs-controls` (drawer `<details>`, `js-only`) | `51e8a5a` |
| T8 | S11 | worker `test-harness` (suites + CI + `check:css`) | `4148438` |
| T9 | S12 | worker `app-router` (A1-A5 + split server/isla) | `14acfe1` |
| T10 | S13 | worker `seo-geo` (S1/S2/S4/S5/S6) | `225a1c4` |
| T11 | S14, S4, S8 | worker `tailwind-buckets` (A) + `perf-residue` (B) | `1114ecf`, `63fbfb3` |
| T12 | S11, S15 | parent (gates finales + reporte) | ver §Log L16 |

**Corte de slice (para el revisor):** la rama arrastra los 30 commits de
`feat/prod-polish` porque nació de ahí; el programa nuevo son los commits
`70362f1..4148438`. Cada uno es una unidad revisable (~250-900 líneas), y los dos
más grandes (`70362f1` tokens+reveal CSS, `4148438` harness) son indivisibles: el
primero toca un solo archivo de 2100 líneas, el segundo son ocho archivos nuevos
que se sostienen entre sí.

Dependencias reales (no se paraleliza lo que comparte `globals.css`):
T1/T2 → T3/T4 en paralelo con T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12.

## Log

**L1 — pedido original (verbatim):**
> lanzq varios sub agente para implementar todo el Audit.md al 100%

**L2 — lectura del pedido.** "Todo el Audit.md" = las Partes II a VI (`audit.md`
§8–§26), en la secuencia consolidada de §15.3. La Parte I es histórico y no se
implementa. Los criterios no se reinterpretan: se citan como specs S1–S15.

**L3 — T1 (S1, S7/S2a) cerrado.** `globals.css` invierte el default: estado oculto bajo `html.js`, `.w > span` quieto fuera de él, reset en `(scripting: none)` y en `(prefers-reduced-motion: reduce)` out-especificando el gate (mismo S1 en los dos caminos). Una gramática de color: `@theme` pasa de 22 a 13 colores con consumidor (`#4ade80`→`--color-live`, `#07102a`→`--color-on-solid`, `#fff`→`--color-white`), escalera de alfa `--line/--glass/--hover/--soft/--strong` en `:root`, `rgb(143 203 255 / α)`→`color-mix()` y toda excepción con `/* literal: */`. Config: `tailwind.config.js` borrado, `autoprefixer` fuera de `postcss.config.js`. Micro: `overflow-x: clip`, `ping` por `opacity`/`scale` en `.status i::before`, `orn-in` `backwards`, `.sr-only` y `.focus-ring` duplicados fuera, sin `!important`. Gate nuevo: `src/lib/css-contract.test.js` (7 tests, texto del CSS, sin build). CSS compilado 65.896 B → 68.917 B (+4,58 
**L3 — T1 (S1, S7/S2a) cerrado.** `globals.css` invierte el default: el estado
oculto vive bajo `html.js`, `.w > span` queda quieto fuera de él, y los resets de
`(scripting: none)` y `(prefers-reduced-motion: reduce)` out-especifican el gate
(el mismo S1 por los dos caminos). Una gramática de color: `@theme` pasa de 22 a
13 colores, todos con consumidor (`#4ade80`→`--color-live`, `#07102a`→
`--color-on-solid`, `#fff`→`--color-white`), la escalera de alfa
`--line/--glass/--hover/--soft/--strong` en `:root`, los `rgb(143 203 255 / α)`
pasan a `color-mix()` y cada excepción lleva su `/* literal: … */`. Config:
`tailwind.config.js` borrado, `autoprefixer` fuera de `postcss.config.js`.
Micro: `overflow-x: clip`, `ping` con `opacity`/`scale` en `.status i::before`,
`orn-in` con `backwards`, `.sr-only` y `.focus-ring` duplicados fuera, sin
`!important`. Gate nuevo: `src/lib/css-contract.test.js` (7 tests, lee el CSS
como texto, sin build). CSS compilado 65.896 B → 68.917 B (+4,58 %; ~3 KB son
los pares `@supports` que Lightning CSS emite por cada `color-mix`).

**L3 — T1 (tokens, S1/S7) decisiones y límites.** `tailwind.config.js` borrado y
`autoprefixer` fuera del PostCSS. El color pasa a una sola gramática: los 13
`rgb(143 203 255)` ya eran 0, `#4ade80` → `--color-live`, `#07102a` →
`--color-on-solid`, `white/N` duplicados → escalera `--line/--glass/--hover/
--soft/--strong`, 9 tokens `@theme` sin consumidor eliminados. `color-mix()` en
los 25 alfas de sky: el CSS compilado crece +3.0 KB (+4.6 %) porque Lightning CSS
emite un `@supports` por sitio; el umbral del `check:css` se fijó sobre el tamaño
resultante, no sobre el anterior. `overflow-x: clip` en vez de `hidden` (no crea
contenedor de scroll, así que el `position: fixed` del campo queda a salvo).

**L4 — T3 (T3 specs S2/S3) medición.** `--p` al 95 % en **1-24 ms** (audit midió
479-716 ms): el desfase estaba en tres suavizados en serie. Tiers `full/lite/static`
con watchdog de 60 frames y degradación de un solo paso; el canvas **sigue montado**
en `static` hasta T6 porque §19.3 documenta que sacarlo antes del retículo CSS
pierde la identidad. `LiquidEther` recibió `pixelRatio`/`powerPreference`/
`idleBreath` (gap que el worker reportó y el padre cerró en `fe375c0`).

**L5 — T5 (snapshot, S10).** El render ya no habla con GitHub: 187 líneas de scrape
→ lectura de `src/data/pinned-projects.json` (6 tarjetas, `generatedAt`
`2026-11-01T02:09:11.081Z`, `sha256 5a3a68fe…`). `validate()` fail-closed con 15
tests; `sync-projects.mjs` + `/api/sync-projects` + cron 6 h con `CRON_SECRET`. Lo
que **no** se pudo probar: la corrida de red real (sin token ni red en la sesión).

**L6 — T6 (campo, S5).** El retículo sale del shader: capa fija de viewport, 36
destellos en coordenadas de celda entera, densidad 6/12/22/36 por media query, y
`coverGrid` fuera del fragment shader. Cada destello cae sobre el centro de un
punto (el criterio que falló en `8164756`), probado en `field-flares.test.js`.
Humo en `active → settling (350 ms, dissipation 0.993) → frozen (0 rAF)`; `static`
ya no monta canvas ni baja `three`. Duda abierta y reportada: el audit pide "1-4
destellos a la vez" y la tabla da media 2.88 / máximo 6 con ciclos distintos.

**L7 — T7 (sin JS, S6).** Drawer `<details>/<summary>` (el panel queda hermano del
`<details>` porque `backdrop-filter` en el pill lo convertiría en containing block
de un `fixed`). Filtros y copiar quedan `js-only`; el tagline es botón solo tras
hidratar. Limitación honesta: sin JS el panel no se cierra solo al tocar un ancla.

**L8 — T8 (gates, S11).** Ocho jobs, `e2e:nojs` (falla contra el build previo a T7,
pasa contra el árbol con T7), `e2e:functional` 51 OK, `measure:idle` y
`measure:scroll`, `check:css` con baseline 69 224 B. Números reales que **no**
pasan todavía: `TaskDuration` en reposo 322 ms (presupuesto 100), blur 2.12 Mpx
(presupuesto 2), p95 de scroll en este host (que reporta SwiftShader incluso sin
`--software-gl`). Decisión: esos tres se cierran en T11/S4, no relajando el umbral.

**L9 — decisión del padre sobre `check:css`.** Falla hoy por dos clases sin regla
(`site-logo`, `work-repo`) que el propio audit pide eliminar; se arreglan en T11 y
el gate queda rojo hasta entonces, a propósito.

**L10 — pendientes heredados registrados por los workers, fuera de sus superficies:**
`AGENTS.md` describe el retículo como parte del shader `coverGrid` y `.bocanada-sparks`
como stand-in (ya no es así) y lista `night`/`fog`/`ice` como tokens (eliminados);
`src/lib/quality-tier.js` dice "static = canvas más barato, no sin canvas" (ahora es
sin canvas); `motion/config.js` exporta `ENTER`/`DURATION.intro` sin uso;
`README.md` sigue diciendo ISR 1 h y scrape de GitHub.

**L11 — T9 (App Router, S12) y el criterio que no se cumple.** `src/app/` con dos
root layouts (`(en)` e `(intl)/[lang]`): medido, `headers()` en el layout raíz
convierte `/` en dinámica y borra el prerender de `/es`/`pt`, así que el idioma sale
del segmento (que es exactamente lo que el HTML ya servía). `generateMetadata`
reemplaza el `next/head` con paridad 1:1 (dos diferencias: `initial-scale=1.0` → `1`
y `next-size-adjust`), `src/pages` desaparece entero y el cron pasa a Route Handler.
El split server/isla se hizo completo: `Layout`, Hero, Marquee, Work, About y Contact
son Server Components y cada uno embebe su isla (`HeroActions`, `MarqueeMotion`,
`WorkFilters`, `AboutScroll`, `CopyButton`); el traductor de i18n quedó sin hooks.

**El criterio "JS inicial −40 %" no se cumple y la medición explica por qué:** el
payload pasa de 409 684 a 408 265 B (−0,35 %) porque las secciones pesaban ~1,5 KB
del grafo cliente; el peso es el chunk de `three`, que el presupuesto de JS de este
repo ya excluye hasta que el lector interactúa (ver `prod-polish` L5). El HTML crece
(+57 KB crudos) porque el markup de las secciones ahora viaja ahí. Se deja escrito:
S12 se cumple en "el contenido estático deja de ser cliente", no en el −40 %, y el
número honesto es el de `measure:vitals` (JS crítico antes de engagement).

**L12 — T10 (SEO, S13) decisiones.** Rama conservadora de §24 S3: el rewrite por
`Accept-Language` **no se toca** (el dueño lo pidió y lo reportó como bug cuando faltó);
cada idioma emite su canonical y alternates recíprocos. `twitter:creator` no se emite
porque no hay cuenta que declarar. Son 18 páginas de proyecto, no 21: el snapshot
sirve 6 tarjetas (`MAX_PINNED_PROJECTS`) y no se inventa una página para `AhorrAR`.
El mismo `FAQPage` va en las 18 páginas, como pide §24 S6; queda anotado que Google
desaconseja duplicar FAQ markup y que si molesta, la salida es una sola FAQ en `/`.

**L13 — T11A (buckets, S14).** `@layer components` 36,6 → 27,4 KB (−25 %), 28
`@utility`, 0 media queries de puntero (variantes `pointer-fine`/`pointer-coarse`/
`no-hover`/`max-xs`/`wide`/`max-wide`), rampa de movimiento en `:root` leída por
`motion/config.js`, y las tres clases muertas eliminadas con `check:css` en verde.
No hubo pixel-diff: no existe baseline visual commiteado — la verificación fue por
estilos computados (1440/1024/390) más las suites; queda como deuda de §21.2
("visual" corre pero no compara).

**L14 — T11B (S4) y los dos presupuestos que no cierran.** Blur 1,86 → 0,16 Mpx
(perfil convolucionado en lugar de `filter: blur(110px)` desde 900 px; diff 1440
mean 0,9/255, 390 bit-idéntico) y renderer por software → `static` (sin canvas):
software GL 366,7 → 100 ms p95. **No cierran:** (a) `TaskDuration` en reposo 294-361 ms
contra 100 — atribuido con CDP a las 22 animaciones infinitas de la capa de
identidad: `RecalcStyleCount` ya está en 1,0/frame (dentro del presupuesto) y toda
construcción más barata medida queda en 134 ms; (b) p95 de scroll en los perfiles
"desktop" y software GL (50 y 100 ms contra 24) — este host reporta SwiftShader
también en "desktop", así que el número no es una afirmación sobre GPU real; el
perfil mobile 4× sí cumple (16,8 ms). Ambas quedan sin maquillar: no se relajó
ningún umbral.

**L15 — T2 (S7b/S9).** 55 tokens nuevos: 15 pasos de tipo con su `line-height` y
`letter-spacing` (los `clamp()` copiados sin redondear), radios, blur, sombras y la
escalera `--z-*` semántica; un solo `font-family` en `.root-layout` y `body` deja de
declarar familia. Los breakpoints pasan a `--breakpoint-nav` (768) y
`--breakpoint-wide` (900) y `src/lib/breakpoints.js` los lee en módulo, así que el
conjunto de anchos del JS es subconjunto del CSS. `check:css` ahora también trata un
`z-index` literal como un literal de color y no marca los tokens de breakpoint como
huérfanos. Fidelidad: 45 selectores × 5 anchos comparados por estilo computado entre
el build anterior y el nuevo — 15 diferencias, todas nombradas (cola genérica de la
pila de fuentes, `z-index auto→0` en la capa del campo, `isolation` en `.work-go`,
`rounded-sm` 4→6 px según §14.4, `9999px→999px` que clampa igual). **No hay baseline
visual commiteado**: el pixel diff sigue siendo deuda declarada de §21.2.

## Ronda 2 (revisión independiente + correcciones)

**L16 — lo que verificó la ronda de auditoría (verificador + revisor adversarial).**
Cumplen con evidencia S1, S2, S3, S5, S6, S8, S10, S15. Parciales S4, S7, S9, S11,
S12, S13, S14. Se refutaron dos afirmaciones mías: (a) "el −40 % de JS no existe":
medido con la definición del propio repo (JS crítico antes de engagement) es
**−46,6 %** (399 → 213 kB), lo que no existe es el peso de las secciones, que era
~1,5 KB; (b) "el idle es inalcanzable": con 1 destello animado da 100 ms y con los
destellos quietos 49 ms — el costo es lineal en nodos animados (~11 ms/nodo sobre un
piso de 48 ms). Lo que no se puede es tener 22 destellos vivos y ≤100 ms en este
host, y eso ahora está dicho con números, no con una opinión.

**L17 — defectos encontrados y corregidos.** El punto de estado vivo había perdido
su clase en la migración a utilidades (el dot no se dibujaba); el refresh de 6 h
escribía dentro del filesystem desplegado (500 en Vercel y `generatedAt` congelado,
lo que congelaba `lastmod`, `dateModified` y el "última actualización" de las 18
páginas); el allowlist no aceptaba ningún deploy real (`foo.vercel.app`) y tiraba el
link de demo sin avisar; `PINNED_FALLBACK` era una segunda fuente y el default del
render. Además: tags sin sanear llegaban a `/llms.txt`, `Vary: Cookie` fragmentaba
caché, y el reveal podía dejar secciones invisibles para siempre si el lector
cambiaba `prefers-reduced-motion` a mitad de sesión.

**L18 — la lista de proyectos (lo que reportó el dueño).** No era caché: el snapshot
se había sembrado desde `PINNED_FALLBACK` mientras el build anterior renderizaba el
scrape de pines en vivo, así que cuatro proyectos (AhorrAR, OpenBalance, Myrk Studio,
Pelis en Casa) desaparecieron y entraron cuatro repos no fijados. El snapshot se
re-sembró desde el perfil real (`--public`, sin token, mismo `validate()` y escritura
atómica): Turnos App, OpenBalance, Myrk Studio, Pelis en Casa, AhorrAR, App Despensa.
Se restauró además el pill `GitHub` de cada fila (el título va al caso, el pill al
repo, el overlay al demo), que era lo que acortaba el documento 244 px.

**L19 — destellos y reveal (percepción del dueño).** Los destellos iban 0 → 1 → 0,6
→ 0 en tres pasos duros y el campo quedaba oscuro la mayor parte del minuto (1440:
media 1,4 encendidos, 9,8 % del tiempo a oscuras; 390: media 0,4, 62,8 %). Ahora cada
banda de densidad tiene su campana con ataque y caída suaves, pico 0,5 y fase
brillante de 0,5–3,6 s según cuántos puntos haya: 1440 media 1,66, pico 4, 3,3 % a
oscuras; 390 media 2,29, pico 4, 1,2 %. El reveal bajó de 1,1 s con `blur(6px)` y
70 ms de stagger a 0,45 s sin filtro y 45 ms. **Medido en GPU real (RX 570): el
scroll no tiene ni un frame sobre 32 ms y los 14 nodos del observer se revelan
todos** — el "reveal deficiente" que se sentía no se reprodujo en hardware; el
número que sí existe es que el campo pesa más en un teléfono sin GPU.

**L20 — números finales de la ronda (renderer en cada línea).** HW: scroll desktop
p95 **16,8 ms**, jank **0 %**, blur **0,02 Mpx**; mobile 4× p95 **16,7 ms**, jank
**0 %**; idle canvas montado, **0 draws** en 10 s, recalc **1,0/frame**,
`TaskDuration` **299 ms** (sigue sobre 100 por las 22 animaciones de identidad, L14);
`visual:diff` **45/45 a 0,0000 %** contra baseline commiteado; e2e functional /
no-js / runtime en verde; vitals LCP 204–232 ms, CLS 0, TBT 122–155 ms, JS 213 kB.
Sigue en rojo, y se reporta: `idle/task` (decisión de producto sobre la densidad de
destellos), p95 en SwiftShader (50 ms, rasterizador por CPU) y `@layer components`
en 28 476 B contra el techo de 28 672 B.

**L21 — el humo (pedido del dueño, verbatim: "eliminaste el humo de la version de pc?").**
No se había borrado, pero en la práctica sí: la fase `frozen` aparcaba el campo 1,55 s
después de la última interacción, `autoDemo` está apagado y dos capturas en reposo no
mostraban ninguna pluma — el humo existía sólo mientras se movía el puntero o se
scrolleaba. Se agregó una cuarta fase `ambient`, sólo para el tier `full` con puntero fino,
ancho ≥ `wide` y sin reduced motion: un frame cada 190 ms (~5,3 fps), media cadencia del
`breath` de 143 ms que el audit había quitado y sin `coverGrid` en el pase, con el mismo
`AutoDriver` a 0,28 de velocidad y la tinta más diluida para que se acumule neblina y no un
faro. Medido: 954 draw calls en 10 s en reposo (el build congelado daba 0), pluma viva en un
recorte con el retículo oculto (30,5 % de píxeles distintos a 2 s), 0 draws en reduced motion
y en 390 px, tab oculta lo detiene, scroll igual (p95 16,8 ms, jank 0 %). `measure:idle`
distingue ahora las dos rutas: el presupuesto estricto de 0 draws sigue valiendo para las
páginas que se congelan y la ruta ambiente tiene su propio gate de cadencia 4-6 fps, así que
ninguna de las dos puede pasar por la puerta de la otra. `TaskDuration` sigue en rojo
(319 ms): ese costo son las 22 animaciones de identidad, no el humo (sin destellos mide
49 ms). Constantes estéticas para ajustar sin tocar el diseño: `AMBIENT_Y_MAX` (altura de la
pluma) y `AMBIENT_DISSIPATION` (cuánto se diluye).
