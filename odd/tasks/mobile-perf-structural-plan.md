# Plan estructural — "desaparecen cosas" en el flick

Rama `feat/audit-program`. Nace del reporte del dueño del 8 nov: en su teléfono, y sólo
en su teléfono, un flick agresivo deja a la vista el fondo con puntos y el contenido se
pierde por instantes. Tres recortes ya lo bajaron (reveals al instante, destellos en
pausa, halo apagado) y no alcanzó. Base de medición: `odd/tasks/mobile-motion-perf.md`
(L5, L6, L13, L14, L16, L17).

## 1. Qué sabemos y qué no

**Observado.** El síntoma es contenido ausente con el campo fijo intacto. El contenido
scrollea en una capa transparente sobre capas `fixed` ya rasterizadas (`Layout.jsx:35`,
`globals.css:1260-1263`): si a una baldosa del contenido le falta raster, se ve el campo
a través. Esa es la firma de *checkerboarding* — el compositor llega antes que el raster
—, no de un frame congelado ni de un nodo oculto. La traza de L13 pone el costo en
`RasterTask` / `GpuRasterBuffer::Playback` (87-88 ms) con la CPU 66 % ociosa: no hay JS
caliente.

**Corregido (9 nov).** La lectura de arriba estaba mal: el sampler mide en el hilo principal, donde `.is-in` ya llegó; el compositor scrollea por delante con tiles pintados cuando esos nodos todavía eran `opacity: 0`. Reproducido en Chromium (gesto sintético + CPU 8× + screencast): sin el fix hay pantallas de sólo fondo, con el fix no. En puntero grueso el reveal ya no oculta nada (`globals.css`, bloque `pointer-coarse` tras `.is-in .w > span`); desktop conserva la entrada.

**Corregido (traza de pintado del flick).** `node .perf/flick-trace.mjs` contaba el repintado por nodo durante los dos gestos: `#document` 60 veces y `HEADER.site-header` 55. El dueño de esas pintadas era la transición del pill del nav — `background-color`, `border-color` y `box-shadow` sobre un elemento `fixed`, o sea medio segundo repintando la capa raíz completa justo mientras el flick la necesita para rasterizar lo que viene. El relleno pasa a un `::before` y entre los dos estados sólo cambia su `opacity` (compuesta, con `will-change` para que la promoción no rasterice al empezar el fade): 7 pintadas de `#document` y 0 del header, mismas medidas que la ablación `.nav-pill{visibility:hidden}`. En reposo y con la página movida el pixel box y el color del pill son los mismos (sonda de estilo computado + diff de capturas: 97 % de los píxeles idénticos, el resto ±1-6 niveles en los bordes).


**Inferido.** El cuello está en raster/GPU, no en el hilo principal. A DPR 3 el viewport
son 1053×2244 px de dispositivo (2,36 Mpx) y cada capa a pantalla completa —campo,
lattice, grain, contenido, header— se dibuja en cada frame.

**Lo que los números no distinguen.** `p95`, long tasks y frames trabados miden la
cadencia del hilo principal; ninguno ve baldosas faltantes. El medidor lo dice: no puede
leer el compositor (`scripts/perf/README.md:60-61`), y sus anomalías (`vanished`,
`flicker`) leen el DOM, que durante un checkerboard está intacto.

**La medición que falta — una sola, sin código nuevo.** Con el teléfono enchufado:

```
.perf/tools/platform-tools/adb forward tcp:9222 localabstract:chrome_devtools_remote
```

Después, DevTools remoto sobre la pestaña → **Performance** con *screenshots* y *advanced
paint instrumentation*, tres flicks con el dedo. En los frames cuyo screenshot muestra
sólo el campo se lee cuál de los tres cuellos es:

- (a) hilos raster ocupados con el principal libre → raster-bound;
- (b) GPU/Viz saturado con raster corto → compositor/overdraw;
- (c) principal ocupado → hilo principal.

En la misma sesión: panel **Layers** (cuántas capas tiene `main`, si
`.bocanada-flares` ocupa una capa de viewport entero) y *Paint flashing* grabado con
`adb shell screenrecord`. Los scripts de enganche ya existen en `.perf/`
(`phone-flick.mjs`, `phone-load.mjs`, `phone-scroll.mjs`), así que la Fase 0 es abrir el
cable, no escribir instrumentos.

## 2. Candidatos, de mejor a peor

| # | Hipótesis | Ganancia esperada | Costo visual | Riesgo / tests | Instrumento | Acepta si |
|---|---|---|---|---|---|---|
| A | **Halo constante y corto en puntero grueso**: sólo `0 1px 2px`, sin los 24 px, y **se borra el toggle de `fling`** (`globals.css:2597`) | Un blur de 72 px de dispositivo por línea nueva — y hoy cada flick invalida el pintado de todo el texto dos veces, al entrar y al salir de `html.fling`, justo cuando el raster está atrasado. El toggle nunca se midió (L17 sólo trae bytes). La razón de ser del halo —el humo puede florecer blanco detrás del texto— no existe en el teléfono: el tier `static` no monta canvas (`quality-tier.js:16,96`) y blobs y glow están en `display:none` | Se va el aura difusa alrededor del texto, sólo en el teléfono. Sobre navy casi no se nota; sobre un destello coral detrás de una letra, el borde queda menos acolchado | Tests que lean el halo o el fling (`reveal-contract`, `css-contract`). Bytes: reemplaza una regla por otra, neutro | Sumar el halo corto a `ABLATE_CSS` y el nombre a `PHASES` (`meter.js:1254-1285`, `1842`): 2-3 líneas, porque la ablación hoy sólo sabe `display:none` | 3/3 pares ganados en p95 y mediana **−10 ms** (la dispersión es Δ≈8 ms, L14); `over50` no empeora; RMSE ≤1,5 % |
| B | **Miniaturas de WorkList**: `sizes` 100vw a DPR 3 pide la variante de 1080 w y se decodifica en los workers de raster mientras se scrollea (`WorkList.jsx:25`) | Sin medir. Indicio: los seis bursts más fuertes de L16 son las tarjetas del WorkList entrando | Miniaturas algo más blandas en el teléfono. **Decide el dueño** | Nada del CSS | Ablación `thumbs: ".work-thumb img"` (una línea) + `PHASES`; la traza de Fase 0 muestra `ImageDecodeTask` | Mismo umbral que A, con scroll sobre Trabajos |
| C | **Overdraw del campo**: fundir `.bocanada-field` (4 gradientes) y `.field-grain` en el `background-image` de `.bocanada-lattice` en puntero grueso | Dos quads de pantalla completa menos por frame. Sólo vale si la Fase 0 da (b). Techo: la ablación `field` existente | Ninguno si se respetan el orden de capas y el 0,06; verificable por RMSE | `field-flares.test.js` (geometría y `background-size` de la lattice), `flare-identity.test.js`. Bytes: ~300 B, no entran en los 108 B libres | `PHASES` con `"field"`, sin código | `field` gana más que la dispersión; recién entonces se implementa con el mismo umbral |
| D | **Wordmark `--fp`**: opacidad + `translate` sobre `background-clip: text` por letra, reescrito en cada frame del scrub (`Footer.jsx:126`, `globals.css:2446-2447`) | Local al footer. Antecedente medido: asentar el riel de About en puntero grueso bajó 50,1 → 33,4 ms | (i) promover en puntero grueso: nada visible; (ii) asentar `--fp=1`: el wordmark ya no sube en el teléfono. **Elige el dueño** | `will-change` sólo está prohibido en flares y reveal. Bytes: ~60 B, entran | `PHASES` con scroll sólo al final; hoy no hay ablación del footer | Pares sólo en la zona del footer, ≥10 ms |
| E | **Marquee**: el rAF corre sin pausa (`MarqueeMotion.jsx:103`), con sus dos capas ya promovidas | Baja: el hilo principal está 66 % ocioso | Pausarlo durante el fling congela la banda y su skew, que es su identidad de velocidad | Quitar el `will-change` **empeora**: repinta 2161 px por frame | `PHASES` con `"marquee"`, sin código | Sólo se toca si gana más que la dispersión |
| F | **`contain: paint` por sección** | Acota invalidación y layout — trabajo del hilo principal, que no es el cuello, y no reduce el raster de baldosas nuevas | Recorta lo que sobresale: halo en el borde, cluster `.orn`, márgenes negativos de `.w` | Vuelve a la sección el bloque contenedor de los `fixed` y rompe `.work-preview` si no se limita a puntero grueso | Sólo si la Fase 0 da (c) | — |

**`main` en `relative z-10`** no agrega capas por sí mismo. Lo que hay que mirar en el
panel Layers es si los 6 flares animados fragmentan `main` por superposición; si pasa,
el arreglo va en los flares, no en el z-index.

## 3. Secuencia

Cada fase es un commit, se mide en pares intercalados en el teléfono y se revierte con
`git revert`. Comando común:

```
node scripts/perf/remote-proxy.mjs --target http://127.0.0.1:4173 --port 4300 \
  --host 0.0.0.0 --out /tmp/perf-remote
```

Abrir `:4300/es` en el teléfono y llamar `__perfPhases()`.

0. **Diagnóstico** (sin commit): traza remota y panel Layers de §1. Decide si seguimos
   por A/B (raster), C (GPU) o F (principal).
1. **Techo con lo que ya hay**: `PHASES` = `field`, después `marquee`, después `reveal`.
   Una línea por vez, sin commitear. Descarta C y E si no pasan la dispersión.
2. **A, el halo.** Ablación primero; si pasa, commit de CSS.
3. **B, las miniaturas.** Ablación `thumbs` primero; el `sizes` sólo con el visto bueno
   del dueño.
4. **D, el wordmark.** Variante (i) primero.
5. **C, el campo.** Sólo si 0 y 1 lo justifican y el dueño acepta subir el techo de CSS.

## 4. Decisiones del dueño

Cambian lo que se ve: el halo corto en el teléfono (A), la nitidez de las miniaturas (B),
si el wordmark sube o no (D-ii), pausar el marquee (E), y subir el techo de
`@layer components`.

Se decide midiendo, sin preguntar: la traza, las ablaciones, promover `.footer-mark` en
puntero grueso y fundir el campo.

## 5. Qué no hacer

- **`content-visibility: auto`**: saca layout y pintado de cada sección hasta que se
  acerca. En un flick eso es trabajo en el hilo principal en el peor momento, sin nada
  rasterizado todavía: más fondo vacío, no menos. La advertencia de `audit.md:318` era
  otra, pero el problema del flick sigue: el compositor avanza más de un viewport entre
  frames de ~90 ms.
- **`-webkit-font-smoothing`**: sólo actúa en macOS; en Android no hay nada que ganar.
- **Quitar promociones** (marquee) o **promover flares**: lo primero repinta cada frame;
  lo segundo está medido como neutro (L14) y prohibido por `flare-density.test.js`.
- **Más toggles de pintado en `html.fling`**: cada uno repinta todo justo cuando el raster
  está atrasado. El halo que se apaga hoy es exactamente ese caso, y nunca se midió.
- **Quitar la lattice o los flares en el teléfono**: son la identidad
  (`quality-tier.js:12-21`).
- **Depurar en emulación de PC**: no reproduce el síntoma.
