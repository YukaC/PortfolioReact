# flare-tempo — the lattice breathes at 128 BPM

Feature branch: `feat/audit-program`. Alcance: la cadencia de los 36 flares de la
identidad. El campo deja de tener ciclos de ~9 s elegidos a mano y pasa a respirar
en la grilla del tema que le da nombre.

## Specs

**S1 — 128 BPM es el tempo de la respiración.** El pedido, verbatim: "los flares de
la web deben ir a 128 bpm como respiracion, esos bpm son los de la cancion
bocanada". `128` es un número del sistema, no un decimal suelto: vive como
`--bpm` en `globals.css` y como `BPM` en `src/lib/field-flares.js`, y un test
afirma que los dos valen lo mismo.

**S2 — Una respiración por flare = 8 beats (enmendado a 16 por L4).** La
decisión derivada, con la recomendación que el dueño aceptó ("hacelo para que
coincida con la cancion y listo… si no que me recomendarias?"): un latido por beat
a 128 BPM son 2,13 Hz, y con 36 puntos y el techo de 1–4 encendidos eso obliga a
un destello de <50 ms. Ocho beats son exactamente dos compases 4/4 y 16
respiraciones por minuto, la frecuencia de una respiración humana calma.
`--breath: calc(8 * var(--beat))`, y el `8` es la única perilla para apurar o
calmar el campo.

**S2 (vigente, L4) — Una respiración por flare = 16 beats.** El dueño reportó que
los strikes seguían leyéndose rápidos y propuso "dividir la velocidad de los bpm
en la mitad"; se implementó el equivalente sin tocar el tempo: el ciclo es
`--breath: calc(16 * var(--beat))` = 7,5 s, exactamente cuatro compases 4/4, 8
respiraciones por minuto. `--bpm` sigue en 128 porque es el tempo de la canción y
la división de la respiración es decisión de diseño. Duty cycle es invariante de
escala, así que el techo de 1–4 encendidos y el piso de "nunca oscuro" se
conservan: lo único que cambia son los segundos de cada campana (3,7 s en el
teléfono, 0,68 s en los 36), y el `16` es la perilla.

**S3 — Las fases se reparten en negras subdivididas, no en segundos.** Cada
`--delay` es un slot entero de la grilla de fases, 64 slots en la respiración,
repartidos en orden de razón dorada para que **todo prefijo** (los 6 del teléfono,
los 36 del escritorio) quede esparcido. Onset y pico de cada flare caen en esa
grilla: el campo está en tempo, no "cerca" del tempo. La grilla se deriva del
ciclo (`--grid: calc(var(--beat) / 4)`, una semicorchea, 117,19 ms = `--breath /
64`): con la corchea de 1/32 fija, al duplicar la respiración las 36 fases se
apelotonaban en la primera mitad y la segunda quedaba a oscuras (la simulación
leyó 0 encendidos y 6 a la vez, los dos fuera de presupuesto).

**S4 — Escalonado, no unísono.** Elegido por el dueño: cada punto tiene su fase
dentro de la respiración, así el campo sigue siendo un shimmer sereno y conserva
el contrato vigente de 1–4 flares encendidos a la vez y nunca completamente a
oscuras (audit.md §19.2, `field-flares.test.js`).

**S5 — Lo que no cambia.** Las 36 coordenadas de celda, los cuatro niveles de
densidad 6/12/22/36, la posición por coordenada de celda, el reposo en 0,04, el
pico en 0,5, la curva `--ease-in-out-field`, `prefers-reduced-motion`, y el hecho
de que sólo animan `opacity` y `transform`.

**S6 — Verificación.** `pnpm test:all` (lint, `node --test src/lib`,
`check:css`, `check:motion`, `validate:bebop`) en verde, y la simulación de
`field-flares.test.js` con el nuevo ciclo: pico ≤ 4, media 1–4, cero oscuridad
total en el minuto certificado, en las cuatro densidades.

## Tasks

- **T1** — Reescribir el contrato de cadencia en `src/lib/field-flares.test.js`
  para el tempo (S1–S4) y verlo en rojo. Ruta: inline. Hecho: rojo observado
  (constantes de tempo inexistentes, luego tokens de CSS ausentes).
- **T2** — Implementar: tokens `--bpm`/`--beat`/`--breath`/`--grid` y las cuatro
  bandas de keyframes en `globals.css`, la tabla reducida a `{ cx, cy, slot }` en
  `src/lib/field-flares.js`, y el `--delay` como `calc(slot * var(--grid))` en
  `AppBackground.jsx` (S1–S5). Ruta: inline. Verde.
- **T3** — Actualizar `docs/css-map.md` §identity a la cadencia nueva (S5).
  Ruta: inline. Hecho.
- **T4** — `pnpm test:all` y el commit de cierre (S6). Ruta: inline.

Todo el trabajo cierra en un solo work unit: **commit `feat(identity)`**, con el
código, el contrato y los docs juntos.

## Evidence

- `pnpm test:all`: `node --test src/lib` 145/145, `check:css` sin drift
  (ni literal, ni clase muerta, ni token huérfano, ni crecimiento), `check:motion`
  limpio, invariantes de Bebop OK. `eslint`: 0 errores (1 warning previo en
  `src/perf/meter.js`, ajeno a este cambio).
- Simulación de `field-flares.test.js` con el ciclo de 3,75 s: pico 4 y media
  2,9–3,4 en las cuatro densidades, 0 ms a oscuras en el minuto certificado.
- Navegador real (Chromium, hoja compilada con el pipeline del proyecto): la
  cadena `calc` resuelve — `--bpm: 128`, `--beat: calc(60s / 128)`,
  `animation-duration: 3.75s` en `.flare`, `animation-delay` 0 / 1,99219 / 0,761719 s
  (= 0 / 34 / 13 slots × 58,59 ms), y la opacidad pintada del primer flare va de
  0,04 a 0,499 y vuelve, 28 de 253 frames por encima del umbral.
- Peso: el HTML de los 36 flares pasa de cuatro variables inline a tres (`--dur`
  se fue al token `--breath`) y la tabla de cuatro columnas a tres. Nada de JS
  nuevo: el tempo vive en cuatro custom properties de la hoja.


## Log

**L1** (request, verbatim): "los flares de la web deben ir a 128 bpm como
respiracion, esos bpm son los de la cancion bocanada".

**L2** (decision, verbatim): "hacelo para que coincida con la cancion y listo,
seria lo mejor no? aparte 128 bpm calza con la descripcion de respiracion, no? si
no que me recomendarias?" — y, en la misma respuesta, "Escalonado (sereno)" para
la forma del pulso.

**L3** (medición previa): el contrato viejo daba 36 flares con ciclos distintos de
8,7–9,3 s y fases de 0–8 s; el techo de 1–4 encendidos se sostiene con ciclo ×
duty, así que acortar el ciclo obliga a acortar el swell. Con 8 beats: 1,84 s de
campana en el teléfono (6 puntos), 1,00 s en 12, 0,52 s en 22, 0,34 s en 36, todas
con pico 4 y cero instantes a oscuras.

---

## Reapertura — respiración más lenta (L4)

**L4** (request, verbatim): "quiero que analices este componente dereact bits y
compares el funcionamiento del humo, anda más que eso, y lo compares con el
nuestro, creo que lo podriamos mejorar un poco más, además los flares quedaron
muy rapidos, tal vez si lo hacemos más respiracion queda mejor, tal vez diviendo
la velocidad de los bpm en la mitad quedaria mejor no?"

**L5** (decision, verbatim, elegida por el dueño entre cuatro opciones): "Sólo
respiración: --breath a 16 beats (7.5 s)".

Análisis anexo (read-only, sin código): la fuente real del componente de React
Bits es `MicroSlats.jsx` (919 líneas, registry `MicroSlats-JS-CSS.json`). No
dibuja humo: dibuja una **ola**. Dos passes —uno barato a resolución de celda que
suma cuatro trenes de onda con dispersión física y guarda luz/alto/glint/
inclinación por slat, y uno de pantalla con la SDF del slat— más un Navier–Stokes
real de 96×96 (splat, curl, vorticity, divergencia, 16 Jacobi, project, advect)
usado como desplazamiento e ink. El gap perceptual con nuestro campo no está en el
humo (el nuestro es técnicamente más profundo: dye advectado, luz por gradiente,
cuatro fases de cadencia) sino en la **coherencia espacial**: allá las crestas
viajan y el glint sólo corona la cresta; acá el dye es turbulento y los 36 flares
tienen fase independiente, así que lee neblina y shimmer, no cuerpo. Registrado
como mejora de fondo posible (ola diagonal en el `--delay` + glint de cresta), no
autorizada todavía.

### Tasks de la reapertura

- **T5** — Red de la cadencia nueva: `field-flares.test.js` con 128 BPM, 16 beats,
  7,5 s y la grilla derivada. Ruta: inline. Hecho: rojo observado
  (`8 !== 16`), y después del cambio de ciclo un segundo rojo real y útil —
  `the first 22 delays span 3.633 s of 7.5 s` y `6 flares: at most 4 may be lit at
  once, saw 6` — que es el defecto que la grilla fija de 1/32 introducía.
- **T6** — `globals.css`: `--breath: calc(16 * var(--beat))` y
  `--grid: calc(var(--beat) / 4)` (S2, S3). Ruta: inline. Verde.
- **T7** — Docs y comentarios al día: `docs/css-map.md` §identity, el bloque de
  tempo y el de keyframes en `globals.css`, la cabecera de
  `src/lib/field-flares.js`. Ruta: inline. Hecho.
- **T8** — Verificación (S6). Ruta: inline. Hecho: `pnpm test:all` en verde
  (`node --test src/lib`: 145 pass, 0 fail; `check:css` 74 823 B compilados,
  `@layer components` 29 658 B bajo el techo de 29 900 B; `check:motion` limpio;
  `validate:bebop` OK; eslint 0 errores, 1 warning previo ajeno), más probe en
  Chromium sobre la hoja compilada del dev server: `--bpm: 128`,
  `--breath: calc(16 * calc(60s / 128))`, `--grid: calc(calc(60s / 128) / 4)`,
  `animation-duration: 7.5s` en las tres bandas, y los `--delay` de la banda de 12
  resolviendo 0 / 1,52344 / 3,04688 / 3,98438 / 5,50781 s (= 0 / 13 / 26 / 34 /
  47 slots × 117,19 ms).

---

## Reapertura 2 — la respiración (L6) y el humo (L7)

**L6** (request, verbatim): "parecen mas destellos que respiraciones" y, tras la
propuesta de cambiar la estructura, "me refiero al ritmo de encendido y apagado,
eso quiero mas lento, como respiracion".

**L7** (request, verbatim): "lo de bajar los fps del smoke no me gusta, prefiero
que sea un poco mas lento, tipo neblina al desaparecer, pero que no baje fps, si
no un fade out sencillo".

### Diagnóstico

El problema no era el período: con 7,5 s de ciclo y una ventana de encendido de
0,68 s en el campo de 36 puntos, cada strike era un parpadeo dentro de un ciclo
largo. **La ventana era el destello.** Esa ventana existía para sostener el
presupuesto de §19.2 ("1–4 encendidos a la vez"), y ese presupuesto es aritmética
de ventanas angostas: mientras exista, un strike no puede durar segundos.

Y en el humo, la fase `ambient` presentaba un cuadro cada 190 ms: el pedido de
L21 ("que el humo no se evapore en reposo") se había pagado con fps visibles, que
es justo lo que L7 rechaza.

### Cambios

- **S2/S3 sin cambios**: 128 BPM, 16 beats, 7,5 s, grilla derivada del ciclo.
- **S4 revisada**: el escalonado sigue (cada punto conserva su slot), pero el
  presupuesto **1–4 encendidos queda retirado** por L6. Lo que se mantiene calmo
  ahora es la amplitud: un solo `@keyframes flare` (0 %/100 % → 0,04; 50 % → 0,18)
  cuyo *ventana es el ciclo*: 3,75 s de inhalación y 3,75 s de exhalación. Se van
  los tres keyframes por banda y los `animation-name` por viewport: la banda
  decide cuántos puntos se pintan, nunca cómo respiran.
- **S5**: las 36 coordenadas, la densidad 6/12/22/36, el reposo 0,04, la curva
  `--ease-in-out-field` y el "nunca completamente a oscuras" siguen; el pico pasa
  de 0,5 a 0,18.
- **Humo**: `ambient` se retira completo (`AMBIENT_*`, `ambientDriver`,
  `scheduleAmbient/ambientTick/clearAmbient`, la prop y `useAmbientField`). Fases:
  `active` (display rate) → `dissolving` (un último cuadro y el loop se detiene;
  el canvas se disuelve con **una transición de opacidad de 2400 ms** en el
  compositor) → `frozen` (0 draws). Volver a interactuar hace fade-in en 260 ms y
  reinicia el loop.

### Tasks de la reapertura 2

- **T9** — Humo: reemplazar la fase `ambient` por el dissolve (L7). Ruta:
  delegada (`gentle-ai-worker`) por tamaño del archivo: LiquidEther.jsx,
  AppBackground.jsx, scripts/measure-idle.mjs. Cierre del padre: el loop se detiene
  en el cuadro que se desvanece (0 draws durante el fade) y la curva pasa a
  `cubic-bezier(0.45, 0, 0.55, 1)`.
- **T10** — Flares: un solo keyframe con la ventana en el ciclo y pico 0,18 (L6).
  Ruta: inline. Rojo observado en tres contratos viejos
  (`flare-identity`, `flare-density`, `field-flares`), verde después.
- **T11** — Docs: `docs/css-map.md` §identity, `field-flares.js`, comentarios de
  tempo y keyframes en `globals.css`. Hecho.
- **T12** — Verificación. `pnpm test:all`: 145 pass / 0 fail, `check:css`
  74 157 B compilados (@layer components 29 506 B < 29 900), `check:motion`
  limpio, eslint 0 errores. Navegador (Chromium, dev server): `animation-name:
  flare`, `animation-duration: 7.5s`, easing `cubic-bezier(0.45, 0, 0.55, 1)`,
  opacidades por punto 0,040–0,178. `measure:idle`: `idle/draws` OK con **0 draws
  en 10 s**, `idle/recalc` 1 por frame, `idle/flares` 22 animaciones vivas.
  `idle/task` rojo (541 ms con el dev server), igual que lo estaba en HEAD
  (318/314 ms medidos sobre build de producción con la fase `ambient`): es una
  deuda previa del `TaskDuration`, no de este cambio, y este cambio dibuja 0
  veces en reposo donde antes dibujaba ~10/s.
  Curva del fade medida en navegador: opacidad computada 1 → 0,84 → 0,63 → 0,42
  → 0,21 → 0,007 → 0 en 2400 ms, empezando 350 ms después del último evento.

---

## Reapertura 3 — dispersión del humo y respiración intermedia (L8)

**L8** (request, verbatim): "lo que hiciste con el fade out no me gusto, yo me
referia al fade out de la animacion, es decir que terminara de dispersarse, nada
mas. los flares quedaron medios tenues y se mueven muy despacios y juntos".

### Correcciones

- **Humo**: el fade de opacidad del canvas era la lectura equivocada. Se elimina
  (`fadeCanvas`, `WAKEN_MS`, toda escritura de `canvas.style.opacity`/`transition`).
  Lo que se desvanece ahora es **la animación**: al quedar quieto el lector, la
  pluma deja de alimentarse (`smoke_amount` y `ambient_amount` a 0), la disipación
  sube a 0,978 (`0,978^180 ≈ 0,02`), y a display rate — sin bajar un solo cuadro ni
  una sola iteración — el dye se dispersa en ~3,2 s. El canvas queda transparente
  solo, porque el color pass escribe alfa premultiplicado con `bgColor.a = 0`. Un
  último cuadro más y el loop se estaciona: 0 draws.
- **La neblina procedural también se va**: `color_frag` sumaba un término `haze`
  que lee el reloj y no el dye, así que apagar el dye dejaba una banda de niebla
  congelada en el piso. Se agrega el uniform `hazeFade`, único dueño en el
  manager, que va de 1 a 0 con smoothstep durante la dispersión. Con `hazeFade = 1`
  el look es idéntico bit a bit (multiplicar por 1,0).
- **Flares**: 16 beats → **12 beats** (5,625 s, ~10,7 respiraciones/min) y pico
  0,18 → **0,3** ("medios tenues"). La ventana pasa de "todo el ciclo" a **la mitad**
  (25–75 %): 1,41 s de subida, 1,41 s de bajada y 2,81 s a oscuras, que es lo que
  hace que cada punto esté visiblemente apagado entre respiraciones en vez de que
  todo el campo ondulando junto ("y juntos").
- **`--grid` se deriva del ciclo**: `calc(var(--breath) / 64)` en lugar de
  `calc(var(--beat) / 4)`. Con el grid colgado del beat, cambiar la respiración
  deja las 36 fases apiladas en la primera mitad y la segunda a oscuras.

### Verificación (T13)

- `pnpm test:all`: 145 pass / 0 fail; `check:css` 74 173 B compilados
  (`@layer components` 29 506 B < 29 900); `check:motion` limpio; eslint 0 errores
  (1 warning previo en `LiquidEther.jsx` por `touchSmoke` y el `ESLintEnvWarning`
  de `src/perf/meter.js`).
- Navegador (Chromium, dev server, 1440×900): `animation-name: flare`,
  `animation-duration: 5.625s`, opacidades por punto 0,040–0,290 (spread 0,25,
  7 de 12 por encima de 0,1 → escalonado real, no unísono).
- Dispersión del humo medida con contador de draws inyectado: **1 296 draws en los
  primeros 1 200 ms** después del despertar (≈60 fps × 18 pases = display rate
  completo, sin throttling) y **0 draws** después del estacionamiento. El canvas
  no tiene `opacity` ni `transition` inline (`canvasInline: "display: block;
  width: 100%; height: 100%;"`).
- Capturas comparadas (activo vs. 5 s de quietud): el campo queda en
  `.bocanada-field` + blobs + lattice + flares, sin banda de niebla residual en el
  piso.
- Deuda previa, no de este cambio: `idle/task` (`TaskDuration`) sigue rojo en el
  dev server; en HEAD ya estaba rojo (318/314 ms medidos sobre build de
  producción con la fase `ambient`).

---

## Reapertura 4 — dispersión espacial y brillo (L9)

**L9** (request, verbatim): "quiero que los flares se enciendan más dispersos, más
random, parecen caer por grupos mayormente en el lado izquierdo, además siguen
siendo tenue su brillo/color".

### Diagnóstico

No era aleatoriedad, era la escalera: la tabla es acumulativa, así que los seis
puntos del teléfono quedan clavados en `x < 8`, los seis del tablet en `x < 21`, y
esos doce siguen visibles en un campo de 1920. Los 36 terminaban con 16 entradas
en las nueve primeras columnas y 6 en las últimas. Medido: centroide de la banda
de 12 en x=6,42 sobre un medio de 10, y tercios 18/12/6 en la banda completa.

### Cambios

- **Tabla regenerada** (`src/lib/field-flares.js`): cada banda entrega sus celdas
  nuevas a los **tercios hambrientos** de su propio ancho, y dentro del tercio a un
  punto de baja discrepancia (R2). Ahora los 36 quedan **12/12/12** en los tercios
  de 1920, y los centroides de banda son 3,67 / 8,75 / 15,73 / 18,92 contra medios
  3,5 / 10 / 16 / 19,5.
- **Dos invariantes nuevos, con test**: ninguna celda toca a otra (Chebyshev ≥ 2), y
  dos celdas a ≤ 3 de distancia nunca se encienden con menos de 8 slots (0,7 s) de
  diferencia. Los slots se reparten en orden de razón dorada **a través de una
  permutación determinista** de la tabla, para que la regeneración sea reproducible
  y testeable.
- **Brillo**: pico 0,3 → **0,45** y disco más caliente: el gradiente pasa de un
  núcleo casi blanco (4 % coral) a un núcleo coral levantado hacia blanco
  (18 % / 82 % / 62 % coral), así el punto lee como luz y no como polvo. Medido en
  navegador: 9–11 puntos por encima de 0,2 simultáneos, máximo 0,45, y 36
  animaciones corriendo.
- **Arranque en frío**: durante los primeros ~1,3 s el campo está casi apagado
  porque los `--delay` reparten el primer latido en todo el ciclo. Es inherente al
  escalonado, no un defecto del cambio.

### Verificación (T14)

- `pnpm test:all`: **147 pass / 0 fail** (los dos tests nuevos entraron en rojo
  contra la tabla vieja: “lopsided bands” y “flares that fire as a group”),
  `check:css` 74 297 B compilados (29 629 B en `@layer components`, techo 29 900),
  `check:motion` limpio, eslint 0 errores.
- Navegador (Chromium, 1920×1000): 36 flares visibles, tercios `left=12 middle=12
  right=12`, `maxOpacity 0.45`, 9–11 por encima de 0,2 en régimen, captura con los
  puntos repartidos de extremo a extremo y sin grupos.

---

## Reapertura 5 — glow y población encendida (L10)

**L10** (request, verbatim): "el diseño que le diste a las flares perdio ese toque
de glow y quedo medio mal esteticamente, el ritmo está bien pero qie no se
prendan tantas a la vez".

### Diagnóstico

Dos problemas distintos:

1. **Glow**: en la pasada anterior achaté el disco a un gradiente de un solo salto
   con el medio casi opaco. Eso no es glow, es un punto pintado: el glow vive en
   la cola ancha y suave, no en el pico.
2. **Población encendida**: con ventana plana del 50 % del ciclo, la cantidad
   encendida es `puntos × duty` = la mitad del campo (18 de 36). No hay forma de
   tener a la vez swell largo y pocas encendidas con una ventana plana: o se acorta
   la ventana (vuelve el destello de L6) o se bajan los puntos.

### Cambios

- **Forma de la campana**: marea + bloom. `0,04` en reposo → `0,12` al 38 % →
  `0,5` al 50 % → `0,12` al 62 % → `0,04` al 100 %. El punto se mueve casi todo el
  ciclo (5,6 s) y está *brillante* apenas ~24 % de él. Medido en navegador:
  encendidas por encima de 0,25 = **3–8 de 36** (antes 9–11 con el umbral viejo y
  ~18 con 0,05), máximo 0,5.
- **Glow**: `.flare` vuelve a ser un halo de dos capas (núcleo coral levantado
  hacia blanco, hombro corto, cola ancha) en un elemento de 34 px centrado en el
  punto. El tamaño y la cola son lo que devuelve el brillo difuso.
- **Contrato de test reescrito**: el umbral de "encendida" pasa a 0,25 (el crest),
  el test del pico exige `0.5` y tres niveles (reposo / marea / crest), el test de
  campana exige los cinco stops `0/38/50/62/100` y que la marea cubra > 4 s, y el
  test de población exige media ≤ 20 % de la banda y máximo ≤ 35 %.

### Verificación (T15)

- `pnpm test:all`: **147 pass / 0 fail**; `check:css` 74 514 B compilados,
  `@layer components` 29 795 B (bajo el techo de 29 900 — el gradiente de dos capas
  casi lo rompe y hubo que sacar un stop y acortar comentarios), `check:motion`
  limpio, eslint 0 errores.
- Navegador (Chromium, 1920×1000): `brightCounts` 0/1/3/4/5/7/8 a lo largo de 7 s,
  máximo 0,50; captura con halos suaves repartidos y pocas encendidas a la vez.

---

## Reapertura 6 — círculos en reposo y el costo de recargar (L11)

**L11** (request, verbatim): "quedaron unos circulos semi transpartentes y ahora
hay bugs en dev, no se que onda, tambien mi pc esta funcionando con mucho ruido,
como si algo consumiera muchisimo cada que recargo la web".

### Diagnóstico

- **Círculos**: el halo de 34 px a 4 % de reposo se leía como disco gris sobre el
  campo. No era un artefacto: eran los 36 flares en reposo, con la huella que les
  di en L10.
- **Consumo al recargar**: la dispersión corría 3,2 s a display rate *siempre*, y
  una recarga sin interacción no tiene nada que dispersar. Medido con contador de
  draws: **3 964 draw calls y último draw a los 3 329 ms** después de cargar.
- **Bugs en dev**: no aparecen. El log del servidor no tiene errores ni warnings
  más allá del cartel de React DevTools, y una carga limpia en Chromium da
  `errors: []`. Lo más probable es estado viejo de Fast Refresh en la pestaña
  abierta mientras edité diez archivos.

### Cambios

- Disco a **28 px** (`margin -14px`) y reposo **0,04 → 0,02**: el halo conserva la
  cola ancha en el bloom y deja de verse cuando el punto duerme.
- **Guard de dispersión**: `this.touched` se marca en `render()` sólo cuando
  `Mouse.mouseMoved` (que se limpia solo a los 100 ms) o `Mouse.hasUserControl`, y
  `phaseFor()` manda a `frozen` en cuanto pasa `SETTLE_AFTER_MS` si nadie alimentó
  el dye. Una recarga sin interacción ya no simula nada.

### Verificación (T16)

- Recarga sin interacción: **508 draw calls, último a los 120 ms** (antes 3 964 a
  3 329 ms).
- Con interacción: 1 296 draws en los primeros 1 200 ms (display rate completo) y
  estacionado a los ~3,55 s, como estaba diseñado.
- `pnpm test:all`: 147 pass / 0 fail, `check:css` OK (29 795 B), eslint 0 errores.
- Navegador 1440×900 en reposo: 29 de 36 flares en su nivel de reposo, caja de
  28×28, captura sin discos grises.
