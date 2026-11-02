# perf-stress-harness — un `.sh` que corre todos los tests de rendimiento y stress

Feature branch: `feat/audit-program`. Alcance: un punto de entrada único que
ejecuta **todo** lo que el repo ya mide, más las capas que el harness no veía
(raster del campo, costo por sección, entrada de cada bloque, stress y fuga), y
un modo de ablación que convierte "esto se siente lento" en un delta medido.
No cambia producto, estilos ni comportamiento del sitio.

Origen del pedido: ver `L1`.

## Specs

**S1 — Un solo punto de entrada `.sh`.** Existe `scripts/perf-suite.sh` y es lo
único que hay que correr para medir rendimiento y stress. Acepta `--help` con la
lista de etapas y flags, reusa el server si ya hay uno escuchando en `--url`, y si
no levanta `next start` propio en `--port` y lo baja al salir (un solo `trap`, sin
huérfanos). No pisa `.next` salvo con `--build`.

**S2 — "todos los tests posibles de rendimiento": cada capa medida.** La suite
cubre, como mínimo: presupuesto de CSS/motion (`check:css`, `check:motion`),
vitals de lab por ruta (`measure:vitals`), frame pacing de scroll en desktop y
mobile-4x (`measure:scroll`), **raster real con el mismo perfil mobile en
SwiftShader**, reposo (`measure:idle`), línea de tiempo del reveal, carga bajo red
emulada (sin latencia, `edge`, `lte`, `slow3g`), costo por sección y inventario de
capas del compositor.

**S3 — "todos los tests posibles de stress": los flujos que rompen.** La suite
ejerce y mide: scroll continuo hasta el fondo, fling (salto grande de una vez),
resize y rotación mobile↔desktop, cambio de preferencias **en vivo**
(`prefers-reduced-motion`, `prefers-reduced-transparency`), navegación SPA entre
rutas con atrás/adelante, cambio de filtro del `WorkList` (remonta filas y el
observer tiene que volver a verlas), apertura/cierre del drawer mobile, y un ciclo
repetido N veces para detectar fuga: nodos del DOM, capas del compositor y heap JS
antes/después.

**S4 — "para optimizar la web": ablación.** El modo `ablate` corre el mismo scroll
con el baseline y con una variable apagada por vez (`filter` del `.field-blob-layer`,
`mix-blend-mode`, `.field-blob` entero, `.marquee`), y reporta el delta de frame
pacing y de frames lentos contra el baseline. Una optimización se decide con ese
delta, no con una impresión.

**S5 — No inventa presupuestos.** Los umbrales siguen siendo los del repo
(`SCROLL_BUDGET_P95`, `SCROLL_BUDGET_JANK`, `SCROLL_BUDGET_BLUR`, `VITALS_BUDGET_*`)
y los aplican los scripts que ya los tienen. Lo nuevo se **reporta como medida**;
la suite solo falla por presupuesto ajeno cuando se pide `--strict`.

**S6 — Salida legible + artefacto.** Al final imprime una tabla por etapa con
estado, el número que importa y la duración; deja los JSON crudos en `--out`
(default `.perf/<timestamp>/`). Exit `0` si todas las etapas corrieron, `1` si una
etapa se rompió o un presupuesto falló bajo `--strict`, `2` uso inválido,
`3` no hay server ni build.

**S7 — Perfiles como dato único.** Dispositivo, red y renderer viven en un módulo
compartido (`scripts/perf/lib.mjs`); ningún modo redefine viewport, DPR, UA ni
flags de Chromium por su cuenta.

## Tasks

| ID | Specs | Ruta | Commit |
|---|---|---|---|
| T1 | S7, S2, S3 | inline | `feat(perf): measure the load path, the reveal and each section` |
| T2 | S4, S5 | inline | `feat(perf): ablate the expensive layer and stress the page` |
| T3 | S1, S6 | inline | `feat(perf): one command that runs every perf and stress gate` |
| T4 | S2, S3 | inline | verificación: `--quick`, `--stress`, `--ablate` sobre server real |
| T5 | S6, S7 | inline | `docs(perf): document the suite, its stages and its flags` |

## Log

**L1 — pedido original (verbatim).**

> armame un script que sea un .sh para hacer todos los tests posibles de rendimiento y stress para optimizar la web

**L5 — medir en el teléfono real (proxy inyector, T6).** `scripts/perf/remote-proxy.mjs`
+ `scripts/perf/meter.js`: un reverse proxy al build de producción que inyecta un
medidor y recibe el reporte por POST. Un Moto G82 5G (352×781 @DPR 3.08, 5 cores,
120 Hz de panel pero 60 Hz efectivos en la página) entregó dos pasadas:

| | sin scroll (31 s) | con scroll 0→3810 px (21 s) |
|---|---|---|
| frames | 905 | 393 |
| p50 | 16.7 ms | 16.7 ms |
| p95 | 116.8 ms | **233.9 ms** |
| p99 | 350.8 ms | 501.1 ms |
| peor frame | 518 ms | **952 ms** |
| fuera de presupuesto | 23.6 % | 26.7 % |
| long tasks | 2166 ms | 2551 ms |

Lectura: el teléfono no es lento de forma pareja (p50 en 60 fps) — se congela a
golpes, y scrollear duplica el p95. El fondo desliza medido: los tres blobs
derivan −224 / −411 / −524 px sobre 3810 px de recorrido (parallax de `--p`, es
diseño, no un `fixed` roto). El reporte trae `blurred: 11 superficies · 1.32 Mpx`;
a DPR 3.08 son ~12.5 Mpx de superficie con blur por frame con un radio efectivo de
~340 px físicos: la cuenta que explica los 952 ms en un Adreno 619.

Lección de instrumentación: el panel del fondo corría a 30 Hz sin medir su costo
(~136 ms/s con CPU 6×). Por eso el medidor ahora se cronometra (`meter.costMsPerSecond`),
tiene toggle `Panel fondo: ON/OFF`, muestrea a 20 Hz y difiere los sparklines al
estado `done`. Ningún número de teléfono se reporta sin descontar el instrumento.

**L6 — límites conocidos.** `/* eslint-env browser */` en `meter.js` pasa hoy pero
será error en ESLint v10 (reemplazar por `/* global */` o `languageOptions.globals`).
El proxy lee `meter.js` una vez al arrancar: editar el medidor exige reiniciarlo.
No se leyó el compositor del teléfono (requiere `adb`), así que las capas y el
overdraw siguen siendo una inferencia, no una medición.

**L2 — contexto medido que motiva L1.** El análisis previo (video + Playwright,
390×844 DPR2 CPU×4) dejó tres hechos que la suite tiene que poder reproducir sola:
el scroll es idéntico en dev y en prod; el costo dominante en mobile es
`filter: blur(110px)` + `mix-blend-mode: plus-lighter` en `.field-blob-layer`, que
`@variant wide` apaga en desktop (apagarlo baja los frames lentos de 45/228 a
12/250); y `pnpm measure:scroll --profile mobile-4x` pasa en verde porque corre en
la GPU del desktop, mientras el mismo perfil con `--swiftshader` falla
(p95 33.4 > 24).

**L3 — estrategia de entrega.** La branch ya acumula un diff grande contra
`origin/main` por el programa de auditoría, así que este feature no se entrega en
slices de ~400 líneas: se entrega por **unidad de review**, un archivo nuevo por
commit, y la PR se revisa por modo del probe. Límites registrados:

| Slice | Contenido | Líneas |
|---|---|---|
| 1 | `scripts/perf/lib.mjs` (perfiles compartidos) | 305 |
| 2 | `scripts/perf/probe.mjs` (5 modos; se revisa modo por modo) | 1082 |
| 3 | `scripts/perf-suite.sh` + `package.json` | 885 |
| 4 | `scripts/perf/README.md` + este doc + `.gitignore` | 130 |

**L4 — verificación (T4).** `--quick` con servidor propio en 4173: `budget ok`,
`vitals ok` (worst LCP 236 ms), `scroll ok` (desktop p95 16.7 / mobile-4x 16.8),
`raster FAIL` (swiftshader mobile-4x p95 33.4, presupuesto ≤ 24) — la etapa que
motiva L2 aparece en la tabla. `--only stress --iter 1`: 596 ms de long task en
toda la batería, `reveal nodes` varados **0**, leak de nodos −4, heap 0 kB,
capas +3 (delta tomado a distinta posición de scroll: medida, no veredicto).
`--only ablate` (prod + swiftshader): baseline p95 33.4 / 35 frames lentos →
`no-blobs` 16.8 / 5 (Δ −16.6 ms) y `no-blur` 14 frames lentos. `.perf/` queda
ignorado. Sin huérfanos en 4173 después de cada corrida. `npx eslint scripts/perf/`
sin hallazgos.
