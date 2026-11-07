# testinG82 — el Moto g82 5G como dispositivo de prueba

Ficha del teléfono en el que aparece el bug del flick, y cómo probar el rendimiento de
cualquier web contra él: qué se puede emular en la PC, qué no, y cómo medir en el
teléfono real. Datos leídos del equipo por `adb` y desde la página el 7 nov 2026.

## 1. Ficha del dispositivo

| Campo | Valor |
|---|---|
| Modelo | Motorola moto g82 5G (`rhodep`, serie `ZY22FMNLPX`) |
| Android | 13 (build `T1SUS33.1-124-6-16`) |
| SoC | Qualcomm Snapdragon 695 5G (`SM6375`), 6 nm |
| CPU | 8 núcleos: 2 × Cortex-A78 a 2,21 GHz + 6 × Cortex-A55 a 1,80 GHz |
| GPU | Adreno 619, OpenGL ES 3.2 (driver V@0530.47, oct 2022) |
| RAM | 6 GB (5,6 GB visibles para el sistema) |
| Pantalla | pOLED 6,6", 1080 × 2400 px, **120 Hz** |
| Densidad | física 400 dpi, **configurada en 492** (tamaño de pantalla agrandado en Ajustes) |
| Navegador | Brave 1.98.63 (Chromium 156.0.8078.80) |

### Lo que ve una página web

| Campo | Valor |
|---|---|
| `devicePixelRatio` | **3,075** (492 / 160) |
| Viewport CSS con la barra de URL | **351 × 620** |
| Viewport CSS sin la barra (`100lvh`) | 351 × 748 |
| `100svh` / `100lvh` | 620 / 748 |
| `screen` | 352 × 781 |
| Puntero | `(pointer: coarse)`, `(hover: none)`, 5 puntos táctiles |
| `prefers-reduced-motion` | no |
| `MAX_TEXTURE_SIZE` WebGL | 4096 |
| User-Agent | `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36` |

Brave falsea algunas señales a propósito (anti-fingerprinting): `hardwareConcurrency`
da 6 en lugar de 8 y el renderer WebGL dice `Brave` en lugar de Adreno 619. No uses
esos valores para detectar el equipo.

**Ojo con la densidad 492.** Con la densidad de fábrica (400) el viewport sería
432 px de ancho con DPR 2,5. Con 492 es 351 px de ancho con DPR 3,075: hay más
píxeles de dispositivo por cada píxel CSS y cada baldosa cuesta más rasterizarla.
Para emular *este* teléfono hay que usar 351 / 3,075, no los valores de catálogo.

## 2. Dónde está el cuello en este teléfono

Medido con trazas en el teléfono real, durante flicks táctiles:

- El hilo principal no es el problema típico. Lo caro es el **raster en GPU**: con un
  contenido pesado, una sola baldosa del contenido llegó a tardar 106 ms en la Adreno
  619, y en la GPU hubo tareas de hasta 85 ms.
- Lo que más cuesta rasterizar en la Adreno: **`text-shadow` con blur grande** (un blur
  de 24 px son 74 px de dispositivo por línea de texto), seguido de filtros y blends a
  pantalla completa.
- Con 120 Hz, el compositor quiere un frame cada 8,3 ms. En un flick avanza varias
  pantallas por segundo, y si el raster no da abasto se ve lo que haya debajo (el
  fondo fijo) donde todavía no hay contenido dibujado: *checkerboarding*.
- La barra de URL de Brave entra y sale con cada flick y cambia el viewport entre
  620 y 748 px de alto.

## 3. Qué se puede emular en la PC y qué no

| Aspecto | ¿Se emula en DevTools? | Cómo |
|---|---|---|
| Tamaño, DPR, táctil, UA | Sí | Perfil de dispositivo propio (abajo) |
| Media queries `pointer`/`hover` | Sí | Con el modo dispositivo móvil y táctil activo |
| CPU del hilo principal (JS, estilo, layout) | Aproximado | Throttling de CPU de DevTools |
| Red | Sí | Throttling de red |
| **Raster en GPU / compositor** | **No** | Sólo en el teléfono real |
| Barra de URL que se esconde | No | Sólo en el teléfono real |
| Refresco de 120 Hz | No (salvo monitor de 120 Hz) | — |

**Por qué el throttling de CPU no alcanza.** `Emulation.setCPUThrottlingRate` (el "20×"
de DevTools) frena sólo el hilo principal del renderer. El raster de baldosas corre en
los workers y en la GPU de la PC, a velocidad completa. En la PC, con 20× y memoria de
GPU realista, el portfolio daba un 2–4 % de frames con huecos de una baldosa. En el
teléfono los huecos duraban casi un segundo.

**La trampa de estrangular la memoria de GPU.** Con
`--force-gpu-mem-available-mb=4` sí aparecen huecos en la PC (83 % de los frames),
pero miden otro problema: falta de memoria para baldosas, que el g82 no tiene. Un
arreglo que mejora ese número no tiene por qué mejorar el teléfono. Pasó en este
repo: −78 % en ese arnés y el bug seguía en el teléfono.

### Perfil de dispositivo para DevTools (Chrome/Brave/Edge en la PC)

DevTools → ⋮ → Settings → Devices → *Add custom device*:

- Nombre: `Moto g82 (densidad 492)`
- Ancho × alto: **351 × 620** (con la barra de URL). Repetí con 351 × 748.
- Device pixel ratio: **3.075**
- User agent: el de la tabla de arriba, tipo *Mobile*
- Tipo: Mobile, con touch

CPU: el throttling de DevTools sirve para JavaScript, hidratación y layout. Calibralo
con la opción *Calibrate* de DevTools (Performance → CPU) contra este teléfono, en lugar
de usar un número fijo. Tratalo como una cota para el hilo principal y nada más.

Referencia medida (7 nov 2026, build de producción `/es`): el LCP real del g82 sin
caché es 364–444 ms. Emulado en la PC da 0,30 s con 4× y 1,38 s con 20×, así que el
teléfono rinde como un **~5–6×**, no como 20×. Con 20× todo sale unas cuatro veces
peor que en el teléfono. Medí siempre contra `next build && next start`: `next dev`
suma ~0,9 s de TTFB y React sin optimizar.

Con Playwright:

```js
const context = await browser.newContext({
  viewport: { width: 351, height: 620 },
  deviceScaleFactor: 3.075,
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36",
});
const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 }); // calibrar, ver arriba
```

## 4. Medir en el teléfono real (lo único que ve el raster)

### Conectar

1. En el teléfono: Opciones de desarrollador → **Depuración por USB** activada. Enchufar
   y aceptar la huella de la PC.
2. En la PC:

   ```sh
   adb devices                                   # debe listar ZY22FMNLPX  device
   adb forward tcp:9222 localabstract:chrome_devtools_remote
   curl -s http://127.0.0.1:9222/json/version    # "Android-Package": "com.brave.browser"
   ```

   Brave usa el mismo socket que Chrome (`chrome_devtools_remote`). Si Chrome también
   está abierto en el teléfono, cerralo para no conectarte al navegador equivocado.
3. El teléfono tiene que llegar al servidor de la PC por la red (en este setup:
   `http://100.120.254.30:<puerto>`). Mide siempre un build de producción
   (`next build && next start`), nunca `next dev`.

### Inspeccionar a mano

`chrome://inspect` (o `brave://inspect`) en la PC → la pestaña del teléfono → *inspect*.

- **Performance** con *Screenshots* y *Enable advanced paint instrumentation*: grabar
  dos o tres flicks con el dedo. En los frames donde el screenshot muestra huecos,
  mirar los hilos: raster/GPU ocupados con el principal libre → cuello de raster.
- **Rendering → Paint flashing / Layer borders** y el panel **Layers**: qué capas hay
  y qué se repinta durante el scroll.

### Medir por script (CDP sobre el puerto reenviado)

Con Playwright `chromium.connectOverCDP("http://127.0.0.1:9222")` se maneja la pestaña
del teléfono. La receta que encontró el bug:

1. `Tracing.start` con las categorías `cc`, `gpu`, `viz`, `toplevel`, `benchmark`,
   `disabled-by-default-cc.debug`, `disabled-by-default-devtools.timeline`.
2. Flicks reales por toque desde el compositor:

   ```js
   await cdp.send("Input.synthesizeScrollGesture", {
     x: 175, y: 430, yDistance: -6000, speed: 20000,
     gestureSourceType: "touch", preventFling: false,
   });
   ```

3. `Tracing.end` y contar:
   - `TileBasedLayerImpl::AppendQuads checkerboard` (`args.missing_tile_count`): frames
     dibujados con baldosas sin rasterizar, o sea los huecos;
   - `RasterTask` por `args.tileData.layerId`: qué capa cuesta raster, y la baldosa
     más lenta;
   - `GPUTask` en `CrGpuMain`: el costo real en la GPU;
   - `ProxyMain::BeginMainFrame` en `CrRendererMain`: trabajo del hilo principal
     durante el scroll.
4. Para saber a qué nodo corresponde un `layerId`: `LayerTree.enable` →
   `layerTreeDidChange` → `DOM.describeNode({ backendNodeId })`.
5. **Ablaciones**: repetir la traza inyectando CSS (`page.addStyleTag`) que apague una
   sola cosa por vez (`text-shadow:none`, `box-shadow:none`, filtros, imágenes, una
   sección). Lo que más baja la GPU y los huecos es el culpable. Correr al menos dos
   veces cada variante: entre corridas iguales hay ±2 puntos de huecos.

### Valores de referencia de este portfolio (`/es`, 4 flicks de 6000 px a 20000 px/s)

| Estado | Frames con huecos | GPU total | Tarea GPU máx. |
|---|---|---|---|
| Halo de 24 px activo por error (antes del fix) | 16–18 % | ~1130 ms | 85 ms |
| Halo apagado en táctil (después del fix) | 8 % | ~600 ms | 13–23 ms |

## 5. Lista rápida para cualquier web

1. Emular en la PC (perfil de arriba) para layout, media queries y JS.
2. Si el problema es scroll, flick, fondo que "se come" el contenido o parpadeos:
   **ir directo al teléfono real**, porque la PC no lo reproduce.
3. En el teléfono, sospechar primero de lo que es caro de rasterizar en una Adreno 619 a
   DPR 3: `text-shadow`/`box-shadow` con blur grande, `filter: blur`, `backdrop-filter`,
   `mix-blend-mode`, máscaras y gradientes a pantalla completa, imágenes grandes
   decodificándose durante el scroll.
4. Comprobar en el estilo computado del teléfono que las reglas para táctil
   (`@media (pointer: coarse)`) realmente ganan la cascada. Una regla con un selector
   más corto pierde por especificidad sin avisar.
