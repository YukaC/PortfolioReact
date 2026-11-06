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

**S7 — Durante un fling, el contenido que la pantalla muestra no puede estar en el
entrance.** Verbatim: "Secciones enteras en blanco durante el scroll. Hay varios
fotogramas donde solo se ve el fondo con puntos y el contenido desaparece (hero,
proyectos, formación)." Criterio: medido en un fling nativo táctil, con el CPU
throttle del teléfono, la cantidad de frames con un bloque visible del centro de
pantalla por debajo de `opacity 0.9` tiene que bajar a ~0, y no puede quedar ningún
nodo visible sin revelar cuando el gesto frena. La textura no cambia: el entrance
se conserva a velocidad de lectura.

**S8 — Un solo gesto no puede hacer retroceder el scroll.** Verbatim: "Saltos de
posición del scroll. En un mismo fling el scroll pasa del hero al footer, luego
vuelve al hero." Criterio: dentro de un gesto, `scrollY` es monótono; ninguna
variación del viewport (barra de URL de Brave apareciendo o escondiéndose) puede
disparar un re-anclaje del scroll. Se mide por frame, en build de producción.

**S9 — La estética queda igual: cambia cómo se renderiza, no cómo se ve.** Verbatim.
Ninguna de las correcciones de S7/S8 puede cambiar el look: ni el pill transparente
en reposo, ni el halo de texto, ni el marquee, ni el fondo, ni el wordmark. Lo que
el triage declare diseño documentado o artefacto de desarrollo no se toca sin un
brief nuevo del dueño.

**S10 — La verificación es en build de producción.** Verbatim: "Probá siempre con
next build && next start: el dev server en el celular exagera todo." El antes/después
de S7 se corre sobre `next build` + `next start`, nunca sobre `next dev`.

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
| T7 | S8 | parent (`ScrollTrigger.refresh(true)` + refresco sólo cuando cambia el ancho) | `%(c1)s` |
| T8 | S7, S10 | parent (latch tolerante a frames de teléfono + medición A/B en build) | `%(c1)s` |
| T9 | S7, S8, S9 | parent (sonda Playwright móvil: `scrollY` monótono + frames en blanco, antes/después) | L18 (medido; reproducción del defecto pendiente en el teléfono) |

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
objeto y serializada). Es el mismo desajuste que `odd/tasks/dev-test-meter.md` L13: el
binding apunta al target de corrección (`cbbf2737`) mientras el STATUS expone el snapshot
actual (`5ccdabe7`). Sin verdicto del validador no hay cierre; por decisión previa del dueño
se deja así y se sigue. Dos lineages con el mismo síntoma son evidencia suficiente para
reportarlo como defecto del arnés, no del candidato.

**L17 — cuarto reporte del dueño: grabación de 4,6 s a 6 fps, fling sobre el dev server
(8 nov).** Nueve defectos observados a ojo; el dueño fija el orden de ataque ("empezando
por el 1 y el 2, que son los de mayor impacto") y la condición de no cambiar el look.
Triage contra el código, con evidencia:

- **1. Secciones en blanco (S7): real.** El reveal es once-only y nunca desmonta
  (`useRevealOnEnter.js:62-66`), así que no es un desmontaje: es el entrance corriendo
  bajo el lector. En táctil el disparador es `+33%` (~280 px) y `--duration-reveal` es
  0.45 s, con frames de teléfono de p95 84-109 ms (L5/L13): un solo frame del fling se
  come el margen. El `fling` de `smoothScroll.js` ya quita el entrance, pero su salida
  por inactividad (`FLING_GAP_MS = 120`) está por debajo del p95 de frame del teléfono,
  así que el latch puede leer un fling como "quieto" justo cuando hace falta.
- **2. Saltos de posición (S8): real, mecanismo encontrado.** El handler propio de
  `resize` (`smoothScroll.js:88-95`) llama `ScrollTrigger.refresh()` **sin argumento**,
  200 ms después de cualquier resize. Sin argumento es refresco forzado: salta el guard
  de "el usuario está scrolleando" (`gsap/ScrollTrigger.js:483-487`), manda el scroll a
  0 y lo restaura desde una posición anotada en el hilo principal (`:499-503`, `:540-546`).
  La barra de URL apareciendo o escondiéndose es exactamente un resize de alto, y
  `ignoreMobileResize` (que sí se configura en `smoothScroll.js:79`) sólo cubre el
  listener propio de ScrollTrigger, no el nuestro.
- **3. Fondo que no cubre el viewport: sin mecanismo en el código.** Campo, lattice y
  flares son `fixed inset-0` (`AppBackground.jsx:249`, `globals.css:1261,1286`) y nada
  usa `vh` para dimensionarse. La franja oscura es compatible con el `ink` del `html`
  mientras Chromium re-dimensiona capas fijas; la línea clara de la izquierda no tiene
  causa en el código. Sin captura a 60 fps no se toca.
- **4. Header "sin fondo" y logo sobre el texto:** parcialmente diseño documentado — el
  pill es transparente en reposo y sólido desde `scrollY > 24` (`Navbar.jsx:237`,
  `globals.css:529-533`), con una transición de 0.5 s. En un fling el contenido puede
  pasar por debajo antes de que el estado llegue; el estado de reposo no se cambia sin
  brief. Nota: `AGENTS.md` dice "glass on scroll" y el CSS es ink sólido desde L4 — el
  documento está desactualizado, el código manda.
- **5. z-index del CTA sobre el header: no hay bug de orden.** El header es `--z-nav: 50`
  (`globals.css:1669`) y ningún elemento del hero lleva z-index; lo que se ve es el CTA a
  través del pill todavía transparente (mismo hallazgo que 4).
- **6. Marquee gigante y fantasmal:** el tamaño es `clamp(2.5rem, 12vw, 3rem)` en
  `max-xs` (`globals.css:1821`) y el skew está clampeado a ±2.5° en puntero grueso
  (`MarqueeMotion.jsx:97`); nada escala. Un frame intermedio de un video a 6 fps de un
  texto de 48 px en movimiento es exactamente lo que se ve así. Sin acción.
- **7. Wordmark cortado y tapado por PERF:** el overlay es de desarrollo dos veces
  (`PerfTestMeter.jsx:56` `NODE_ENV !== "development"` y la marca de sesión
  `sessionStorage["pf-test"]`, pineado en `test-route-contract.test.js:114-126`); en
  producción no existe. El corte del wordmark y el degradado a transparente son de
  `.footer-mark` (diseño).
- **8. Imágenes recortadas o que "popean":** las miniaturas reservan 16:9 y usan
  `object-cover` (`WorkList.jsx:43-53`), `placeholder="blur"`; el hueco es el placeholder
  en `next dev`, que no cachea imágenes optimizadas.
- **9. Glifos borrosos:** la decisión de no usar `will-change` es de S4 (`globals.css`),
  y un halo de 24 px sobre texto en movimiento se comprime mal a 6 fps. Sin medición
  nueva no se toca.

Conclusión del triage: de nueve, **dos** son defectos reales de código (1 y 2), y son
los que el dueño priorizó. Los otros siete son diseño documentado, artefacto del dev
server o falta de resolución de la grabación.

**L18 — T7/T8 implementados; la reproducción en emulación no se obtuvo (8 nov).** Lo
que cambió el código: (a) el handler propio de `resize` ya no llama `refresh()` sin
argumento — sólo refresca cuando cambia el ANCHO, y por la vía debounced
(`ScrollTrigger.refresh(true)`), que es la que usa el listener propio de GSAP; el
`refresh()` del teardown también pasó a `true`. (b) `FLING_GAP_MS` 120 → 250 ms, porque
el p95 de frame medido en el teléfono es 84-109 ms y una long task llega a 240 ms (L5,
L13): con 120 el latch leía un fling como "quieto" justo cuando hacía falta. Los dos
quedan pineados en `src/lib/scroll-contract.test.js` (archivo nuevo, 3 tests).

Verificación (sonda `.perf/fling-probe.mjs`, Pixel 7 emulado, CPU 4x, swipe táctil por
CDP, cambio de alto del viewport a mitad del gesto — la barra de URL):

| objetivo | frames | travel | saltos atrás | peor salto | frames en blanco | `fling` |
|---|---|---|---|---|---|---|
| base 4173 (código sin el arreglo) | 176 | 1075 | 0 | 0 | 0 | 0 |
| prod 3200 (con el arreglo) | 174 | 1067 | 0 | 0 | 0 | 0 |
| dev 3300 (con el arreglo) | 175 | 1041 | 0 | 0 | 0 | 0 |

Sonda dura (CPU 6x, 12 swipes de 15×70 px, dos toggles de alto): 0 saltos y 0 frames en
blanco en los tres, travel 8740/5814/5814, `fling` 0/53/29 — el arreglo está presente y
el latch se enciende, pero **no se reprodujo el defecto**. Los dos detectores se
validaron: forzando `[data-r]{opacity:.04}` la sonda reporta 18-24 frames en blanco, y un
`scrollTo` de −500 px a mano reporta `maxBackwardJumpPx: 500`.

**Por qué no se reproduce, y qué falta.** El toque sintético de CDP no tiene inercia en
Chromium: un swipe frena en seco en `touchend` y viaja una pantalla, así que el scroll
nunca sigue avanzando con el hilo principal ocupado. Ese es justo el estado en el que
aparecen los dos defectos: en un teléfono real el fling es del compositor y sigue
moviéndose mientras el callback del observer, el latch del fling y el timer del refresh
esperan turno. Entonces: el mecanismo del salto se eliminó y está pineado, pero **la
reproducción sobre el teléfono queda pendiente** (el camino de L12: `adb` + Brave por CDP,
o un retest del dueño). No se declara "arreglado probado".

**Efecto colateral declarado.** El `pnpm build` que pide S10 reescribió `.next`, que era
lo que servía el `next start` viejo en :4173 (build pre-arreglo que se usaba de línea
base): ese proceso quedó sirviendo chunks que ya no existen. Se reinició :4173 contra el
build nuevo cuando terminó la medición, así que la línea base pre-arreglo de la tabla es
la única muestra válida de ese servidor.
