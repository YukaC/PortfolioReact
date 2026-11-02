# about-perf — sacar el costo de About sin perder la estética

Feature branch: `feat/audit-program`. Alcance: eliminar el trabajo por frame que
About hacía en mobile. En desktop no cambia nada: ahí los dos scrubs siguen.

## Specs

**S1 — En mobile no corre el scrub de About.** El brief del dueño es explícito: el
movimiento de las letras es de PC. `AboutScroll` no registra nada cuando
`hasFinePointer()` es falso, así que ni el statement palabra por palabra ni el
rail de la timeline escriben por frame en un teléfono.

**S2 — El estado final lo debe el CSS.** Sin scrub nadie escribe `--tlp` ni
`.is-on`, y la base deja el statement al 16 % de opacidad y el rail en
`scaleY(0)`. El stylesheet tiene que entregar el estado terminado — statement
encendido, rail dibujado, puntos encendidos — bajo `pointer-coarse`, igual que el
bloque `(scripting: none)` ya promete para una página sin script.

**S3 — Desktop intacto.** Con puntero fino, el statement arranca apagado y el rail
en `scaleY(0)`, y ambos se animan con el scroll como antes.

**S4 — El costo baja de forma medible.** Criterio: `about` p95 medido con
`probe sections --device phone-3x --dpr 3 --gl sw` baja de 50.1 ms a ≤ 33.4 ms, y
el p95 de la página no empeora.

## Tasks

| ID | Specs | Ruta | Commit |
|---|---|---|---|
| T1 | S4 | inline | medición de ablación (delegada): timeline vs retrato vs statement vs socials |
| T2 | S1, S2 | inline | `perf(about): hand a coarse pointer the finished state and no scrub` |
| T3 | S3, S4 | inline | verificación: estado de las tres piezas en mobile y desktop + `sections` |

## Log

**L1 — pedido del dueño (verbatim).**

> ataca el about entonces para poder optimizarlo sin perder la estetica, recorda que el movimiento de las letras en mobile no estará activo. solo en pc. que mas me queda por fixear a mi?

**L2 — el culpable no era el statement.** Ablación a 430×932 DPR 3 en raster por
software, tres corridas por variante cuando hubo empate:

| variante | about p95 | about avg | about slow32 |
|---|---|---|---|
| baseline | 50.1 / 50.0 / 50.1 | 29.7 / 27.6 / 28.2 | 22 / 20 / 21 |
| sin timeline | **33.4 / 33.4 / 33.4** | 24.7 / 25.9 / 24.5 | 14 / 15 / 15 |
| sin retrato | 33.4 / 66.7 / 33.4 | 28.1 / 29.7 / 28.7 | 21 / 22 / 22 |
| sin statement | 50.0 | 26.8 | 14 |
| statement plano (candidato) | 49.9 | 28.5 | 23 |

El retrato empató en una corrida y el repeat lo desmintió (66.7 = baseline). El
scrub del statement **no cuesta el p95**: aplanarlo no movió nada; lo que aporta
es pintura, no animación. El rail de la timeline sí era la cuenta entera.

**L3 — trampa del compilador.** El primer intento puso `@variant pointer-coarse`
suelto a nivel de bloque y **Tailwind lo descartó en silencio**: el CSS creció,
el check pasó, y en el navegador no había ninguna media de puntero (las 20
palabras seguían a 0.16 y el rail en `scaleY(0)`). La forma que sí compila es
anidar la variante **dentro** de cada regla, que es como el resto del archivo la
usa. Verificado en el DOM: mobile 20/20 palabras encendidas, rail
`matrix(1,0,0,1,0,0)`, punto celeste; desktop 0 encendidas, rail `scaleY(0)`,
punto en ink.

**L4 — resultado.** `about` p95 **50.1 → 16.7 ms**, avg 29.7 → 17.7 ms, y el p95
de la página 33.4 → **16.8 ms** (presupuesto ≤ 24). `portfolio` y `contact`
también bajaron a 16.8 al pasar por el mismo perfil. `@layer components` crece
472 B; baseline y techo de `scripts/css-budget.json` re-registrados con esta
razón.
