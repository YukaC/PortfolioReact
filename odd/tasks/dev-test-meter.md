# dev-test-meter — el medidor en `/test`, solo en dev, en una burbuja

Feature branch: `feat/audit-program`. Alcance: limpiar el árbol y los documentos
que ya cumplieron, mover la medición de rendimiento y comportamiento a un `/test`
privado del dev server, y rehacer su panel para que sea una burbuja flotante con
un panel plegable en vez de una barra que ocupa el ancho de la pantalla.

Hoy el medidor vive en `src/perf/meter.js` y solamente lo inyecta
`scripts/perf/remote-proxy.mjs` en un proxy aparte (puerto 4300) para medir un
teléfono real. Su panel es `.p { left:10px; right:10px; bottom:10px }` más una
lista de capas con `max-height:34vh`: en un teléfono se come el tercio inferior.

## Specs

**S1 — Limpieza de docs y archivos ya usados.** El pedido, verbatim: "de paso
hace limpieza de docs y/o archivos viejos o que ya hayamos utilizado" y "limpia
si hay worktrees sucios o diffs viejas. cambiamos el lugar del repo. mirate los
logs". Quedan commiteados los diffs que son trabajo terminado, archivados los
briefs ODD cerrados, borrado el handoff viejo y borradas las ramas ya mergeadas.

**S2 — `/test` existe solo en el dev server.** El pedido, verbatim: "deja en un
slash privado solo accesible desde el dev server, la funcion de medicion de
rendimiento y comportamiento de la web. que sea accesible con un /test." y
"Quiero que el apartado de test solo sea accesible mediante el dev server en
producción nunca puede estar disponible." En `next dev`, `GET /test` responde
200 con el sitio. En un build de producción, `GET /test` responde el 404 del
sitio (`global-not-found`), nunca el medidor.

**S3 — La familia de rutas medidas.** `/test` sirve `/`; `/test/es` sirve `/es`;
`/test/pt` sirve `/pt`; `/test/work/<slug>` sirve `/work/<slug>`. Las rutas
reales no cambian en ningún entorno.

**S4 — Una burbuja, no una barra.** El pedido, verbatim: "trata que el panel de
test no ocupe la pantalla como ocurre actualmente. tal vez un menu plegable o
algo y que quede accesible mediante una burbuja flotante o algo así." El
medidor aparece como una burbuja fija de 52 px en la esquina inferior derecha; el
panel se abre desde la burbuja y mide como máximo 344 px de ancho y
`min(68vh, 560px)` de alto, con scroll interno. La burbuja sola no tapa el
contenido: su huella es un círculo de 52 px.

**S5 — El panel es plegable por secciones.** Ventana (frames, p95, long tasks),
Fondo (capas y sparklines) y Anomalías son tres secciones que se pliegan con su
encabezado; el estado de cada una sobrevive al cambio de estado del medidor. Un
botón cierra el panel y deja la burbuja.

**S6 — La medición no cambia.** Mismas métricas, mismas claves del reporte y
mismo veredicto que hoy: frames/p95/overBudget, long tasks, LCP/CLS, la
anomalía scan y el bloque `meter` con el costo propio del medidor. El medidor no
mide menos ni reporta distinto por tener otra interfaz.

**S7 — El teléfono sigue funcionando.** `remote-proxy.mjs` sigue sirviendo
`/__perf/meter.js` desde `src/perf/meter.js` y el reporte sigue llegando al
proxy por `POST /__perf/report`. La misma burbuja se ve en el teléfono.

**S8 — En dev el reporte llega a algún lado.** Cuando el medidor corre dentro del
dev server no hay proxy que reciba el POST: `POST /api/perf-report` imprime el
resumen en la terminal de `next dev` y deja el JSON en `.perf/browser/`
(gitignoreado). En producción esa ruta responde 404.

**S9 — Nada del medidor en las rutas normales de producción.** Sin `/test` no se
monta el overlay ni se descarga `meter.js`: el componente que lo monta no
renderiza nada fuera de dev y su import del medidor es dinámico.

## Tasks

| ID | Specs | Ruta | Commit |
|---|---|---|---|
| T1 | S1 | parent (commit de `audit.md`, archive de briefs, ramas) | `cec43b9`, `0a815b9` |
| T2 | S2, S3, S9 | parent (rewrites dev-only + gate de contrato) | `f3e9869` |
| T3 | S4, S5, S6, S7 | parent `meter-ui` (burbuja + panel plegable en `src/perf/meter.js`) | `abd788d` |
| T4 | S8, S9 | worker `meter-ui` (overlay de dev + `/api/perf-report`) | `fb1e6d1` |
| T5 | S2, S4, S8 | parent (docs + verificación en navegador, build y producción) | `fb1e6d1` |

**Corte de slice (para el revisor):** `cec43b9..fb1e6d1`, cinco commits. El rename
`scripts/perf/meter.js` → `src/perf/meter.js` viaja en `abd788d` porque es el que
habilita el import dinámico del overlay: sin eso no hay ruta que medir. Los dos
archivos nuevos de `fb1e6d1` (overlay + endpoint) son la mitad que `abd788d` no
puede tener sola. Ninguno de los cinco toca `globals.css`, el diseño del sitio ni
las rutas públicas.

## Log

**L1 — pedido original, verbatim.** "de paso hace limpieza de docs y/o archivos
viejos o que ya hayamos utilizado. deja en un slash privado solo accesible desde
el dev server, la funcion de medicion de rendimiento y comportamiento de la web.
que sea accesible con un /test. y trata que el panel de test no ocupe la pantalla
como ocurre actualmente. tal vez un menu plegable o algo y que quede accesible
mediante una burbuja flotante o algo así."

**L2 — segundo pedido, verbatim.** "limpia si hay worktrees sucios o diffs viejas.
cambiamos el lugar del repo. mirate los logs"

**L3 — estado encontrado (2 nov).** Worktree único y limpio de worktrees
registrados; `main` (`00cee8b`), `feat/prod-polish` (`cfc094e`) y
`nvme/feat-agency-rebrand` (`136a3de`) no tienen commits que no estén ya en
`HEAD` (`git rev-list --left-right --count HEAD...<rama>` da `N 0`). Sucio:
`audit.md` (+1392/−47), el rename `scripts/perf/meter.js` → `src/perf/meter.js`
con el path nuevo en `remote-proxy.mjs`, y `.pi-glla/` sin ignorear. El
directorio `src/app/test/` existía vacío. El repo vive en
`/home/yuka/Proyectos/PortfolioReact` y la ruta HDD es un symlink (commit
`37acf1d`), así que no hay rutas viejas que reparar: el único resto es
`/home/yuka/ssd-cache/...` en el brief `scroll-perf-pass.md`, que se archiva.

**L4 — decisiones del dueño (2 nov).** `audit.md` se commitea como
`docs(audit)`. La limpieza es completa: ramas mergeadas + `handoff.md` + briefs
cerrados a `odd/tasks/archive/` (que ya está gitignoreado).

**L5 — decisión de diseño de `/test` (parent, 2 nov).** El medidor mide la página
viva, así que `/test` no puede ser una página propia vacía. Se resuelve con
rewrites que sólo existen en dev: `/test` → `/`, `/test/:path*` → `/:path*`. El
overlay se monta desde las dos raíces cuando la ruta es `/test` — y a partir de
ahí sigue al lector durante la sesión de dev (sessionStorage), con un botón para
cerrarlo. Sin `/test` visitado no aparece en ninguna parte.

**L6 — T1 cerrado.** `cec43b9` commitea la consolidación de `audit.md` (+1392/−47).
`0a815b9` archiva los 15 briefs cerrados a `odd/tasks/archive/` (52 briefs ahí, el
directorio ya estaba gitignoreado), reescribe las 9 citas que apuntaban a las rutas
viejas (`README`, `CHANGELOG`, dos `source` de `scripts/css-budget.json`, dos
comentarios de código), borra `handoff.md` (nunca trackeado: estaba en
`.git/info/exclude`) y suma `.pi-glla/` al `.gitignore`. Ramas `feat/prod-polish`
(`cfc094e`) y `nvme/feat-agency-rebrand` (`136a3de`) borradas con `-d`: las dos
estaban 100% contenidas en `HEAD`. Worktree único, sin stashes.

**L7 — T2 cerrado.** `f3e9869`. `next.config.js` gana `rewrites()` que devuelve `[]`
fuera de `NODE_ENV=development`. `src/lib/test-route-contract.test.js` escribió
primero (RED: `rewrites` no existía), 4/4 en verde después.

**L8 — T3 cerrado.** `abd788d`. El bloque badge se reescribió entero: burbuja de
52 px, panel de `min(344px, 100vw - 32px)` × `min(68vh, 560px)` con scroll propio y
tres `<details>` (Fondo / Ventana / Anomalías). Medido en el navegador, 390×844:
panel abierto ≈ 380 px de alto (45 % de la pantalla) contra el 100 % de ancho × 34vh
que ocupaba la barra anterior; las 8 capas del fondo pintan su sparkline
(`window.__perfMeterField()` → 8/8 `drawn`), el veredicto entra completo en la fila
(`pinned ✓ · Δview 0.0px`) y la burbuja cerrada es un círculo de 52 px. La medición
no cambió: el reporte sigue con las mismas claves (`frames`, `longtasks`, `vitals`,
`anomalies`, `meter`, `field`, `window.panelOn`).

**L9 — incidente y gate que faltaba.** Al ajustar la grilla de las filas escribí un
comentario con backticks **dentro** del template literal del `<style>`: `next dev`
quedó en `Expected ';', '}' or <eof>` y el overlay parecía muerto
(`window.__perfMeterStart` no existía). Ningún gate lo veía: el archivo llega al
navegador sin compilar. `src/lib/perf-meter-contract.test.js` lo pina ahora con
`vm.Script` (parse sin ejecutar, 4/4), más las dos propiedades que sostienen S7/S8:
el proxy sirve este mismo archivo y el medidor lee su endpoint de
`window.__perfReportEndpoint`.

**L10 — T4/T5 cerrados.** `fb1e6d1`. Overlay `PerfTestMeter` (dinámico, dev-only,
sesión recordada en `sessionStorage`), `/api/perf-report` (404 en producción para
todos los métodos, 405 fuera de `POST`, 400 en body >256 KB o JSON inválido,
artefacto en `.perf/browser/`), mounts en las dos raíces. Verificación observada:
`pnpm test:all` exit 0 (lint + `node --test src/lib` + `check:css` + `check:motion` +
`validate:bebop`); `pnpm build` exit 0 con `/` `○`, `/es` `●`, `/pt` `●` y **cero**
menciones de `/test` en la tabla de rutas; `next start` en 3211 → `GET /test` 404,
`GET /test/es` 404, `POST /api/perf-report` 404, `GET /` 200; en `next dev` (3000,
server del dueño, que tomó el `next.config` nuevo) `/test` 200 con el sitio real, el
reporte llegó a la terminal (`[perf] /test … frames 9 · p95 …`, `anomalies 14`) y a
`.perf/browser/2026-11-02T11-51-21.826Z.json`, y una pestaña nueva en `/` no carga
el medidor (`__perfMeterStart` ausente).

**L11 — el medidor en un teléfono real (2 nov, tarde).** Dos pasadas del dueño con
Brave/Android (5 núcleos, 352×781 @DPR 3.075) sobre el proxy: p50 16,8 y 25 ms, p95
**100,5 y 175,4 ms**, 24,2 % y 16,3 % de frames sobre presupuesto, long tasks 11/746 ms
y 20/2090 ms (máx 362 ms). La mediana está bien y la cola está rota: es jank por long
tasks. El escaneo de anomalías marcó `flicker` en `span.field-blob-layer` —que es el
cross-fade intencional `opacity: calc(1 - var(--p))` / `var(--p)`— y `jitter` en
`a.focus-ring`, que es el `translateY` del reveal: dos falsos positivos del detector,
pendientes de afinar.

**L12 — dos defectos del instrumento, encontrados por esos números.** `54b8fff`: el
medidor se cobraba 63,2 y 116,7 ms/s (6,3 % y 11,7 % de la ventana, pases de hasta
41 ms); en puntero grueso pasó a 1 pase de campo cada 12 frames, sampler de 250 ms y
watchlist de 160 nodos (19,1 → 4,7 pases/s, 31 → 9,6 ms/s en la misma máquina).
`f6808b0`: el proxy pedía `accept-encoding: identity` a **todas** las requests — la
página pesaba 861 KB por el proxy contra 293 KB directo y el documento 153 KB contra
25 KB. Ahora los assets conservan su compresión, el documento inyectado sale
comprimido (15.730 B) y el medidor también (66.314 → 17.663 B).

**L13 — review nativa del slice `a2cba70..f6808b0` (lineage
`review-0d09bbd55e2d4ec6`).** Tres CRITICAL del refuter, los tres causados por
`f6808b0`: HTML comprimido entrando a la rama de inyección sin decodificar (por
`fetch()`, iframes o clientes sin señales de documento) y `br;q=0` leído como
aceptación. Corregidos en `330d2fe` (57 líneas de diff, presupuesto 73): el body se
decodifica según el `content-encoding` real antes de inyectar, `acceptedEncoding()`
parsea q-values, y un body que no decodifica se reenvía intacto. **Estado de la
review: sin cerrar.** El provider pide validación dirigida y emite un binding que el
facade rechaza dos veces como `collectBinding is missing or stale for current STATUS`
(target `ddac8e48` del slot contra snapshot `456f0bb` del candidato). No hay verdicto
del validador, así que no hay cierre; el dueño decidió dejarlo así y seguir. Para
retomar: `gentle-ai review status --lineage=review-0d09bbd55e2d4ec6`.
