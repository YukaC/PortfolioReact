# Feature: glass-motion-rebrand

Portar el estilo y el comportamiento de la referencia `portfolio-glass-motion.html`
al sitio real, conservando el fondo Bocanada (humo WebGL, lattice coral, flares).
El campo pasa a navy profundo; la tipografía suma acento serif itálico; el hero
deja de montar la card de perfil para que el texto tome el protagonismo.

## Specs

- **S1 (pedido)** — "tomá como referencia los estilos de esta web de ejemplo para
  aplicarlas a mi web. el estilo y comportamiento es lo que más me gusta, la idea
  es copiar el diseño manteniendo nuestro fondo interactivo de bocanada con el
  humo, los puntos con flares y eso. cualquier duda me consultas. recorda
  corroborar que los cambios que realices sean esteticos y consistentes mediante
  playwright y tu memoria." Referencia: `/home/yuka/Descargas/portfolio-glass-motion.html`.
- **S2 (pedido, decidido)** — el campo va a navy oscuro como la referencia; humo,
  puntos y flares se conservan ("Campo oscuro como el ref (recomendado)").
- **S3 (pedido, decidido)** — el hero no lleva card de perfil: "quiero algo
  distinto, tal vez una animacion o que el texto tomé más protagonismo ya que el
  card actaul siento que rompe la bienvenida".
- **S4 (sistema ref)** — tipografía: acento serif itálico (Fraunces) para el
  énfasis y el wordmark, Space Grotesk para titulares, Manrope para cuerpo,
  mono para eyebrow/etiquetas. Titular `clamp(44px,7.4vw,96px)`, `-0.035em`,
  `line-height 1.03`.
- **S5 (sistema ref)** — un solo motor de campo: progreso de scroll con inercia,
  hue de blobs ligado a `--p`, lattice enmascarado, glow de cursor, grain y barra
  de progreso de 2px.
- **S6 (sistema ref)** — nav: pill flotante, transparente en reposo, vidrio al
  scrollear, indicador deslizante bajo el link apuntado.
- **S7 (sistema ref)** — ritmo de sección: eyebrow mono + titular partido palabra
  por palabra + lead; marquee de dos filas ligado a la velocidad del scroll entre
  hero y work.
- **S8 (sistema ref)** — work: tabs de filtro con indicador deslizante + lista de
  filas (número, título, problema, tags, flecha) con dim de hermanos al hover y
  preview de vidrio que sigue al cursor; thumbnail inline en mobile.
- **S9 (sistema ref)** — about: statement iluminado palabra por palabra con el
  scroll, chips de skills, timeline dibujada con el scroll; el retrato entra acá.
- **S10 (sistema ref)** — contacto: mail gigante con subrayado degradé que escala
  al hover + botón de copiar con etiqueta que rueda.
- **S11 (sistema ref)** — footer: tres columnas + wordmark serif gigante con
  resortes por letra al puntero; el trigger del easter egg Bebop sobrevive como
  tagline.
- **S12 (invariante §V4)** — CTAs y tags conservan contraste WCAG AA sobre las
  superficies nuevas (medido, no estimado).
- **S13 (invariante)** — `prefers-reduced-motion: reduce` deja cada
  comportamiento nuevo en su estado estático; `browser-verify` pasa en los dos
  viewports.

## Tasks

| ID | Spec | Task | Route | Commit |
|----|------|------|-------|--------|
| T1 | S1,S5 | `browser-verify.json`: reglas nuevas en RED (filas de work, tabs, marquee, wordmark, titular) | inline | `8db7b0b` |
| T2 | S4,S5 | `_app.js` Fraunces italic + `globals.css` capa de tokens nueva (campo, tipo, primitivas, field layers) | inline | `8db7b0b` |
| T3 | S2,S5 | `AppBackground` retonado + `useFieldMotion` (loop único de inercia → CSS vars) + barra de progreso en `Layout` | inline | `8db7b0b` |
| T4 | S6 | `Navbar`: pill flotante, vidrio al scroll, indicador deslizante, drawer retonado | inline | `8369d5d` |
| T5 | S3,S4 | `HeroSection`: texto protagonista (status, titular partido, lead, dos CTAs, stackline) + ornamento de profundidad sin card | inline | `8369d5d` |
| T6 | S7 | `Marquee` de dos filas ligado a la velocidad del scroll; `ProfileCard` fuera | inline | `8369d5d` |
| T7 | S8 | `WorkList`: tabs con indicador, filas, dim de hermanos, preview al cursor, thumb mobile | inline | `159f5a4` |
| T8 | S9 | `Experience` → about de referencia: statement iluminado, chips, timeline dibujada, retrato | inline | `31a8137` |
| T9 | S10 | `Contact`: mail gigante + subrayado degradé + copiar dirección | inline | `31a8137` |
| T10 | S11 | `Footer`: tres columnas + wordmark serif con resortes por letra; easter egg como tagline | inline | `31a8137` |
| T11 | S1 | Limpieza: tokens/clases muertas del sistema de vidrio anterior, `ProfileCard`, `ProjectsGrid`, `Experience`, `useInView` | inline | `31a8137` |
| T12 | S12 | Contraste medido de CTAs, tags y texto secundario sobre las superficies nuevas; corregir lo que no llegue a AA | inline | `8db7b0b` |
| T13 | S13 | Verificar: RED→GREEN de las reglas nuevas, `pnpm lint`, `pnpm build`, screenshots desktop/mobile, reduced-motion | inline | — |
| T14 | S1 | Cierre: doc + mirror Engram + CHANGELOG + README + AGENTS.md | inline | `docs(odd)` |

## Log

- **L1** — pedido del user, verbatim en S1 (sesión 2026-10-22).
- **L2** — decisión de campo: navy oscuro como la referencia, conservando humo,
  puntos y flares (respuesta a la pregunta de producto).
- **L3** — decisión de hero: sin card de perfil; el usuario pidió "algo distinto,
  tal vez una animacion o que el texto tomé más protagonismo".
- **L4** — referencia leída completa (675 líneas, CSS inline + motor vanilla).
  Piezas a portar: tokens/typography, field engine (blobs+hue, dots mask, glow,
  grain, progress), glass único, `.btn` con luz de cursor, `.lb` label que rueda,
  `.ar` flecha que sale/entra, `[data-r]` reveal con blur, `.w` split por palabra,
  nav pill + `.ind`, marquee con skew por velocidad, work tabs+lista+preview,
  timeline, bigmail, footer mark por letra.
- **L5** — el lattice y los flares corales viven en el shader (`coverGrid`,
  cellSize 48) de `LiquidEther`; la CSS `.bocanada-sparks` es el stand-in de
  reduced-motion. Ninguna de las dos se toca (S2).
- **L6** — hallazgo de build: las pilas compuestas de fuentes (`--font-heading`,
  `--font-serif`) declaradas en `@theme` sobre `:root` quedan inválidas (el
  `var()` se sustituye en el elemento que declara la custom property, y ahí
  `--font-space-grotesk` todavía no existe) → todo titular caía al sans del
  navegador. Se declaran en `.root-layout`, el elemento que trae las variables de
  `next/font`. `@theme` pasa a `static` porque Tailwind v4 descarta las
  variables de tema no usadas por una utility.
- **L7** — overflow horizontal de 4468px: `.marquee` es hijo de un `main`
  flex con `items-center`, así que tomaba el ancho `max-content` de las pistas
  (7502px) y `overflow:hidden` no alcanza para no desbordar el documento. Se
  fija `width:100%`.
- **L8** — contraste medido con el humo agitado (fondo sin texto, percentiles de
  luminancia sobre el área real de cada bloque): status p50 6.36 / peor 6.18;
  titular p50 12.99 / peor 3.79 (necesita 3.0); lead p50 8.60 / peor 3.21;
  stackline p50 7.16 / peor 1.84. `--color-dim` subió de `#8493ab` a `#93a2ba`
  (p50 5.95 → 7.16) y el texto sobre el campo lleva halo oscuro. Residuo
  honesto: con un plume brillante arrastrado justo encima, una fracción chica de
  píxeles bajo cuerpo/meta baja de AA — es el precio del campo vivo, y los CTAs
  (relleno sólido) no se ven afectados.
- **L9** — el hero perdió la card: el ornamento de profundidad es
  `position:absolute` dentro de `.hero-foot`, así no estira la fila ni deja un
  hueco de 240px entre el lead y los CTAs.
- **L10** — verificación: `pnpm lint` ✓ · `pnpm build` ✓ (Next 16.3.6, 3 páginas
  generadas) · `pnpm e2e:a11y` 16 OK / 0 FALLA (las 6 reglas nuevas pasaron de RED
  a GREEN) · screenshots desktop 1440 y mobile 390 revisados sección por sección ·
  `prefers-reduced-motion` emulado: titular, lead, statement, timeline y wordmark
  en su estado final, lattice CSS en lugar del shader, ornamento y ping quietos.
- **L11** — límites de las work units (el branch ya traía 41 commits de trabajo
  previo, así que el conteo total del branch no mide este cambio): `8db7b0b`
  campo + sistema + canal de motion (T1-T3, T12), `8369d5d` hero + nav + marquee
  (T4-T6), `159f5a4` work (T7), `31a8137` about + contact + footer + limpieza
  (T8-T11). Cada uno deja el árbol compilando; el aspecto visual es transicional
  hasta el último, porque el sistema nuevo reemplaza al viejo en bloque.
- **L12** — el dev server del usuario quedó levantado de nuevo en :3000 después
  del build de producción (el build comparte `.next` con `next dev`).
- **L13** — revisión nativa (RDD on) sobre el candidato de rama
  `sha256:9e94dbae…` (base `ddbaa23` → HEAD, 29 archivos / 3231+1520 líneas):
  `inspect` ofreció `review.start`; la selección de lentes del agente fue
  rechazada dos veces con `lenses-invalid` (array y lista separada por comas,
  3 y 4 lentes) y el tercer intento —sin lentes, la ruta "neither" que el
  contrato permite— llegó al bloqueo real: `lens_context_budget_exceeded` en
  preflight. `mutation_outcome: not_started`, `lineage_created: false`, sin
  autoridad creada: nada que abandonar, reparar o reintentar. Continuación
  nativa: partir el cambio en una secuencia encadenada de candidatos más chicos
  (cada work unit por separado) y volver a pedir la transición para el alcance
  reducido, o `D`. Decisión pendiente del usuario.
