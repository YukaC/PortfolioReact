# mobile-motion-perf — los bugs visuales que el medidor no ve

Feature branch: `feat/audit-program`. Alcance: los defectos que el dueño reporta a
ojo desde Brave/Android — reveal de texto, objetos que aparecen y desaparecen,
"animaciones de colores" y la caída de Hz — más lo que la evidencia muestre de fondo.
Nace de tres reportes del teléfono y de una grabación de pantalla de 63 s.

## Specs

**S1 — El navbar no cambia de color al scrollear.** El pedido, verbatim: "siento
muchos bugs de reveal de texto y anims son objetos al aparecer y desapareser junto
con la caida de hz de la web". Medido con cuatro recortes del pill a distintas
alturas de scroll, el mismo pill se veía azul oscuro (scrollY 940), azul claro
(1100), azul oscuro (1300) y casi blanco (1500): el `backdrop-filter` del glass
amplificaba la captura clara del proyecto que pasaba por detrás. Tiene que verse el
mismo material en todas las alturas, sin flash.

**S2 — Nada de glass sobre contenido arbitrario.** Corolario de S1 y de la regla de
superficies del repo: el glass queda para el preview y su tag; el pill scrolleado es
ink **sólido** con hairline y el drawer es ink casi opaco con su propio
`backdrop-filter: blur(--blur-panel)`, que funciona porque no flota sobre una captura
clara que se mueve. Ningún velo translúcido sobre contenido claro en movimiento.

**S3 — La caída de Hz tiene causa medida, no opinada.** `raster`/`ablate` del arnés
apagan una capa por vez y reportan el delta contra la línea base. El arreglo se elige
por el delta más grande, no por sospecha.

**S4 — Lo que aparece y desaparece no puede ser un objeto con vida propia.** Todo
elemento que se desvanece tiene que hacerlo por una transición de una sola propiedad y
con un estado final estable (`opacity: 1`), o no desvanecerse. Un elemento que
"parpadea" en el teléfono es un detector de regresión, no un efecto.

**S5 — Verificación en el teléfono del dueño.** Los números de partida sobre Brave
son p95 **100,5 ms**, **44,8 %** de frames sobre presupuesto, long tasks 31 · 2644 ms
(máx 240 ms), p50 25 ms. La verificación es una pasada nueva con el mismo URL, no un
número de escritorio.

**S6 — No se rompe nada de lo que ya está medido.** `pnpm test:all` en verde,
`check:css` sin drift, y `/`, `/es`, `/pt` siguen prerenderizados.

**S7 — Durante un fling el contenido visible no puede estar en el entrance, y un solo
gesto no puede hacer retroceder el scroll.** Dos defectos reales medidos y arreglados
(L17): los bloques que el lector ya tiene en pantalla se revelan al instante mientras la
capa viaja rápido (clase `fling` en `<html>`), y ningún resize de solo alto —la barra de
URL— refresca los triggers del scroll. La estética no cambia.

## Tasks

| ID | Specs | Ruta | Commit |
|---|---|---|---|
| T1 | S1, S2 | parent (pill a ink sólido + token `--ink-surface`) | `5832b4e` |
| T2 | S3 | parent (`perf-suite --only ablate,scroll,reveal`) | medido |
| T3 | S3, S4 | parent (filas de WorkList promovidas sólo con puntero fino + contador de superficies honesto) | `5b5e035` |
| T4 | S5, S6 | parent (pasada en el teléfono) | L16 (test:all 144 ✔, check:css OK, / · /es · /pt prerenderizados en el build del arreglo) |
| T5 | S3 | worker (A/B pareado intercalado flares on/off en una sesión + dumpsys gfxinfo + atribución de long tasks + screenrecord antes) | L13 (medido, sin commit) |
| T5 | S3 | worker (A/B pareado intercalado flares on/off en una sesión + dumpsys gfxinfo + atribución de long tasks + screenrecord antes) | en curso |
| T6 | S3, S4 | worker (arreglo elegido por el delta medido de T5; par antes/después en el mismo teléfono) | `289f028` |

## Log

**L1 — pedido, verbatim.** "siento muchos bugs de reveal de texto y anims son objetos
al aparecer y desapareser junto con la caida de hz de la web. utiliza rea si hace falta
para que puedas compŕender que pasa de fondo con la web. por que tenemos estos bugs
hace rato sin resolver en mi movil"

**L2 — evidencia del video (63 s, 864×1920, 3053 frames).** Extraídos **todos** los
frames a `.perf/video/all/` (gitignoreado). Perfil de cambio frame a frame
(`tblend=difference` + `signalstats`): mediana YAVG 0,16, p95 17,65, máx 69,63, y 459
picos locales. Los tres más fuertes: t=28,98, t=32,32 y t=37,04. El burst 37,00→37,12
muestra el defecto real: el pill del navbar saltando de azul oscuro a azul saturado a
blanco lavado en 60 ms. Capturas: `.perf/video/native37.png`, `pills.png` (antes),
`pills-solid.png` (después).

**L3 — descartado con medición, no con opinión.** (a) Apilado: correcto — a `y=40`
gana `.nav-pill` dentro del `header` fijo `z-50`, a `y=12` gana el contenido porque el
pill flota con margen (diseño). (b) `.work-preview` del WorkList: `display: none` a
351 px por `max-wide:hidden`; el "panel blanco gigante" del video era el propio pill
lavado por el blur. (c) El "texto fantasma" de t=32,3 es el marquee pasando por detrás
del pill translúcido.

**L4 — arreglo de T1 (dos iteraciones medidas).** Ink al 93 %: el texto de atrás se
leía. Al 97 % (mismo valor que el drawer, token `--ink-surface`): todavía se leía. Ink
sólido (`var(--color-ink)`): parejo en las cuatro capturas y sin sangrado. El pill
conserva hairline, sombra y geometría; pierde blur, saturación y el color prestado.

**L5 — contexto de los números del teléfono.** Tercer reporte (16:27) contra el
proxy ya arreglado: FCP **1672 → 652 ms** y el medidor **116,7 → 37,1 ms/s**
(3,71 %); el p95 sigue en 100,5 ms, con 44,8 % sobre presupuesto y long tasks de
hasta 240 ms. O sea: los dos defectos del instrumento (L12 del brief del medidor)
quedaron cerrados y el problema que queda es del sitio.

**L6 — ablación y reveal medidos (2 nov).** `scroll`: desktop p95 16,8 ms OK; **mobile-4x
p95 33,4 ms contra presupuesto 24 → FAIL**, con jank 0,51 %. `ablate`: los deltas caen
sobre valores cuantizados a un frame (33,4 / 50 / 66,7 / 83,4 ms sobre ~170 frames), así
que `flat-field`, `blobs-one` y `no-marquee` dan todos −16,6 ms y `no-blobs` da −0,1:
el ranking es ruido, no hay una capa dominante. `reveal`: entrar → opaco promedio
**521,2 ms**, `is-in` a 41–73 ms de entrar, **0 nodos trabados**; la máquina del reveal
está sana y los 450 ms son el diseño.

**L7 — el inventario de capas estaba inflado por el propio medidor.** En 351 px las
capas promovidas realmente renderizadas son **3**: `.marquee-inner` (351×94) y sus dos
filas (2161×47 y 1860×47). Las otras 10 pistas pertenecen a `display: none` —los blobs,
que bajo `wide` colapsan en un `radial-gradient` sobre el wrapper, y el preview del
WorkList—: `getComputedStyle` responde para nodos no renderizados, así que el
`willChange: 19` de los reportes del teléfono estaba inflado. `5b5e035` hace que el
contador saltee `display: none` y cajas vacías. Además las 5 filas de WorkList ya no
promueven capas en un teléfono (`@variant pointer-fine`): de 8 capas renderizadas a 3.

**L8 — lo que queda.** Sin una capa dominante, el jank del teléfono viene de long tasks
(31 · 2644 ms, máx 240 ms) y esas son de JS. El marquee ya pausa fuera de pantalla
(`MarqueeMotion.jsx:82`), así que el próximo instrumento que falta es **atribución de
long tasks** en el medidor (`entry.attribution`: script/container), que diría qué
bloquea el hilo en vez de sólo cuánto.

**L9 — el medidor nombra al culpable y mide todas las capas de una pasada
(`9458fca`).** Los long tasks llevan ahora `entry.attribution` agregada por dueño
(`longtasks.owners`, ordenada por tiempo) y el resto sin atribuir queda como fila
propia. El panel gana **Fases**: una ventana igual por capa (todas, marquee, fondo,
destellos, reveal, filtros), la capa se apaga y se restaura sola, y al final postea un
único artefacto con las seis filas. Los estilos de ablación los inyecta el medidor, nunca
el CSS de producción; `window.__perfAblate(name)` y `window.__perfPhases()` quedan para
automatización. Verificado por el proxy: seis fases con sus frames, long tasks y costo, y
un bloqueo sintético de 140 ms atribuido como `window (unnamed) [window]`.

**L10 — review del instrumento: un CRITICAL real, corregido (`29cd9b3`).** El refuter
encontró que `S.phases` no se reseteaba con la ventana: después de una corrida por fases,
cualquier medición normal volvía a incrustar filas viejas, así que un artefacto de una
sola ventana presentaba datos tomados bajo otras ablaciones como propios. Plan de
corrección aceptado (21 líneas, presupuesto 143) y aplicado: el arreglo mueve las filas a
una lista local de la corrida y elimina el campo del estado compartido, así que ninguna
ventana puede heredarlas.

**L12 — el teléfono entra por adb y se delega la medición pareada (8 nov).** `ZY22FMNLPX` (moto g82 5G) autorizado tras aceptar RSA; `reverse tcp:4300` y `forward tcp:9222 localabstract:chrome_devtools_remote` OK; Brave/Chrome 156 con la pestaña `http://localhost:4300/es` abierta y medidor inyectado. El bloqueo previo era el cartel RSA, no el cable ni el socket. T5 se delega a un worker con `pnpm build` (200 en :4173) y el proxy (:4300) levantados.

**L13 — T5 medido en el teléfono (pareado).** Seis pares intercalados (11 s por pierna, misma sesión y el mismo guión de scroll, `ab.mjs 5`) en la `moto g82 5G`: apagar `.bocanada-flares` gana **todos** los pares p95; mediana de piernas **92,1 → 66,6 ms**, long tasks por pierna **3-10 → 0**. La traza de CDP atribuye el costo a `RasterTask` / `GpuRasterBuffer::Playback` de **87-88 ms** en un hilo raster; el perfil de CPU navega al 66 % idle — no hay JS caliente. La hipótesis 2 (long tasks de script) queda muerta: es pintado. Trampa hallada: la pestaña se recarga sola cada 20-50 s de gesture scroll sostenido, así que toda ventana chequea `performance.timeOrigin`; los `overBudget` del medidor derivan de un presupuesto que derivó entre piernas (25-37,5 ms), comparadores confiables: p95 y over50.

**L14 — T6: el culpable era el grain, no los flares (14 candidatos, pareados).** Sobre el blanco vivo por CDP (sin rebuild), el runner igual a T5 midió: promoción (`will-change`, `translateZ(0)`), densidad (6 → 4/3), pico 0,3, campana sin `scale`, capa estática + una respirada — todo dentro del scatter (Δ≈8 ms). En cambio, apagar el **backdrop pintado** gana (108,9 → 83,5 ms, long tasks 6/10 → 0/1) y **`.field-grain { mix-blend-mode: normal }`** reproduce la misma ganancia (108,9 → 83,7 ms, 3/2 → 0/1). Un blend lee su backdrop, así que el grupo del campo entero se vuelve una unidad raster que se re-rasteriza cada frame. El arreglo: `@variant pointer-coarse { mix-blend-mode: normal }` en `.field-grain` — se conservan tile, 0,06, 6 strikes y campana; píntote fino no lo cambia. Verificado con build: p95 125,6/91,9/75,4 vs restaurar el overlay 125,5/108,8/100,5; long tasks 0/0/0 vs 248/176/163 ms por pierna (par 1 frío, empate declarado). RED observado en las dos aserciones del bloque coarse; 8/8 verdes; `pnpm test:all` 144 ✔; `check:css` OK (+4,06 % del techo de componentes). Deriva de identidad medida por screenshot: RMSE 1,23 %, PSNR 38,2 dB (el grain se ve un velo más platico en puntero grueso; par de capturas `.perf/phone/grain-overlay.png` vs `grain-normal.png` — el dueño no lo revisó a ojo aún).

Hallazgo de segundo orden, **no arreglado** (fuera de scope del brief, toca desktop): el mismo blend paga el mismo raster también con puntero fino; un desktop con cómpositor débil lo agarra también. Debe decidir el dueño. Nota instrumental: `dumpsys gfxinfo` en esta build reporta 3-5 frames por pierna de 11 s, por eso su jank % es direccional y la evidencia son los p95/long tasks.

Commit del arreglo: `289f028` (+12 líneas CSS, dos tests nuevos, 344 líneas). El dueño autorizó el feature “one-shot” sin parada intermedia y el par antes/después quedó documentado aquí.

**L15 — revisión nativa del slice `ff26106..289f028`: approved.** `gentle-ai review assess`: riesgo native **medium** (código ejecutable en tests), `reviewDue: false` bajo presupuesto, pero el brief del dueño pide revisión por candidato → START con lente única `reliability` y `baseRef` completo (`inspect` rechaza SHA abreviados, necesita los 40/64 hex). Presupuesto de corrección congelado: 172. El revisor nativo aprobó sin bloqueos; dos hallazgos **informativos** no bloqueantes quedan como trabajo posterior: `R3-blend-inventory-1` (flare-identity.test.js:145-150, SUGGESTION) y `R3-density-guard-1` (flare-density.test.js:120-130, WARNING). El slot del validador dirigido no se usó esta vez (sin corrección, no se discute el mismo defecto de L11). Acknowledgement exacto: authority `burned` (`gentle-ai.review-acknowledged/v1`).

**L16 — criterio de terminado, verificaciones de cierre.** (a) `pnpm test:all` verde (144 ✔, lint 0 errores con 1 warning preexistente en `src/perf/meter.js`), `check:css` OK (+4,06 % del techo de `@layer components`), árbol limpio tras commitear `289f028` y el doc. (b) Grabaciones: pipeline de L2 reproducido sobre `.perf/phone/perf-baseline.mp4` (antes, 2644 frames) y `.perf/video/perf-after.mp4` (después del arreglo en build, 2853 frames, reporte completo en `.perf/video/REPORT.md`). Comparación pareada honesta: las máquinas de captura no son estrictamente idénticas (antes: :4300 sin medidor de fases; después: :4301 con umbral calculado), y el antes pasa la segunda mitad de los 40 s sin scroll, así que la métrica usada es la **proporción de frames trabados durante scroll**: 46,29 % en el antes → **26,53 %** en el después, con la misma proporción de frames de salto (34,6 % vs 38,6 %) y fps efectivo 66,21 → 71,41. Intensión de defecto: la firma del piloto (flip azul oscuro→blanco en ~60 ms de L2) no aparece en **ninguna** de las dos; el piloto dió sólido en 10 muestras de scroll (62,0→46,0 luma del strip con pico 68/78). Los seis bursts más fuertes de ambos archivos son las tarjetas blancas del WorkList entrando en viewport (movimiento de diseño, lista conocida), no defectos. Veredicto: **reducido**, no “eliminado probado” (40 s no distinguen “el flash no puede ocurrir” de “no ocurrió”); la evidencia primaria del arreglo sigue siendo L14. Artefactos: `.perf/video/{before,after}.{full,pill,lowpass,statusbar,band*}.stats.txt`, `analysis{,2,3,4}.json`. Limitación declarada: la grabación del antes registra el build con el grain con overlay sin el medidor de fases, pero ni la traca ni los hermanos de capture-frames pueden distinguir “fix eliminó el flash” de “no ocurrió en estos 40 s”.

**L11 — el slot de validación dirigida vuelve a trabarse (segunda vez).** Después de la
corrección, el provider emite el mismo binding de `provider_targeted_validator` y el facade
lo rechaza dos veces con `collectBinding is missing or stale for current STATUS` (formas
objeto y serializada). Es el mismo desajuste ya visto en el medidor de dev: el
binding apunta al target de corrección (`cbbf2737`) mientras el STATUS expone el snapshot
actual (`5ccdabe7`). Sin verdicto del validador no hay cierre; por decisión previa del dueño
se deja así y se sigue. Dos lineages con el mismo síntoma son evidencia suficiente para
reportarlo como defecto del arnés, no del candidato.

**L17 — reporte de un fling en teléfono (8 nov): dos defectos reales, siete que no.**
Grabación de 4,6 s a 6 fps sobre `next dev`, nueve defectos reportados. Reales: (a)
secciones en blanco — el entrance de 0,45 s corría bajo el lector, que ya estaba encima;
(b) saltos de posición — el handler de `resize` llamaba `ScrollTrigger.refresh()` sin
argumento, o sea refresco forzado: saltea el guard de "está scrolleando", manda el scroll
a 0 y lo restaura desde el hilo principal. Arreglo (`048577a`, `e65f712`): `refresh(true)`
sólo cuando cambia el ancho, umbrales del fling en px/s y `FLING_GAP_MS` 250 ms porque el
p95 de frame del teléfono es 84-109 ms. Los otros siete no eran defectos: el campo ya es
`fixed inset-0` y nada usa `vh`; el medidor PERF es dev-only; el hero no lleva z-index;
las miniaturas reservan 16:9; el marquee no escala y su skew está clampeado a ±2,5°;
Lenis no secuestra el touch; el reveal nunca desmonta. La emulación **no reproduce** el
defecto (el toque sintético de CDP no tiene inercia), así que medir con dedo real en el
teléfono queda pendiente.

La clase `fling` tampoco sobrevive al silencio: si la capa se traba (o la pestaña queda
en segundo plano) no llegan más eventos y el latch la dejaba puesta, así que los bloques
siguientes perdían el entrance. La baja un watchdog que re-chequea el hueco real, y
`lockSmoothScroll()` la baja con la capa.

El campo también deja de pintar durante el fling: `html.fling .flare { animation-play-state:
paused }` (L13 ya había medido que apagar los 36 destellos gana todos los pares en el
teléfono: p95 92,1 → 66,6 ms). En carga, el shell pasa de `100dvh` a `svh` para que no
cambie de alto cuando la barra de Brave se esconde — el hero ya usaba `svh`.
Segunda pasada (el dueño reportó "siguen desapareciendo, pero menos"): el halo de 24 px
sobre todo el texto se apaga durante el fling (`html.fling :is(.hero-copy, .site-shell)`),
que es lo más caro que pide cada sección al entrar — a DPR 3 son 72 px de blur por línea.
Techo de `@layer components` 30120 → 30250.
