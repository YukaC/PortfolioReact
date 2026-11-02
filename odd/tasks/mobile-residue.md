# mobile-residue — los dos defectos visuales que quedaban en mobile

Feature branch: `feat/audit-program`. Alcance: los dos únicos defectos que
sobrevivieron al análisis de rendimiento. No toca el fondo (ya arreglado en
`perf-stress-harness`) ni About (arreglado en `about-perf`).

## Specs

**S1 — Los filtros de proyectos entran en la pantalla.** Hoy `.work-tabs` mide
346 px con `scrollWidth` 370: la última tab queda cortada sin scroll ni señal. En
un viewport de 390 px las cinco tabs tienen que leerse completas, sin scroll
horizontal.

**S2 — El marquee se lee en mobile.** Hoy `.mq span` usa `--text-marquee`, cuyo
mínimo es `3.375rem` (54 px): en 390 px se ven 1,2 palabras cortadas. Tiene que
entrar al menos una palabra entera más su separador, sin tocar el tamaño en
desktop.

**S3 — Desktop no cambia.** Los dos arreglos viven bajo una condición de ancho
estrecho. Los valores de desktop y la composición de la sección quedan iguales.

**S4 — Verificable por número.** `probe sections --device phone-3x --dpr 3 --gl sw`
no empeora su p95, y las dos comprobaciones de DOM dan: `.work-tabs`
`scrollWidth <= clientWidth` y `.mq span` con un `font-size` que deja ver una
palabra completa.

## Tasks

| ID | Specs | Ruta | Commit |
|---|---|---|---|
| T1 | S1, S2, S3 | writer | `fix(mobile): let the filter row fit and the marquee be read` |
| T2 | S4 | inline | verificación de DOM + `sections` + `check:css` |

## Log

**L1 — pedido del dueño (verbatim).**

> implementw todo, el smoke en mobile no va a estar presente. los nodos ausentes chequealo, pero igual lo controlamos en el segundo test que vamos a correr al final

**L2 — de los seis pendientes, cuatro no eran defectos.** Del reporte del teléfono:
`vanished` eran 3 `span.field-blob-layer` con opacidad final 0 (el cross-fade del
blob, y esos nodos ya no existen en mobile tras `perf(field)`); `jitter` eran los
blobs moviéndose por la inercia de Lenis y por el propio parallax; `classThrash`
eran 8-9 cambios de clase en 31 s en el header (el `is-scrolled` y el
`is-nav-active` haciendo su trabajo, no un loop; el umbral del detector sube a 20
para que deje de reportarlo); `deadTap` dio 0 en la última pasada. El smoke en
mobile ya no existe por el tier de calidad: `resources 43 · 165 KB · 45 KB JS ·
canvas 0`, sin descarga de `three`.
