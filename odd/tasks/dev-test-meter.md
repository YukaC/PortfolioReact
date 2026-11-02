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
| T1 | S1 | parent (commit de `audit.md`, archive de briefs, ramas) | pendiente |
| T2 | S2, S3, S9 | parent (rewrites dev-only + gate de contrato) | pendiente |
| T3 | S4, S5, S6, S7 | worker `meter-ui` (burbuja + panel plegable en `src/perf/meter.js`) | pendiente |
| T4 | S8, S9 | worker `meter-ui` (overlay de dev + `/api/perf-report`) | pendiente |
| T5 | S2, S4, S8 | parent (docs + verificación en navegador y build) | pendiente |

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
