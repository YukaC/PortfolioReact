# Feature: glass-surface-system

Un solo lenguaje de vidrio Bocanada para *todas* las superficies que flotan
sobre el humo (nav, cards, about, contact, footer), derivado de la receta ya
aprobada en `.glass-card`. No es un rebrand: extiende el sistema vigente
(faro `PortfolioReact/AGENTS.md` reglas 1–4).

## Specs

- **S1** — "mejora mi interfaz web para matchear con el fondo animado de smoke."
- **S2** — "siento que mis componentes ,cards, navbar, footer, etc quedaron desfasados del estilo de glasmorfismo."
- **S3** — Faro (`PortfolioReact/AGENTS.md` reglas 1–4 + `AGENTS.md` raíz Regla 0):
  extender el sistema visual Bocanada, nunca re-theme; no reescribir código que
  el brief no pidió; tipografía Manrope/Space Grotesk; paleta ink→ice; motion
  desde `src/motion/config.js`; `prefers-reduced-motion` honrado; legibilidad
  AA sobre humo se mantiene (ganada en `glass-identity-pass`).
- **S4** — "quiero algo más parecido a este estilo. segui este lineamiento para todos los componentes de la web:" + prompt de integración de 21st.dev `GlassCalendar` (`rounded-3xl`, `bg-black/20 backdrop-blur-xl border border-white/10`, texto blanco, `shadow-2xl`, glass anidado, tabs con pill sólida, gradiente `from-pink-500 to-orange-400`, divider `h-px bg-white/20`, deps `date-fns` + `lucide-react` + `framer-motion`, capa TS + `/components/ui` + `cn`).
  Alcance según las palabras del user: **guía de estilo para todos los componentes de la web**, no la inserción del calendario.

## Dirección vigente (re-brief S4, decisiones del user)

- Radio: superficies 12px, controles 8px, rail full-bleed recto (el user descartó 2px y 24px).
- Tinte: cobalto oscuro (el user descartó hielo claro). El "hielo" lo ponen el filo ice, el sheen y el escarchado del borde superior, no el relleno.
- Humo: intacto. Si algo baja de AA, se compensa con scrim/text-shadow y se reporta con números.
- Vidrio anidado (`.glass-nest`) para **agrupar controles**, no como decoración: tabs del nav, controles del carousel, acción de Contact.

## Direction (decidido, no preguntado)

Tres niveles del mismo vidrio, todos con la misma receta base (tinte
cobalto-hielo, hairline ice, sheen superior, radio 2px):

- `glass-rail` — barras: nav, drawer móvil, cierre del footer.
- `glass-panel` — superficies grandes: card destacada del hero, panels de
  About y Contact.
- `glass-tile` — cards de la grilla de trabajo.

`backdrop-filter` se reserva a `glass-rail`/`glass-panel`. Los tiles no lo
llevan **a propósito**: el campo de humo es de baja frecuencia (gradiente +
fluido suave), donde un blur de 20px es visualmente casi indistinguible y
caro — tinte + borde + sheen leen igual de vidrio sobre campo brillante.
Excepción: `.glass-blur` opt-in donde el fondo detrás sea de alta frecuencia.
Fallbacks: `prefers-reduced-transparency` (relleno sólido) y
`@supports not (backdrop-filter)`.

## Tasks

| ID | Spec | Task | Route | Commit |
|----|------|------|-------|--------|
| T1 | S1 S2 | Foundation: tokens `--glass-*` y primitivas `.glass-rail/.glass-panel/.glass-card/.glass-tile` en `globals.css` (`glass-blur` opt-in, fallbacks reduced-transparency y sin backdrop-filter); `.site-nav` pasa a ser una máquina de estado sobre los tokens del rail | inline | `a70d751` |
| T2 | S2 | Navbar: rail de vidrio cobalto (no banda negra) + drawer móvil de vidrio | inline | `a70d751` |
| T3 | S2 | Cards de trabajo: featured card y tiles sobre el sistema de vidrio | inline | `c5661e3` |
| T4 | S2 | About (Experience) y Contact: panels de vidrio, padding en vez de gap | inline | `1fce319` |
| T5 | S2 | Footer: cierre de vidrio (rail con filo arriba) + línea Bebop legible | inline | `3e825cb` |
| T6 | S3 | Legibilidad: `copy-veil` sin blur (el rectángulo), section rules fuera | inline | `7b29f29` |
| T8 | S3 S4 | Re-tokens: radio 12px / controles 8px / altura única 44px, hielo en filo + sheen + escarchado | inline | `80f98d5` |
| T9 | S2 | Geometría simétrica: About 6/6, featured 6/6, gaps y paddings de un solo paso | inline | `e62c6d6` |
| T12 | S4 | Rasgos del reference adoptados: `.glass-nest` (agrupar controles + pill sólida del vivo) en nav, carousel y Contact; blur 20→24px | inline | `eb4d67a` |
| T13 | S4 | **Bloqueada por decisión**: integrar `GlassCalendar` (implica `date-fns` + `lucide-react` + `framer-motion`, capa TS + `/components/ui` + `cn`) o tomarlo solo como guía de estilo | — | — |
| T10 | S3 S4 | Re-verificar AA (audit de contraste por peor píxel), build, browser 1440/768/390 + drawer, foco y reduced-transparency sobre el vidrio final | inline | — |
| T11 | — | Cierre: CHANGELOG, higiene de memoria (Engram obs 69 incluye el radio nuevo), reporte | inline | — |

## Log

- **L1** — "mejora mi interfaz web para matchear con el fondo animado de smoke. siento que mis componentes ,cards, navbar, footer, etc quedaron desfasados del estilo de glasmorfismo."
- L2 — Exploración: `.glass-card` existe pero solo lo usa la card del hero; `.site-nav` es una banda `ink/64%` + blur 14px (lee gris sobre el cobalto); `ProjectsGrid` no tiene superficie (imagen + texto suelto con `copy-veil`); `Experience` usa hairlines `item-rule`; `Contact` y `Footer` son texto plano; el drawer móvil es `bg-ink` opaco.
- L3 — Precedente: `glass-identity-pass` (commits `7bb978d`, `6770b16`) dejó la receta aprobada y el audit AA 13/13; este pass la generaliza.
- L4 — Decisión de dirección: no se pregunta al user; el brief pide explícitamente que las superficies matcheen el vidrio existente. Se decide el sistema de 3 niveles y la política de `backdrop-filter` (arriba).
- L5 — Baseline medido en browser real (`inspect.mjs`, 1440/768/390): la nav es una banda `ink` que corta el cobalto; la card del hero está a ~88% de opacidad (el humo no se lee a través); el `copy-veil` dibuja un rectángulo de bordes duros detrás del titular del hero (artefacto del `backdrop-filter: blur(7px)` sin máscara que llegue a cero en el borde).
- L6 — **T1 + T2 done (W1)**: sistema de vidrio en `globals.css` (tokens `--glass-*`, primitivas rail/panel/tile, `glass-blur` opt-in, fallbacks) + nav adoptando `glass-rail glass-blur` y drawer `glass-panel`. `.glass-card` conserva su blur propio (es la superficie con más texto). Lint exit 0.
- L7 — **W2–W5 commiteados**: `c5661e3` cards de trabajo, `1fce319` About+Contact como panels, `3e825cb` footer rail, `7b29f2c` copy-veil sin blur + section rules fuera + `.gitignore` con `.taste-skill/`. Lint exit 0; `pnpm build` exit 0 (3 páginas estáticas, 11.4s).
- L8 — **Corrección del user (re-brief; gana por regla 1 del faro)**: "no tenes playwright instalado ni nada como para ver irl lo que estás haciendo no? se nota que nos desfasamos de la idea original de vidrio tip hielo con bordes redondeados y componentes simetricos bien estructurados y ajustados".
- L9 — **Conflicto detectado antes de rediseñar**: el estado commiteado (radio 2px, vidrio cobalto oscuro) *es* el faro según Engram obs 69 y `odd/tasks/archive/agency-bocanada-pass.md:14`, que marca `rounded-3xl` como parte del "segundo género" ajeno que se removió; `glass-identity-pass.md` fija "radio 2px". O sea: pasar a redondeado + hielo es un re-brief autorizado, no un fix de drift; y este repo ya pagó ese error una vez (re-theme del 9-oct en un mega-commit, revertido con `reset --hard`). Por eso se para y se pregunta el grado antes de tocar tokens.
- L10 — **Audit de contraste real**: 71 corridas de texto con el backdrop compuesto medido (texto oculto, screenshot por corrida, peor píxel). El vidrio actual aguanta AA con margen — cuerpo en cards/panels 8.6–11.7:1, links del nav 7.5:1, footer 13.4:1. Bajo AA: h1 + acento ice del hero (techo físico del color ya documentado, mitigado por text-shadow), el wordmark decorativo (aria-hidden), "Get in Touch" 4.47 (es la línea del borde del rail dentro del box, no el texto), "View repository" 3.33 al peor píxel con p95 5.61 ✓, y la línea Bebop del footer 4.32 (real: va a fog/75).
- L11 — **Herramientas de verificación**: Chrome por CDP (`design-taste-frontend/scripts/inspect.mjs`, 1440/768/390, screenshots + medición) y auditor de contraste propio. Playwright también disponible vía `uv run --with playwright==1.63.0` (chromium-1243 cacheado en `~/.cache/ms-playwright`).

## RDD / review routing (2026-05-16)

- **Disposición**: el user nunca dejó este candidato sin revisar (no hubo "no lo
  revises" ni equivalente), así que aplica la ruta de review.
- **`assess`**: `risk: unassessable` — "the review assess candidate has no
  pending changes; already-committed work can be assessed by rerunning with
  `--base-ref <commit>`". Plan resultante: tratado como high risk, verificación
  independiente obligatoria.
- **`inspect`**: `status: ready`, `action: start`, target
  `sha256:1db21f40…`, proyección `base-diff:workspace`, `base-ref=ddbaa23`
  (= **`main`**), `committed-only=true` → candidato = **rama entera**: 22
  commits, 47 paths, +6265/−971. Mi rebanada de sesión: `78baa5e..HEAD` = 11
  commits, 11 paths, +497/−252.
- **START #1** (4 lentes) → `native-start-input-invalid` / `lenses-invalid`,
  `lineage_created: false`, `mutation_performed: false`.
- **START #2** (sin lentes, alcance del proveedor) → `lens_context_budget_exceeded`
  (`phase: preflight`), `mutation_outcome: not_started`, `authority_applicability:
  not_evaluated`, `next_action: stop`. Cause nativo: *"retrying this exact
  candidate cannot succeed, so split it into a chained sequence of smaller
  reviewable commits, each under the budget"*. Terminal para ese candidato.
- **START #3** (baseRef `78baa5e…` + `committedOnly` para declarar la rebanada) →
  error de controlador: *"Judgment Day graph-v1 START requires lineageId"*.
  Ruteo, no validación: no produjo estado de autoridad.
- **STATUS** sobre el linaje retenido → candidato **vacío** (`paths: []`,
  proyección `current-changes`, target `sha256:0982420a…`),
  `next_transition: collect / empty_candidate_base_ref_required`,
  `collectBindings: []`. El proveedor pide un base ref para nombrar la
  comparación.
- **Resultado**: ninguna autoridad creada; nada que abandonar ni reparar.
  Bloqueado esperando decisión del user sobre el alcance del review (ver
  reporte). Sin cambios de código en este tramo.
