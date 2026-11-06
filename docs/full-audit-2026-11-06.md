# Full audit — 6 nov 2026

Visual, técnico, rendimiento, accesibilidad, SEO, seguridad y mantenibilidad.
Árbol auditado: `feat/audit-program` en `a310ab0` + cambios sin commitear (working tree tal cual).
Diagnóstico solamente: no se cambió código.

Revisión del 6/11: se chequeó cada referencia `archivo:línea` contra el árbol y se volvió a correr
`pnpm gate` (5/5, EXIT 0). Las mediciones de e2e, vitals, scroll e idle son de la corrida original
del 6/11 y **no** se repitieron en la revisión.

## 0. Resumen

| Área | Estado | Lo más importante |
|---|---|---|
| Gates (`pnpm gate`) | ✅ 5/5 | lint, unit, css, motion, bebop |
| Build | ✅ | 30 páginas estáticas/SSG, sin warnings de build |
| Lab vitals (mobile 390px, CPU 4x) | ✅ | LCP 188–292 ms · CLS 0 · TBT 54–147 ms · JS 214 kB |
| Scroll | ✅ | p95 16,7 ms desktop y mobile, 0 % jank |
| A11y e2e | ✅ 47/47 | |
| Funcional e2e | ✅ 51/51 | (pero ver V-B1: hay un bug que no cubre) |
| Sin JS | ✅ 8/8 | |
| Runtime (proxy, clipboard) | ✅ 7/7 contra `next start` | ❌ contra `next dev` (falso rojo, ver T3) |
| Idle | ❌ 4/5 | `idle/task` 367 ms / 10 s (budget 100), deuda conocida |
| Bugs reales encontrados | 3 | preview de trabajos muere tras filtrar (V-B1); easter egg no anda con teclado (V-B2); el hook de Bebop libera el `overflow` ajeno al desmontar (V-B3) |

**Veredicto:** la base técnica es de muy buen nivel (carga diferida de three, cleanup disciplinado,
a11y y no-JS cubiertos, vitals muy por debajo del budget). Lo que falta es **contenido y pulido
visual de las páginas secundarias**, más dos bugs de interacción que los tests no ven.

---

## 1. Método

- `node scripts/gate.mjs` — exit 0.
- `pnpm build` — exit 0.
- `measure-vitals`, `e2e-a11y`, `e2e-functional`, `e2e-nojs`, `e2e-runtime`, `measure-idle` (×3),
  `measure-scroll-perf` contra build de producción. GPU: AMD RX 570 vía ANGLE.
- Capturas Playwright desktop 1440×900 y mobile 390×844 de la home completa, hover de trabajos,
  `/work/OpenBalance` y 404.
- Auditoría estática de `src/` (componentes, hooks, API, i18n, CSS, assets).
- Reproducción en navegador del bug V-B1.
- Contraste WCAG calculado sobre los tokens de la paleta.

---

## 2. Bugs (prioridad alta)

### V-B1 · [Alta] El preview flotante de Work deja de funcionar después de usar un filtro — **reproducido**

- `src/components/WorkFilters.jsx:67-148`: el efecto registra `pointermove`/`pointerleave` sobre
  `listRef.current` con deps `[]`.
- `src/components/WorkFilters.jsx:177`: `<ul ref={listRef} key={filter}>` — `key` remonta el `<ul>`
  en cada cambio de filtro. Los listeners quedan en el nodo viejo, fuera del DOM.
- Reproducción (Chromium, 1440×900): hover sobre la fila 1 → `.work-preview.is-on = true`.
  Click en "React", click en "All", hover de nuevo → `is-on = false`. El spotlight `--rx/--ry`
  también muere.
- Fix: escuchar en el contenedor estable (`<div aria-live>` o la sección) con delegación
  (`closest("[data-work-row]")` ya está), o poner `filter` en las deps.
- Test: sumar a `e2e-functional` "hover → filtro → All → hover → preview visible".

### V-B2 · [Media] El easter egg de Bebop no se puede activar con teclado

- `src/components/Footer.jsx:265-270` llama `handleTriggerEnter` en cada `keydown` de Enter/Espacio.
- `src/hooks/useBebopAnimation.js:204-213` reinicia el timer de 1500 ms en cada llamada.
- El auto-repeat del SO dispara `keydown` cada ~30 ms después de ~500 ms → el timer nunca llega a 1,5 s.
  El copy dice "Mantené presionado 1,5 segundos". Playwright no simula auto-repeat, por eso pasa el e2e.
- Fix: `if (e.repeat) return;` en el `onKeyDown`.

### V-B3 · [Baja] `useBebopAnimation` libera el `overflow` del body al desmontar

- `src/hooks/useBebopAnimation.js:254-260` escribe `overflow = ""` sin guardar el valor previo; si el
  drawer móvil lo tenía bloqueado (`Navbar.jsx:280-282`) lo libera. Restaurar el valor anterior.

---

## 3. Visual y diseño

Capturas analizadas: home desktop (7 viewports), home mobile (8), hover de trabajos, página de proyecto, 404.

### Lo que funciona

- **Identidad clara y coherente.** Navy/cobalto + retícula coral + Space Grotesk + acento sky en una
  palabra por título. No parece plantilla. El sistema se respeta en cada sección.
- **Hero fuerte.** Título enorme, una palabra en sky, lead corto, dos CTAs claros, stackline mono.
  Jerarquía de libro.
- **Navbar pill.** Transparente en reposo, glass al scrollear, indicador deslizante, switcher de idioma
  integrado. Muy prolijo.
- **Marquee** con fila outline + fila sólida: buen ritmo entre el hero y el trabajo.
- **Footer** con el apellido en Fraunces italic gigante: el mejor momento tipográfico del sitio.
- **Mobile** mejor que desktop en Work: las filas muestran thumbnail y se leen como cards.

### Para pulir (ordenado por impacto)

| # | Sev. | Dónde | Problema | Propuesta |
|---|---|---|---|---|
| V1 | Alta | `/work/[slug]` | La página de proyecto **no tiene ninguna imagen** y el case study es una línea de Problema y una de Resultado. Es la página que un reclutador abre para ver profundidad, y es la más pobre del sitio. | Cover grande del proyecto, 2–3 capturas, sección "Qué hice / decisiones / stack" con 3–5 bullets, métricas si hay. |
| V2 | Alta | Work, desktop | El preview flotante **tapa el botón ↗** de la fila (preview x≈997–1316, botón x≈1305–1350 a 1440px). | Limitar `maxX` al borde izquierdo de la columna del botón, o mover el preview a la izquierda del cursor cuando se acerca al borde. |
| V3 | Media | Work, desktop | En reposo las filas son solo texto, con mucho aire vertical; el trabajo (lo más importante) se ve menos que en mobile. | Thumbnail chico fijo en la fila (como en mobile) o destacar los 2 primeros proyectos con cover visible. |
| V4 | Media | Header de Work | Un `eyebrow` arriba del título y un `lead` grande flotando a la derecha, alineado con nada (`WorkList.jsx:228-241`): los dos dicen lo mismo y el de la derecha queda huérfano. | Sacar el `eyebrow` y dejar una sola bajada. Si se quiere la columna derecha, alinearla a la baseline del título. |
| V5 | Media | 404 | Sin campo, sin nav, sin retícula: fondo plano. Parece otro sitio. | **No es un olvido.** `global-not-found.jsx:37-47` documenta que el 404 mínimo es deliberado: los dos root layouts (`(en)` y `(intl)/[lang]`) impiden un `not-found.jsx`, y la página se declara a propósito como la más chica del sitio. Si se quiere que se parezca más: retícula coral estática + logo, sin WebGL ni script. |
| V6 | Media | Contacto | El subrayado del mail está al 18 % en reposo (`globals.css:2350`) y crece en hover. En touch nunca crece: **parece roto**. | `@variant no-hover` → `scaleX(1)`, o dibujarlo completo al entrar en viewport. |
| V7 | Media | Thumbnails | Varias capturas son UIs claras/blancas (Turnos, AhorrAR) que chocan con el navy; AhorrAR se ve casi vacía. | Capturas en dark mode o un frame/tinte común; elegir la pantalla más rica de cada app. |
| V8 | Baja | About | El retrato es un avatar circular de 56px (`globals.css:2122-2124`; `<Image width={112}>` en `About.jsx:76-77`). Para una sección que dice "una persona, el ciclo completo", la persona casi no aparece. | Retrato más grande (160–240px) con el mismo tratamiento de halo. |
| V9 | Baja | Global | La retícula coral pasa por encima/entre texto mono chico (tags, metadatos) y suma ruido de lectura. | Máscara radial que atenúe la retícula detrás de bloques de texto, o bajar su opacidad en `.site-shell`. |
| V10 | Baja | Hero | Las esferas `.orn-*` a la derecha se leen como decoración genérica y la mitad derecha queda vacía. | O darles función (que reaccionen al pointer con más intención) o reemplazarlas por algo propio (p. ej. un fragmento de un proyecto). |
| V11 | Baja | Contacto | Gmail como CTA principal. | Dominio propio (`hola@ciucani.dev`) suma seniority. |
| V12 | Baja | Mono chico | Switcher en 10px (`LanguageSwitcher.jsx:21`), pill de repo 11px (`WorkList.jsx:134`), con tracking ancho. | Mínimo 11–12px. |

---

## 4. Rendimiento

### Medido

| Ruta | LCP | CLS | TBT | JS |
|---|---|---|---|---|
| `/` | 236 ms | 0.000 | 147 ms | 214 kB |
| `/es` | 188 ms | 0.000 | 109 ms | 214 kB |
| `/pt` | 292 ms | 0.000 | 54 ms | 214 kB |

Budget: LCP ≤ 2500 · CLS ≤ 0.1 · TBT ≤ 300 · JS ≤ 260 kB. Scroll p95 16,7 ms (max 33 ms en mobile 4x),
0 % de frames > 50 ms. Superficie de blur 0,02 Mpx (budget 2).

### Hallazgos

| # | Sev. | Evidencia | Problema | Fix |
|---|---|---|---|---|
| P1 | Media | `measure-idle`: TaskDuration 357/369/367 ms en 10 s, script 16 ms | En reposo el hilo principal trabaja ~3,7 % del tiempo; casi todo es estilo/composición de 22 animaciones CSS de flares sobre los 36 nodos fijos de `.bocanada-flares`. Ya anotado como deuda en `odd/tasks/flare-tempo.md:218`. | Pausar flares fuera del hero/viewport, o animarlas en un solo elemento (sprite/`background-position`) en lugar de 36 nodos. |
| P2 | Media | `AboutScroll.jsx:85-97` | Escribe `--tlp` y lee `getBoundingClientRect()` de cada ítem en el mismo `onUpdate`: reflow forzado por frame durante el scrub. | Cachear `top` en `onRefresh` y comparar contra `self.scroll()`. |
| P3 | Baja | `WorkFilters.jsx:102-111` | `getBoundingClientRect()` de fila y lista en cada `pointermove`, sin rAF. | Agrupar en rAF y cachear `listBounds`. |
| P4 | Baja | `public/favicon.svg` 40 KB | Es un PNG en base64 dentro de un SVG. | SVG vectorial real (< 2 KB). |
| P5 | Baja | `SiteLogo.jsx:22` | `priority` está deprecado en Next 16 (`preload`). | `preload`. |
| P6 | Baja | `LiquidEther.jsx:1595-1600` | `renderer.dispose()` sin `forceContextLoss()`; en StrictMode/remontajes los contextos viven hasta GC. | `forceContextLoss()` antes de `dispose()`. |

**Bien resuelto:** three/R3F/postprocessing detrás de `dynamic()`/`import()` y cargados en idle según
tier, conexión y reduced motion; 0 draw calls en reposo; rAF pausados fuera de pantalla y en
`visibilitychange`; Fraunces sin preload y cargada por IntersectionObserver; 6 declaraciones `will-change` en el CSS (7 propiedades, `globals.css:1047,1056,1783,1789,1857,2018`).

---

## 5. Accesibilidad

| # | Sev. | Evidencia | Problema | Fix |
|---|---|---|---|---|
| A1 | Media | `Navbar.jsx:164-171`, `HeroActions.jsx:21-24`, `utils/scroll-to-section.js:8-35` | Los links de ancla hacen `preventDefault` y scroll, pero no mueven el foco ni la URL: con teclado, el siguiente Tab sigue en la nav; no hay deep link ni "Atrás". | `focus({preventScroll:true})` en el heading (`tabindex=-1`) + `history.pushState`. |
| A2 | Media | `WorkFilters.jsx:175-188` | `aria-live` envuelve toda la lista: cada filtro hace leer todas las filas. | `role="status"` aparte con "N proyectos". |
| A3 | Baja | `es.js` `copied: "Copiado ✓"` | El ✓ entra en el nombre accesible. | `<span aria-hidden>✓</span>`. |
| A4 | Baja | ver V12 | Texto mono de 10–11px. | ≥ 11–12px. |

**Contraste (texto sólido, WCAG):**

| Texto | sobre ink | sobre deep | sobre mist |
|---|---|---|---|
| paper | 17.5 | 15.8 | 14.0 |
| mut | 12.3 | 11.0 | 9.8 |
| dim | 8.5 | 7.6 | 6.8 |
| sky | 11.4 | 10.2 | 9.1 |
| coral | 6.5 | 5.8 | 5.2 |

Todo AA, casi todo AAA. A verificar: picos de brillo del humo WebGL (mitigado por `text-shadow`).

**Bien resuelto:** skip link, `main tabIndex=-1`, focus trap con `inert` en drawer y diálogo Bebop
con devolución de foco, targets de 44px con `pointer-coarse`, jerarquía h1→h2→h3 correcta,
reduced motion y reduced transparency cubiertos, alt traducido.

---

## 6. Técnico: proxy, caché, SEO

| # | Sev. | Evidencia | Problema | Fix |
|---|---|---|---|---|
| T1 | Media | `LanguageSwitcher.jsx:29` | El switcher enlaza a `/?lang=xx`: desde `/work/<slug>` cambiar idioma te manda al home; los links internos no apuntan a la URL canónica. | Href a la misma página en el otro locale (`localeUrl`/`projectUrl` de `seo.js`). |
| T2 | Media | `src/proxy.js:130` vs respuesta real | El proxy hace `append("Vary","Accept-Language")`, pero la respuesta de `next start` termina con `Vary: rsc, next-router-state-tree, …, Accept-Encoding` — **sin `Accept-Language`**, y con `Cache-Control: s-maxage=21600` público. `/` además depende de la cookie `pf_locale` y manda `Set-Cookie`. En Vercel el proxy corre antes de la caché y no hay problema; detrás de cualquier otro CDN, `/` se cachearía en un solo idioma. | Documentar la dependencia de Vercel, o redirigir 307 de `/` a `/es`/`/pt` en vez de reescribir. Ajustar el test `proxy keeps caches honest` para que exija `Accept-Language` en `Vary` de `/`. |
| T3 | Baja | `e2e-runtime` | Si no hay server en :3000, el script levanta `next dev`, donde `Cache-Control: no-store` → rojo falso. | Levantar `next start` como el resto de las suites. |
| T4 | Baja | `scripts/*.mjs`, `src/data/*.js` | Warning `MODULE_TYPELESS_PACKAGE_JSON` al correr gates. | Renombrar a `.mjs` los módulos que importan los scripts, o `"type": "module"` (verificar que no rompa configs CJS como `next.config.js`). |

**SEO bien resuelto:** `metadataBase`, canonical, hreflang con `x-default`, OG/Twitter, OG estático por
idioma, sitemap con alternates y `lastmod`, robots con decisión explícita sobre crawlers de IA,
`llms.txt`, JSON-LD escapado, `<html lang>` por ruta prerenderizado.

---

## 7. Seguridad

| # | Sev. | Evidencia | Problema | Fix |
|---|---|---|---|---|
| S1 | Media | `next.config.js:59-98` | CSP en `Report-Only` sin `report-uri`/`report-to`: no tiene efecto fuera de la consola. `unsafe-eval` también en prod. Faltan `Permissions-Policy`, `Cross-Origin-Opener-Policy`; HSTS depende del hosting. | Endpoint de reporte o CSP enforced con nonce; `unsafe-eval` solo con `isDev` (verificar draco/WASM); sumar los headers. |
| S2 | Baja | `api/sync-projects/route.js:176-182` | GET con efecto (escritura + `revalidatePath`). Auth correcta (secreto en tiempo constante, falla cerrado), sin rate limit. | Solo POST si el cron lo permite. |

**Bien:** `perf-report` 404 en build, body ≤ 256 KB, JSON validado; todos los `target="_blank"` con
`rel="noopener noreferrer"`; `X-Frame-Options: DENY` + `frame-ancestors 'none'`; `poweredByHeader:false`;
`/test` solo existe en dev.

---

## 8. Mantenibilidad y assets

| # | Sev. | Evidencia | Fix |
|---|---|---|---|
| M1 | Media | `public/AppDespensa.webp` (sin uso) vs `public/appdespensa.webp` (en uso) | Borrar el de mayúsculas: colisiona al clonar en macOS/Windows. |
| M2 | Baja | `public/img1.webp`, `img2.webp`, `img3.webp`, `jazzySax.svg` sin referencias (~100 KB) | Borrar. |
| M3 | Baja | `LiquidEther.jsx` 1798 líneas, `Navbar.jsx` 575 | Partir LiquidEther en `fluid/{mouse,passes,sim,manager}.js`; sacar drawer y scroll-spy de Navbar a hooks. |
| M4 | Baja | `--color-amber-glow: #8fcbff` (`globals.css:69`) = sky, nombre engañoso | Renombrar o alias de sky. |
| M5 | Baja | `sync-projects/route.js:149` `for (const path of …)` tapa el import `path` (línea 42) | Renombrar variable. |
| M7 | Baja | `fonts.ready.then()` sin cancelar en `Footer.jsx:208`, `Navbar.jsx:256`, `WorkFilters.jsx:63` | Flag `alive` en el cleanup. |

_La fila M6 de la primera pasada queda descartada: el comentario de `HeroActions.jsx:13-16` no cita un
componente fantasma, es el *por qué* vigente de haber sacado `Magnetic`._

---

## 9. Textos — sobre todo en español

Fuentes: `src/i18n/messages/es.js` (UI), `src/data/projects.js` (bloques `i18n.es` de cada proyecto),
`src/lib/seo.js` (`PROJECT_PAGE_COPY` y `FAQ_COPY`, que alimentan la página de proyecto).

### 9.1 Diagnóstico: por qué suena antinatural

El español está **traducido del inglés, no escrito en español**. Se nota en cinco patrones repetidos:

1. **Calcos de estructura inglesa.** "Llevo X del brief al deploy" (*take X from brief to deploy*),
   "Trabajo seleccionado" (*Selected work*), "Fuera del horario" (*Off the clock*),
   "Conversor en el lugar" (*in-place converter*), "Auxiliar de limpieza" (*cleanup helper*).
2. **Estilo telegráfico.** El inglés tolera fragmentos ("Accessible, responsive, and predictable");
   en español suenan a lista de features: "Desde lo visual hasta el servidor.", "Accesible, adaptable
   y predecible donde predecible es lo correcto."
3. **Spanglish técnico donde no aporta.** "motion con springs", "atmósfera GSAP y Three, ajustado al
   scroll en mobile", "scroll editorial de una sola pasada". El término técnico va cuando es el nombre
   de la cosa (React, deploy, PWA); el resto se dice en castellano.
4. **Sustantivos donde el español usa verbos.** "Reserva de turnos multi-tenant con validación en
   vivo…" en lugar de "Permite sacar turnos…". Las frases se apilan sin sujeto ni verbo.
5. **Registro mezclado.** El hero y contacto tutean/vosean ("Contame"), la FAQ habla en tercera persona
   notarial ("¿Dónde está radicado Agustín Ciucani?").

Además hay **un error de sentido**: "Volver al trabajo" (`seo.js`, `PROJECT_PAGE_COPY.es.back`) se lee
como "volver a la oficina". Es "Volver a los proyectos".

### 9.2 El segundo problema: suena a texto de IA

Corregir los calcos no alcanza. Además el texto usa las muletillas típicas de la IA, y la primera
tanda de propuestas de este audit (ya descartada) cayó en las mismas. Si una frase tiene alguna de
estas marcas, se reescribe:

| Muletilla | Ejemplos en el sitio |
|---|---|
| **Antítesis "X, no Y"** | "Demos que funcionan, no maquetas" · "una versión de muestra que funciona, no el deploy de producción" · "trabajo real y no una plantilla" · "un estudio y no una plantilla" |
| **Dos frases espejo** | "Contame el problema. Te devuelvo el plan." |
| **Tríadas** | "front, API y el servidor" · "Accesible, adaptable y predecible" · "el objetivo, el stack y la fecha" · "ventas, caja y stock" · "Paneles, apps y herramientas" |
| **Dos puntos que revelan algo** | "Cómo trabajo: una persona, el ciclo completo" · "Fuera del horario: música, …" |
| **"De punta a punta" y variantes** | "de punta a punta" · "del brief al deploy" · "del panel al deploy" · "Desde lo visual hasta el servidor" |
| **Paradoja ingeniosa** | "predecible donde predecible es lo correcto" |
| **Promesa que cualquiera firmaría** | Todo el hero y el About: no hay un solo dato que sea solo tuyo. |

**La causa de fondo:** el texto intenta *sonar* a alguien con experiencia en lugar de *mostrarla*.
Una persona real habla de lo que hizo: para quién, qué pasó, cuánto, cuándo. Eso no se escribe con
mejores sinónimos, se escribe con datos.

### 9.3 Reglas

1. **Primero un dato, después la frase.** Si no hay dato, la frase va más corta, no más linda.
2. **Nada de "X, no Y"**, nada de tríadas y nada de dos puntos que revelan algo.
3. **Una idea por oración**, con sujeto y verbo. La segunda oración es opcional.
4. **Que suene a mail a un cliente, no a landing.** Si no lo escribirías en un mail, no va.
5. **Los títulos pueden ser simples.** "Proyectos" funciona como título. El diseño ya hace el trabajo
   de impacto (tamaño, acento en sky); el texto no tiene que competir con él.
6. **Términos técnicos** solo cuando son el nombre de la cosa (React, PWA, deploy, GitHub).

### 9.4 Datos que faltan (los tiene que completar Agustín)

Sin esto, cualquier reescritura va a seguir sonando genérica:

- **Turnos App:** ¿qué municipio?, ¿está en uso?, ¿cuántas áreas o turnos por mes?
- **App Despensa:** ¿es el almacén de alguien conocido?, ¿lo usan todos los días?, ¿desde cuándo?
- **AhorrAR:** ¿cuántos comercios compara?, ¿cuánta gente lo usa?
- **btrfs2ext4:** ¿lo usaste en tu máquina?, ¿qué tamaño de disco convertiste?
- **Clientes o trabajos pagos:** ¿hubo alguno? Aunque sea uno, vale más que cualquier frase del hero.
- **Algo tuyo de verdad**, para About. El Fiesta 95 y la guitarra van por buen camino: más de eso.

### 9.5 Versiones simples (sin inventar nada)

Corto, en voz de persona. Donde dice `[…]` va un dato de §9.4; si no hay dato, se borra esa parte.
⚠ = cambiar también el `accent`.

**Interfaz (`es.js`)**

| Clave | Actual | Simple |
|---|---|---|
| `hero.status` | Disponible para freelance y tiempo completo | Busco trabajo y proyectos freelance |
| `hero.title` ⚠ | Desarrollo tu software, de punta a punta | Hago aplicaciones web |
| `hero.lead` | Soy Agustín Ciucani, desarrollador full-stack… Desde lo visual hasta el servidor. | Soy Agustín, desarrollador full-stack en Buenos Aires. Uso sobre todo React y Next.js. [Último trabajo / cliente, en una línea.] |
| `work.eyebrow` | Trabajo seleccionado | (sacar; el título ya dice lo mismo) |
| `work.title` ⚠ | Demos que funcionan, no maquetas | Proyectos |
| `work.lead` | Paneles, apps y herramientas. Cada uno con su código fuente. | Todos tienen el código en GitHub y la mayoría tiene una demo para probar. |
| `work.demoNotice` | Cada link de "Ver demo" abre una demo: … | Las demos son copias de prueba: podés tocar todo sin miedo. |
| `about.title` ⚠ | Cómo trabajo: una persona, el ciclo completo | Sobre mí |
| `about.statement` | Llevo interfaces, paneles y PWAs del brief al deploy… | Programo desde [año]. Estudié en la UPSO y [qué hacés hoy / dónde trabajaste]. |
| `about.introStrong` + `introRest` | Trabajo en producción con React… Accesible, adaptable y predecible… | (borrar las dos: las herramientas ya están en los chips de abajo) |
| `about.offClock` | Fuera del horario: música, un Ford Fiesta 95 y la guitarra. | Cuando no programo, toco la guitarra o le meto mano a mi Fiesta del 95. |
| `contact.title` ⚠ | Contame el problema. Te devuelvo el plan. | Escribime |
| `contact.lead` | Freelance o tiempo completo. Con el objetivo, el stack y la fecha alcanza para arrancar. | Contame qué necesitás. Respondo en [24 h / el día]. |
| `meta.description` | …Llevo producto React y Next.js del panel al deploy… | Agustín Ciucani, desarrollador full-stack en Buenos Aires. Proyectos en React y Next.js con demo y código. |

**Página de proyecto y FAQ (`seo.js`)**

| Clave | Actual | Simple |
|---|---|---|
| `PROJECT_PAGE_COPY.es.back` | Volver al trabajo | **Volver a los proyectos** (error de sentido) |
| `PROJECT_PAGE_COPY.es.result` | Resultado | Qué hice |
| `FAQ_COPY.es.based` | ¿Dónde está radicado {name}? | ¿Dónde vive {name}? |
| `FAQ_COPY.es.basedIn` | {name} está radicado en {locality}, {country}. | {name} vive en {locality}, {country}. |
| `FAQ_COPY.es.skills` | ¿Con qué trabaja {name}? | ¿Qué tecnologías usa {name}? |

La FAQ sigue en tercera persona a propósito: la leen buscadores y motores de respuesta (§6).

**Proyectos (`projects.js`).** Mismo criterio: problema = lo que pasaba, dicho como lo contarías;
resultado = lo que hiciste y qué cambió.

| Proyecto | Campo | Simple |
|---|---|---|
| Turnos | problem | En [municipio], cada área daba turnos por su lado. |
| Turnos | outcome | Hice un sistema único para pedir turnos, con un panel para cada área. [N turnos / en uso desde …] |
| OpenBalance | problem | Quería ver mis gastos por mes, y las apps que probé los mostraban por semana. |
| OpenBalance | outcome | Hice una app que guarda todo en tu navegador. No hace falta crear cuenta. |
| Pelis en Casa | problem | Un trabajo de la facultad de 2022 que ya no funcionaba online. |
| Pelis en Casa | outcome | Lo rehice en React para poder mostrarlo. |
| Myrk Studio | description | Sitio para una serie de Minecraft. Una sola página larga con una portada en 3D. |
| btrfs2ext4 | problem | Quería pasar mi disco de Btrfs a Ext4 sin tener que copiar todo a otro disco. |
| btrfs2ext4 | outcome | Hice un conversor que trabaja sobre el mismo disco y puede volver atrás si se corta la luz. |
| Limpieza W11 | description | Un programa chico para borrar lo que dejan las actualizaciones de Windows 11. |
| AhorrAR | problem | Para comparar precios de supermercado había que abrir cinco pestañas. ([verificar el número]) |
| AhorrAR | outcome | Una página que junta los precios y te dice dónde está más barato. |
| App Despensa | problem | [Nombre / un almacén del barrio] no quería pagar un sistema por mes. |
| App Despensa | outcome | Le hice un sistema de ventas y stock que funciona aunque se caiga internet. |
| GRUB Bebop | problem | Quería que el menú de arranque combinara con mi pantalla de bloqueo de Cowboy Bebop. |
| Portfolio | problem | (borrar: "que no parezca una plantilla" no le importa a quien lo lee) |

**Prueba final:** leer la página entera en voz alta. Si alguna frase podría estar en el portfolio de
cualquier otro desarrollador, falta un dato.

### 9.6 Inglés y portugués

- `en` está mejor (es el idioma original), pero hay dos frases flojas:
  tiene las mismas muletillas de §9.2 ("Working demos, not mockups", "Send the problem. I send the plan.",
  "end to end"). Se reescribe con los mismos datos de §9.4.
- `pt` sale de la misma traducción y probablemente arrastra los mismos calcos. Conviene que lo lea
  alguien nativo antes de tocarlo.

### 9.7 Restricciones al aplicar

- `accent` de `hero`, `work`, `about` y `contact` tiene que ser una palabra (o el final) del `title`:
  `SplitHeading` la busca ahí para pintarla en sky.
- `i18n-parity.test.js` exige las mismas claves en los tres idiomas; cambiar textos no rompe nada, agregar
  o quitar claves sí.
- `e2e-runtime` y `e2e-a11y` comparan contra `hero.title`/`hero.lead` y textos de botones (p. ej.
  "Copiado ✓"): corren contra el diccionario, así que se actualizan solos, pero conviene correrlos.
- Hay que actualizar `PROJECT_PAGE_COPY`/`FAQ_COPY` en `seo.js`, no en `es.js`.

---

## 10. Orden de trabajo sugerido

1. **V-B1** preview tras filtro (+ e2e) y **V-B2** `e.repeat` — bugs, minutos cada uno.
2. **V2** preview que tapa el botón, **V6** subrayado en touch — pulido visible.
2b. **§9 textos en español**: primero el error de sentido ("Volver al trabajo"), después hero, contacto
    y about, y al final los proyectos. No hay que tocar código, pero es lo que más se nota al leer.
3. **V1** página de proyecto con imágenes y case study — el mayor salto de calidad percibida.
4. **A1/A2** foco y anuncios — a11y real, no cubierta por tests.
5. **T1** switcher a URL canónica, **T2** decisión sobre `Vary`/rewrite.
6. **M1/M2** limpieza de assets, **P4** favicon.
7. **P1** idle de flares, **P2** reflow de AboutScroll.
8. **S1** headers/CSP.
9. Resto (V3–V12, M3–M5 y M7, copy).

## Apéndice: comandos

```sh
node scripts/gate.mjs                 # 5/5
pnpm build
node scripts/measure-vitals.mjs       # pass
node scripts/e2e-a11y.mjs             # 47 OK
node scripts/e2e-functional.mjs       # 51 OK
node scripts/e2e-nojs.mjs             # 8 OK
node scripts/e2e-runtime.mjs          # 7 OK con next start en :3000; 6/7 si cae a next dev
node scripts/measure-idle.mjs         # idle/task FAIL ~367 ms
node scripts/measure-scroll-perf.mjs  # 7 OK
```
