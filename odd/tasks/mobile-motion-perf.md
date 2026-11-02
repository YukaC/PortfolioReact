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

## Tasks

| ID | Specs | Ruta | Commit |
|---|---|---|---|
| T1 | S1, S2 | parent (pill a ink sólido + token `--ink-surface`) | `5832b4e` |
| T2 | S3 | parent (`perf-suite --only ablate,scroll,reveal`) | medido |
| T3 | S3, S4 | parent (filas de WorkList promovidas sólo con puntero fino + contador de superficies honesto) | `5b5e035` |
| T4 | S5, S6 | parent (pasada en el teléfono) | pendiente |

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
