# dependency-security-update — los 35 avisos de Dependabot, sin romper el sitio

Feature branch: `feat/audit-program`. Alcance: los avisos que GitHub reporta sobre
`main` (2 críticos, 14 altos, 15 moderados, 4 bajos) y lo que hace falta para que
el merge del branch sea defendible. **No** es una actualización de todo el árbol a
`latest`: cada salto se paga con un gate.

## Specs

**S1 — Los dos críticos son de `next` y aplican a este sitio.** El pedido,
verbatim: "actualiza esas dependencias en esta branch para despues poder hacer el
merge correctamente. estas updates rompen o cqmbian aalgun funcionamiento?".
`next@16.3.6` está dentro del rango vulnerable de dos avisos críticos (RCE sin
autenticar en Image Optimization y en `use cache`) y de 11 avisos más de `next`.
Este repo usa `next/image` en `About`, `SiteLogo` y `WorkList`, así que el primero
aplica de verdad; `use cache` no se usa en ningún lado.

**S2 — El resto son transitivas de desarrollo, no del runtime.** `brace-expansion`,
`minimatch`, `qs`, `body-parser`, `express`, `zod` vienen de `eslint` y `shadcn`
(devDependencies); `undici`, `source-map-js`, `deepmerge`, `systeminformation`,
`ip-address`, `fast-uri` cuelgan de la cadena de build/CLI. Se arreglan igual — no
cuestan runtime — pero por override acotado, nunca saltando un major de una
herramienta que el repo usa.

**S3 — Un solo salto de major, y no en runtime.** `eslint 9 → 10` es el único
major disponible; el repo tiene flat config con `eslint-config-next`, así que
saltarlo es un cambio aparte, no parte de un parche de seguridad. Se queda en 9.

**S4 — Nada se declara "no rompe" sin gate.** La respuesta a la pregunta del
dueño se gana con evidencia: `pnpm test:all` (lint, unit, `check:css`,
`check:motion`, Bebop), `pnpm build` (el sitio prerenderiza `/`, `/es`, `/pt`), y
las suites e2e contra el build servido. Lo que ninguna suite mire — el easter egg
WebGL, el campo — se verifica a ojo con captura, no con fe.

**S5 — El lockfile es el cambio; el árbol no se toca sin razón.** Si un salto
dentro de rango rompe algo, se fija la versión anterior de ese paquete y se dice
cuál y por qué, en vez de dejar el gate en rojo.

## Evidence

Gates after the update, against the built site served on :4173:

- `pnpm test:all`: `node --test src/lib` **145/145**, `check:css` sin drift,
  `check:motion` limpio, invariantes de Bebop OK. `eslint`: 0 errores (1 warning
  previo en `src/perf/meter.js`).
- `pnpm build`: OK, 30 páginas, `/`, `/es`, `/pt` prerenderizados.
- `pnpm e2e:a11y`: **47 OK · 0 FALLA**.
- `pnpm e2e:nojs`: **8 OK · 0 FALLA**.
- `pnpm e2e:functional`: **51 OK · 0 FALLA**, dos corridas seguidas.
- `pnpm visual:diff`: 15/45 tomas ≤ 0,1 %, peor 390/hero-out/pt 20,89 %.

Comparación antes/después (mismo repo, `git stash` de los tres archivos de
dependencias + `pnpm install --frozen-lockfile` + build):

| gate | antes | después |
| --- | --- | --- |
| `test:all` | verde | verde |
| `build` | OK, 0 warnings de tracing | OK, 0 warnings (después de T3) |
| `e2e:functional` | 48 OK · 3 FALLA | 48 OK · 3 FALLA |
| `visual:diff` | 15/45 · peor 20,8941 % | 15/45 · peor 20,8941 % |

Los 3 fallos compartidos eran **previos** al update y no del sitio:
`filters/filter` clickeaba la tab "React" y exigía que angostara la lista, pero
los seis proyectos del snapshot son React (`MuniDgoSaaS` entra por `JavaScript`),
así que 6 → 6 es la respuesta correcta. El test ahora prueba la tab que sí
angosta ("Python", 6 → 1) en vez de un índice fijo. El `drawer/open` de `/es`
fallaba de forma intermitente: leía el estado a los 700 ms fijos y la animación
del panel no siempre había terminado; ahora espera el estado asentado con el
mismo assert.

Ojo con los totales de la tabla: la corrida "antes" usó el script previo, que
contaba 51 verificaciones (48 OK + 3 FALLA), y la "después" el script corregido,
que cuenta 51 (51 OK + 0). Lo comparable es el conjunto de fallos — los mismos
tres `filters/filter` en las tres rutas, y nada nuevo — no el número de OKs.

Lo único que el update cambió de verdad fue un **warning de build nuevo**
(`next` 16.4 estrena el analizador de tracing): `readProjectsSnapshot` y
`commitProjectsSnapshot` recibían la ruta por parámetro y el tracer concluía que
cualquier archivo era alcanzable, metiendo el proyecto entero —`public/`
incluido— en el output del servidor. Se separó el brazo estático del override de
test en el lector y se marcó el del escritor con `turbopackIgnore`, que es
justo lo que sugiere el aviso. El build vuelve a 0 warnings y `/projects.json`
sirve las 6 fichas.

## Tasks

- **T1** — `pnpm update` dentro de los rangos declarados y re-auditar (S1–S3).
  Ruta: inline.
- **T2** — Overrides acotados para lo que quede, mismo major (S2). Ruta: inline.
- **T3** — Gates: `pnpm test:all` + `pnpm build` (S4). Ruta: inline.
- **T4** — e2e contra el build + captura del campo y del easter egg (S4).
  Ruta: inline.
- **T5** — Commit autodescriptivo y push a la branch (S5). Ruta: inline.
- **T6** — Informe de qué cambia de comportamiento y qué no (S4). Ruta: inline.

## Log

**L1** (request, verbatim): "actualiza esas dependencias en esta branch para
despues poder hacer el merge correctamente. estas updates rompen o cqmbian aalgun
funcionamiento?".

**L2** (medición previa): `pnpm audit` → 36 avisos. Directos: `next@16.3.6`
(2 críticos + 8 altos/moderados con fix en ≥16.3.8, críticos en ≥16.4.1),
`eslint-config-next@16.3.6`. `pnpm outdated`: `next` 16.4.4, `eslint-config-next`
16.4.4, `tailwindcss`/`@tailwindcss/postcss` 4.3.4, `postcss` 8.5.32,
`react`/`react-dom` 19.3.1, `three` 0.185.1 (caret 0.x, no salta),
`@react-three/drei` 10.7.9, `@react-three/fiber` 9.8.2, `@react-three/postprocessing`
3.2.2, `postprocessing` 6.39.6, `lenis` 1.3.27, `shadcn` 4.23.0, `eslint` 10.14.0.

**L3** (resultado de T1+T2): 36 → **2** avisos, 0 críticos, 0 altos.
- Directos al último parche: `next` y `eslint-config-next` 16.3.6 → **16.4.5**
  (los dos críticos RCE y los 11 avisos de `next` quedan cerrados; el par se mueve
  junto porque `eslint-config-next` sigue la versión de `next`).
- Dentro de rango por `pnpm update`: `@react-three/drei` 10.7.9,
  `@react-three/fiber` 9.8.2, `@react-three/postprocessing` 3.2.2,
  `postprocessing` 6.39.6, `lenis` 1.3.27, `tailwindcss` y
  `@tailwindcss/postcss` 4.3.4, `shadcn` 4.23.0, `postcss` 8.5.32 (el override
  del workspace lo tenía clavado en 8.5.23).
- Overrides del workspace actualizados, no nuevos: `postcss` 8.5.23 → 8.5.32,
  `minimatch@3>brace-expansion` 1.1.18 → **1.1.21**, `minimatch@10>brace-expansion`
  5.0.9 → **5.0.12**. Cierra los 6 avisos de `brace-expansion` sin cruzar el major
  de minimatch, que es justo lo que el comentario del archivo avisaba.
- Se queda sin tocar: `minimatch` (moderado, dev): las copias del árbol son 3.x
  (eslint) y 10.x (ts-morph vía shadcn); el fix pide ≥11.0.1 y ese major no es
  compatible con el consumidor 3.x. `deepmerge` (bajo, dev): el fix (4.3.2) no está
  publicado — `pnpm view` devuelve 4.3.1 como última, y su único consumidor es
  `@shadcn/registry`.
