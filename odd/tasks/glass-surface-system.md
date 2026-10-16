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
| T1 | S1 S2 | Foundation: tokens `--glass-*` y primitivas `.glass-rail/.glass-panel/.glass-card/.glass-tile` en `globals.css` (`glass-blur` opt-in, fallbacks reduced-transparency y sin backdrop-filter); `.site-nav` pasa a ser una máquina de estado sobre los tokens del rail | inline | W1 |
| T2 | S2 | Navbar: rail de vidrio cobalto (no banda negra) + drawer móvil de vidrio | inline | W1 |
| T3 | S2 | Cards de trabajo: featured card y tiles sobre el sistema de vidrio | inline | W2 |
| T4 | S2 | About (Experience) y Contact: panels de vidrio, separación por tono (no hairline) | inline | W3 |
| T5 | S2 | Footer: cierre de vidrio diseñado | inline | W4 |
| T6 | S3 | Legibilidad sobre humo: re-medir AA y retunear `copy-veil` donde el vidrio ya respalda | inline | W5 |
| T7 | S3 | Verificación real: lint, build, browser 1440/768/390 con screenshots, contraste, overflow; iterar hasta limpio | inline | — |
| T8 | — | Cierre: CHANGELOG, higiene de memoria (Engram/CodeGraph), reporte | inline | W6 |

## Log

- **L1** — "mejora mi interfaz web para matchear con el fondo animado de smoke. siento que mis componentes ,cards, navbar, footer, etc quedaron desfasados del estilo de glasmorfismo."
- L2 — Exploración: `.glass-card` existe pero solo lo usa la card del hero; `.site-nav` es una banda `ink/64%` + blur 14px (lee gris sobre el cobalto); `ProjectsGrid` no tiene superficie (imagen + texto suelto con `copy-veil`); `Experience` usa hairlines `item-rule`; `Contact` y `Footer` son texto plano; el drawer móvil es `bg-ink` opaco.
- L3 — Precedente: `glass-identity-pass` (commits `7bb978d`, `6770b16`) dejó la receta aprobada y el audit AA 13/13; este pass la generaliza.
- L4 — Decisión de dirección: no se pregunta al user; el brief pide explícitamente que las superficies matcheen el vidrio existente. Se decide el sistema de 3 niveles y la política de `backdrop-filter` (arriba).
- L5 — Baseline medido en browser real (`inspect.mjs`, 1440/768/390): la nav es una banda `ink` que corta el cobalto; la card del hero está a ~88% de opacidad (el humo no se lee a través); el `copy-veil` dibuja un rectángulo de bordes duros detrás del titular del hero (artefacto del `backdrop-filter: blur(7px)` sin máscara que llegue a cero en el borde).
- L6 — **T1 + T2 done (W1)**: sistema de vidrio en `globals.css` (tokens `--glass-*`, primitivas rail/panel/tile, `glass-blur` opt-in, fallbacks) + nav adoptando `glass-rail glass-blur` y drawer `glass-panel`. `.glass-card` conserva su blur propio (es la superficie con más texto). Lint exit 0.
