# Feature: aesthetic-repair

Reparar lo que quedó roto tras el cierre del rebrand glass-motion: la copia
runnable del repo quedó parada sobre un slice de review (sitio a medio migrar,
secciones en negro y un 500 de `next dev`), y sobre el diseño completo quedan
defectos de layout en viewports chicos.

## Specs

- **S1 (pedido, verbatim)** — "retomá las ultimas sesiones (creo que tambien
  habia un handoff.md y memoria persistente) investiga que se rompio y por que,
  fixea lo que se rompio esteticamente que son muchas cosas, luego termina con
  la verificacion, cada tanto anda comprimiendo la conversacion para no abultar
  el gasto de tokens. a medida que vayas haciendo cambios commitea".
- **S2 (pedido previo, verbatim)** — "fixea mi web que no la puedo iniciar en dev
  server": `next dev` tiene que arrancar y servir la página sin 500.
- **S3 (invariante)** — la rama que se sirve localmente es la que tiene el
  diseño completo (campo + hero + work + about + contact + footer + logo); un
  `slice/*` de la cadena de review no es estado servible.
- **S4 (invariante)** — todo commit de la cadena de slices compila solo: ningún
  módulo importado queda sin commitear en el mismo HEAD.
- **S5 (invariante)** — las listas separadas por punto medio no arrancan línea
  con el separador cuando envuelven (hero stackline en mobile/tablet).
- **S6 (invariante)** — el bloque de identidad del about no comprime el nombre ni
  el meta en columnas de 3 líneas en 390px.
- **S7 (invariante)** — `pnpm lint`, `pnpm build` y `pnpm e2e:a11y` (browser-verify)
  pasan en los viewports 1440 y 390, y `prefers-reduced-motion` deja todo quieto.

## Tasks

| ID | Spec | Task | Route | Commit |
|----|------|------|-------|--------|
| T1 | S2,S4 | Devolver `usePointerLight`/`useRevealOnEnter` al commit del slice 1 | inline | `01d1e01` |
| T2 | S3 | Consolidar `feat/agency-rebrand` con el diseño completo + logo y dejar el worktree ahí | inline | (sin commit: fast-forward a `b7d397b`) |
| T3 | S5 | Stackline: separadores con oportunidad de corte, sin huérfanos | inline | `e4a9e8b` |
| T4 | S6 | About: identidad en mobile sin columnas de 3 líneas | inline | `e4a9e8b` |
| T5 | S1 | Revisión de la pasada real (hover/foco/entrehierro) y fixes chicos | inline | `e4a9e8b` |
| T6 | S7 | Verificación final: lint, build, browser-verify, screenshots, reduced-motion | inline | — |
| T7 | S1 | Cierre: handoff, memoria, doc | inline | — |

## Log

- **L1** — pedido de reparación (sesión 2026-10-23), verbatim en S1.
- **T1 evidence** — `8db7b0b` importa en `Layout.jsx` dos hooks que recién se
  commitean en `8369d5d` (slice 2); el 500 era exactamente eso. Copiados
  verbatim desde `8369d5d` y commiteados sobre `slice/1-field`.
- **T2 evidence** — el worktree estaba en `slice/1-field` (primer slice de la
  cadena), donde `globals.css` ya es el sistema nuevo (2177 líneas) pero los
  componentes siguen siendo los viejos (`ProfileCard`, `ProjectsGrid`,
  `Experience`, nav/hero viejos): de ahí el campo a todo color con el resto del
  documento en negro. `feat/agency-rebrand` estaba en `e7cdf48`, sin el commit
  del logo; se fast-forward a `b7d397b`.
- **T3 evidence** — medido a 390px: antes el stackline era `display: flex` y el
  `::before` del punto viajaba con el ítem siguiente (`lineStarts: ["R", "·"]`);
  ahora es flujo inline con la oportunidad de corte después del punto
  (`lineStarts: ["R", "P"]`) y el punto queda al final de la línea anterior.
- **T4 evidence** — a 390px el nombre partía en 2 líneas y el rol en 3 dentro de
  una columna de ~122px: `.about-socials` tenía `width: 100%` (basis 100% en el
  flex), que le robaba el ancho al texto. Ahora las sociales toman su contenido
  (124px) y bajo 560px bajan a línea propia alineadas bajo el nombre: nombre 1
  línea, rol 1 línea, en 390 y en 768.
- **T5 evidence** — `.section-y h2 + .lead` no tenía margen: en contacto el lead
  arrancaba a 0px del titular. Ahora 24px (inerte en el header de work, donde el
  lead está pineado al `flex-end`). El mail gigante recupera el piso de 28px de
  la referencia (`clamp(28px, 6.2vw, 76px)`); medido sin overflow entre 320 y
  1920. Descartados como bug: el "hero lavado" (artefacto del headless, en Brave
  real `--hf` vuelve a 1.000), el preview de work (sigue al cursor) y el ancho
  del nav pill (shell + 1rem, igual criterio que la referencia).
- **T6 evidence (verificación delegada, gentle-ai-verify, read-only)** — consola
  0 errores en 1440/390 con scroll completo; foco: 12 paradas, todas con
  `outline: 2px` sky + `outline-offset: 4px`, sin trampa; reduced-motion:
  `--scy`/`--hf` quietos (0/1) antes y después de scrollear a 3000, sin
  transiciones ni animaciones, `.work-preview` oculto; contraste 9/9 AA
  (status 6.66 · titular 13.99 · lead hero 9.14 · stackline 7.52 · work problem
  8.96 · tags 6.45 · statement iluminado 16.82 · lead contacto 8.69 · footer
  8.05); overflow de documento −6px en 1440/768/390/320.
- **T6 fix (commit `033f72d`)** — dos defectos que la verificación destapó:
  la fila de filtros de work no entra en 320px y la sección la recortaba, así que
  el último tab quedaba inalcanzable (ahora la fila scrollea en horizontal, sin
  barra visible, y los 5 tabs se alcanzan y se presionan a 320px); el statement
  del about se ilumina por ScrollTrigger, y sin scripts quedaba entero en 1.48:1
  (ahora `@media (scripting: none)` lo deja en opacidad 1).
- **T6 cierre** — `pnpm lint` ✓ · `pnpm build` ✓ (Turbopack, 3 rutas, ISR 1h) ·
  `pnpm e2e:a11y` 16 OK / 0 FALLA sobre el dev server recién levantado · los cinco
  tips de `slice/*` resuelven todos sus imports `@/` (chequeo estático sobre el
  árbol de cada commit).
