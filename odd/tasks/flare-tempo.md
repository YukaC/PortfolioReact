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

**S2 — Una respiración por flare = 8 beats.** La decisión derivada, con la
recomendación que el dueño aceptó ("hacelo para que coincida con la cancion y
listo… si no que me recomendarias?"): un latido por beat a 128 BPM son 2,13 Hz, y
con 36 puntos y el techo de 1–4 encendidos eso obliga a un destello de <50 ms.
Ocho beats son exactamente dos compases 4/4 y 16 respiraciones por minuto, la
frecuencia de una respiración humana calma. `--breath: calc(8 * var(--beat))`, y
el `8` es la única perilla para apurar o calmar el campo.

**S3 — Las fases se reparten en negras subdivididas, no en segundos.** Cada
`--delay` es un slot entero de la grilla de 1/32 de negra (58,59 ms a 128 BPM), 64
slots en la respiración, repartidos en orden de razón dorada para que **todo
prefijo** (los 6 del teléfono, los 36 del escritorio) quede esparcido. Onset y
pico de cada flare caen en esa grilla: el campo está en tempo, no "cerca" del
tempo.

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
