# responsive-system-pass — pulir responsive y consistencia de render

Feature branch: `feat/prod-polish` (continúa el trabajo del portfolio listo para prod; sin push).
Alcance: sistema responsive completo (320–1920), consistencia de primer render del fondo, y
verificación medible. No re-tematiza: extiende el diseño del deploy (`https://ciucani.vercel.app/`).

## Specs

**S1 — Responsive pulido, no mayormente roto.** Texto del usuario, verbatim:
> pasa que, aunque este modelo sea un poco mas pesado, es mas responsivness. aunque le falta bastante. dicho eso. quiero que trabajes y pulas toda la web y el sistema responsivness.

El field WebGL se queda en todos los dispositivos (decidido en L23: el costo de bytes y TBT se acepta
a cambio de que el fondo responda). Criterio de aceptación medible, en 320/360/390/414/480/600/768/834/
1024/1280/1440/1920: `scrollWidth == clientWidth` (cero scroll horizontal), ningún bloque de texto
escapa el ancho de su contenedor, ningún objetivo interactivo mide menos de 24×24 px (WCAG 2.5.8 AA) y
44×44 en puntero grueso, y ninguna decoración tapa copy de lectura.

**S2 — El primer render no cambia de forma.** Texto del usuario, verbatim:
> además, creo que estas haciendo lazy loading con la web, causando sobrecarga con los shaders, los textos, las sombras, etc. creo que lo mejor seria que el skeleton, o minimqmente los textos se rendericen de antemano para evitar inconsistencias visuales.

Todo texto visible tiene que estar en el HTML servido (visible sin JS), y el fondo no puede cambiar de
forma después del primer paint: la retícula coral que se pinta en HTML se mantiene como capa base y el
canvas entra con un cross-fade cuando presenta su primer cuadro. Ningún texto ni sombra puede aparecer
"después" por hidratación.

**S3 — Render en servidor con React.** Texto del usuario, verbatim:
> ademas esta web tiene que ser server side rendering, para eso utilizamos react...

El HTML servido lo renderiza React en el servidor y contiene la copia de la página; se documenta el
mecanismo real (SSG con `getStaticProps` en `src/pages/*`) y se prueba con evidencia (HTML sin JS +
captura con `javaScriptEnabled: false`). Lo único que puede llegar por chunk diferido es el shader.

**S4 — Gates en verde, deuda declarada.** `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm e2e:a11y`,
`pnpm e2e:motion`, `pnpm e2e:runtime`, `pnpm check:motion`, `pnpm validate:bebop`; y
`pnpm measure:vitals` medido y reportado (con el shader en teléfono el presupuesto de JS/TBT queda como
deuda conocida de L23, no como verde).

**S5 — Extender, no re-tematizar.** Paleta, tipografías, componentes y orden de secciones quedan.
Solo se toca lo que las reglas de S1/S2/S3 exijan, y cada cambio se justifica con la medición que lo
provocó.

**S6 — Artefactos en inglés.** Código, comentarios y commits en inglés; copy de UI sin cambios salvo
que un defecto responsive lo exija.

## Tasks

| ID | Specs | Ruta | Commit |
|---|---|---|---|
| T1 | S1 | inline — `.hero-title` ya no escapa el shell (196 px a 1920) | DONE · `d1915a4` |
| T2 | S1 | inline — `.lang-link` y `.footer-links a` con objetivo ≥24 px | DONE · `d1915a4` |
| T3 | S2 | worker `gentle-ai-worker` — retícula base + cross-fade del canvas | **REVERTIDO** · `d1915a4` → ver L3 |
| T4 | S1 | inline — filas de trabajo a ancho completo bajo 560 px | DONE · `d1915a4` |
| T5 | S1, S3 | inline — evidencia: barrido, sin JS, cross-fade | DONE · `d1915a4` |
| T6 | S4 | inline — gates y vitals | DONE · `d1915a4` |

## Evidencia inicial (2026-10-31, build `Rf48BOhCZ9rsKWQIom6iZ` en `:3001`)

Barrido Playwright (`.resp-sweep.mjs`, 12 anchos, 2.2 s de settle):

| ancho | scrollW−vw | defecto |
|---:|---:|---|
| 320–834 | 0 px | sin scroll horizontal; `pageH` 6 616–7 928 px |
| 1024–1440 | 0 px | h1 escapa su contenedor (1342 px dentro de 1255) pero no el viewport |
| 1920 | **+196 px** | `section.hero > .site-shell` se desborda: el `h1` mide 1793 px dentro de un shell de 1280 px centrado |

- `.hero-title` usa `width: min(30ch, calc(100vw - gutter))`: el término `100vw` asume que la caja
  arranca en x=0, pero arranca en el borde del shell centrado (x≈317 a 1920), así que
  `317 + 1793 = 2110 = scrollWidth`. A 1440 el mismo error da 87 px y queda oculto por el viewport.
- `LanguageSwitcher`: cada opción mide **27×21 px** (`text-[0.625rem] px-1.5 py-0.5`) → bajo el mínimo
  AA de 24×24.
- El swap de fondo (`LiquidEther` reemplaza a `.bocanada-sparks`) es el cambio de forma que el usuario
  percibe como "lazy loading": la retícula CSS (48 px, dots planos) se sustituye por la del shader
  (~400 ms después, con flare), dos geometrías distintas sin transición.
- SSG confirmado: `curl :3001/` (75 231 B) ya trae hero, lead, email y footer; `canvas` no aparece
  (WebGL necesita JS) e `is-pending` tampoco (nada oculto en el HTML).

## Results (2026-10-31, build `tm2G3m5O8gj3a9aOoYcc5` en `:3001`)

**T1 — el titular ya no escapa el contenedor.** `width: min(30ch, calc(100% + (100vw - 100%) / 2 - 0.75rem))`:
el espacio que puede tomar se mide desde su propio borde izquierdo (la mitad de lo que el shell deja a
cada lado) en vez de asumir x=0. Medido con un `style` inyectado, tres candidatos:

| ancho | antes (right / líneas) | `100% + half-gutter` | **elegido** (`100% + (100vw − 100%)/2`) |
|---|---|---|---|
| 390 | 356 / 3 | 380 / 3 | 375 / 3 |
| 768 | 759 / 2 | 649 / **3** | 753 / 2 |
| 1440 | 1431 / 2 | 1226 / **3** | 1425 / 2 |
| 1920 | **2110 / 2** (desborda 190) | 1479 / 3 | **1905 / 2** |

El corte dictado del titular se mantiene (2 líneas a 768/1440/1920) y el 1920 deja de desbordar.

**T2 — objetivos táctiles.** `.lang-link` (24 px, 44 px en `pointer: coarse`) y `.footer-links a`
(22 px → 24 px con `inline-flex`): el barrido pasa de `smallTap:10` (con falsos positivos de `.sr-only`)
a **0 objetivos bajo 24×24** en los 12 anchos.

**T3 — el fondo no cambia de forma después del primer paint.** La retícula coral se sirve en el HTML
sin gate de estado y el canvas entra encima con un cross-fade de 600 ms disparado por `onFirstFrame`
(callback nuevo en `LiquidEther`, invocado después del `render()` del primer frame presentado, con
guarda por montaje y anulada en `dispose()`). Muestreo de opacidades en `:3001`:

| t | `.field-sparks` | `.field-canvas` | `is-live` |
|---:|---:|---:|---|
| 125 ms | 0.550 | — (sin canvas) | no |
| 403 ms | 0.129 | 0.766 | sí |
| 1 203 ms | 0 | 1 | sí |
| 3 011 ms | 0 | 1 | sí |

**T4 — filas de trabajo a 320 px.** Bajo 560 px la fila tenía tres columnas y la copia quedaba en
~160 px (25 ch). Ahora el thumb va arriba, número y flecha en una línea, y el cuerpo ocupa el ancho
completo: la descripción pasa de 4 líneas de dos palabras a 2–3 líneas legibles y los tags entran en una.

**T5 — evidencia de render en servidor (S3) y de primer render (S2).** Con `javaScriptEnabled: false`
contra el build de producción: `h1` = "I build your software,end to end" **visible**, `.lead` visible,
1 `mailto:`, `.bocanada-sparks` presente con opacidad 0.55 y **0 canvas**. El HTML servido (75 kB) ya
trae hero, lead, email y footer: la copia la renderiza React en el servidor; lo único diferido es el
chunk del shader.

**Barrido final, 12 anchos (320→1920):** `scrollWidth == clientWidth` en todos, `elsOver` 0 sin falsos
positivos, `smallTap` 0, `clipped` 0, `canvas` 1 por viewport, cero errores de consola. La única
superposición decorativa medida (cluster `.orn` contra glifos reales) da **0 px² a 1440** y 629 px² a
1024 (una esquina de 22×22), que no toca copy.

**Gates** (contra el build de producción `:3001`, con `browser-verify` apuntado por un root temporal):
lint 0 · test **31/31** · check:motion 0 · validate:bebop 0 · e2e:runtime **7 OK** · e2e:a11y **16 OK** ·
e2e:motion **13 OK**.

**Vitals (deuda declarada, no regresión de este pase):** teléfono 390×844, CPU 4x, 4G →
`/` LCP 336 ms · CLS 0.000 · TBT 392 ms · JS 399 kB; `/es` 324/0.000/415/399; `/pt` 324/0.000/385/399.
Sigue fallando `TBT ≤ 300 ms` y `JS ≤ 260 kB` por la decisión de L23 (shader en teléfono), igual que
el deploy (410 kB / TBT 419–444 ms). No empeoró con este pase.

## Log
**L1 — pedido del usuario, verbatim (2026-10-31).**
> pasa que, aunque este modelo sea un poco mas pesado, es mas responsivness. aunque le falta bastante. dicho eso. quiero que trabajes y pulas toda la web y el sistema responsivness. además, creo que estas haciendo lazy loading con la web, causando sobrecarga con los shaders, los textos, las sombras, etc. creo que lo mejor seria que el skeleton, o minimqmente los textos se rendericen de antemano para evitar inconsistencias visuales. ademas esta web tiene que ser server side rendering, para eso utilizamos react...

Decisión de lectura: el modelo "más pesado" (field WebGL en teléfono, L23) queda; lo que se corrige es el
sistema responsive y la consistencia del primer render. "SSR" se interpreta como el contrato de S3
(el HTML lo renderiza React en el servidor, con la copia dentro), no como cambiar SSG por SSR por
request.

**L2 — cierre del pase, con lo que queda abierto (2026-10-31).**
Leído el pedido de L1 como S1/S2/S3 y ejecutado T1–T6. Lo que **no** se tocó, a propósito: el field
WebGL en teléfono (decisión de L23), la copia y la paleta. Lo que queda abierto y es del usuario:
1. El dev server de `:3000` quedó con SSR viejo y hay que reiniciarlo para que hidrate sin mismatch.
2. El presupuesto mobile (JS ≤ 260 kB · TBT ≤ 300 ms) sigue en deuda mientras el teléfono monte el
   shader; es el mismo trato que el deploy.
3. `.orn` roza los glifos del hero a 1024 px (629 px²). Sin impacto legible medido; no se tocó.

## Log

**L3 — el cross-fade duplicaba la retícula (regresión de T3, 2026-10-31).**
El dueño reportó: *"se te duplicaron los puntos del fondo"*. Correcto, y la causa es de diseño: T3 dejó
la retícula CSS dibujada **debajo** del canvas y la apagaba con `is-live`, así que existía un estado en
el que las dos retículas se pintan juntas — y **no comparten origen**: la CSS es una grilla de 48 px en
(0,0), la del shader arranca en otro offset (medido en el perfil teléfono: columnas en 71, 215, 359,
503 px de dispositivo, período 144 px = 48 CSS px). Reproducido forzando `.field-sparks{opacity:.55}`:
la masa de píxeles coral pasa de **1 141 a 3 014** en el mismo recorte, es decir dos grillas corridas.

**Decisión: una sola retícula, nunca dos.** Se revierten `AppBackground.jsx` y `LiquidEther.jsx` a
`8164756` (capas exclusivas: canvas cuando hay WebGL, retícula CSS cuando no) y se borran `.field-sparks`,
`.field-canvas` e `is-live` del CSS. Se pierde el cross-fade; se gana que la duplicación sea imposible
por construcción. Verificado en 320/390/768/1440/1920: `.bocanada-sparks` en el DOM = **0** con canvas
presente, `canvas` = 1, sin overflow, sin objetivos < 24 px, cero errores de consola, a11y **16 OK**.
El conteo de puntos coincide con el deploy en el mismo perfil (misma grilla, mismas columnas).

**Deuda que este cambio NO toca** (existe igual en el deploy, verificado con WebGL bloqueado en ambos:
`sparks 0 · canvas 0`): si el navegador expone WebGL pero la creación del contexto falla —Brave con
escudos, driver roto—, `canUseWebgl` queda en `true`, `LiquidEther` no logra renderer y el campo queda
sin retícula. Arreglarlo pide un callback de fallo desde `LiquidEther` (`onUnavailable`) que devuelva el
control a la capa CSS; no se hizo en este turno para no volver a introducir dos retículas a la vez.

**L4 — fallback de WebGL perdido: implementado (2026-10-31).** `LiquidEther` acepta `onUnavailable` y
lo reporta una sola vez por montaje desde dos lugares: el `try/catch` que envuelve la creación del
`WebGLManager` (contexto rechazado) y un listener `webglcontextlost` en el canvas (GPU reiniciada o
contexto perdido después de arrancar). `AppBackground` guarda `webglFailed` y en ese caso no monta el
canvas y devuelve el campo a la retícula CSS — capas exclusivas, nunca las dos.

Tres escenarios medidos en `:3001` (390×844 @DPR2), con el recorte de campo contando píxeles coral:

| escenario | `.bocanada-sparks` | `canvas` | errores de página | píxeles coral |
|---|---:|---:|---|---:|
| normal | 0 | 1 | 0 | — (shader) |
| contexto rechazado (`getContext('webgl') → null`) | **1** (op. 0.55) | **0** | **0** | 887 |
| `webglcontextlost` después de arrancar | **1** (op. 0.55) | **0** | **0** | 887 |

Antes de este fix, el caso "contexto rechazado" dejaba `sparks 0 · canvas 0`: fondo sin retícula y un
error de página. Gates tras el cambio: lint 0 · test 31/31 · a11y 16 OK · motion 13 OK · runtime 7 OK.

**L5 — el humo ya no rastrea los dedos en mobile (2026-10-31).** Pedido del dueño al revisar el fondo
restaurado: *"devolviste el fondo y los shaders originales del live de prod, pero no tuviste en cuenta de
sacar el humo que rastrea los toques en mobile"*. `LiquidEther` gana `touchSmoke` (default `false`): los
handlers `touchstart`/`touchmove` del cursor de la simulación vuelven sin tocar `coords`, así que el tinte
no sigue al dedo. El puntero fino sigue igual.

Prueba A/B con arrastre sintético sobre el mismo recorte de campo (390×844 @DPR2, diferencia de luminancia
antes/después del gesto):

| gesto | mean | max | px con Δ>12 |
|---|---:|---:|---:|
| arrastre táctil (CDP `dispatchTouchEvent`) | **0.03** | 11 | **0** |
| arrastre de mouse (control: el método sí ve una pluma) | 7.58 | 22 | 79 475 |
| deploy, arrastre táctil (referencia) | 0.47 | 6 | 0 |

El control con mouse prueba que la medición detecta una pluma cuando existe; el arrastre táctil ya no
deja ninguna. Gates: lint 0 · test 31/31 · a11y 16 OK · motion 13 OK · build 0.
