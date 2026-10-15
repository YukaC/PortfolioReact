# Feature: glass-identity-pass

Glassmorphism con identidad Bocanada + UX-UI impecable + legibilidad, sobre el
sistema vigente (faro `AGENTS.md`). No es un rebrand: extiende lo que hay.
Incluye el cierre del pass pendiente y la limpieza de fuentes de drift.

## Specs

- **S1** — "limpia todo lo innecesario o que genere drift en memoria/engram/codegraph,etc"
- **S2** — "despues implementá los fixes" (audit.md P1–P5)
- **S3** — "necesitamos algo de glassmorfismo pero con buena identidad visual con un ux-ui de diseño impecable. que los textos sean legibles distinguibles y demás."
- **S4** — "hasta no conseguir ese /goal , no pares"
- **S5** — Regla faro (`AGENTS.md`): extender el sistema visual Bocanada, nunca
  re-theme; nunca reescribir lo que el brief no pidió; tipografía Manrope/Space
  Grotesk; paleta ink→ice; motion desde `src/motion/config.js`.

## Tasks

| ID | Spec | Task | Route | Commit |
|----|------|------|-------|--------|
| T1 | S2 | Commitear el pass `agency-bocanada-pass` ya verificado (12 files, lint ✓ build ✓) con su task doc y CHANGELOG | inline | W1 |
| T2 | S1 | Borrar componentes muertos (`DarkVeil.jsx`, `CustomCursor.jsx`, `SkillsTicker.jsx`, 0 refs) y archivar `odd/tasks/agency-rebrand.md` + `glassmorphism-trust-hero.md`; actualizar faro AGENTS.md | inline | W2 |
| T3 | S3 | Glass identity: un solo lenguaje de vidrio helado Bocanada (tinte cobalto-hielo, hairline ice, sheen superior, radio 2px) en nav, card del hero, controles y drawer; sin vidrio genérico blanco | inline | W3 |
| T4 | S3 | Legibilidad: scrim/veil que garantice texto distinguible sobre humo y sobre glass (AA), jerarquía display/cuerpo/muted clara | inline | W3/W4 |
| T5 | S3 | UX-UI polish: estados focus-visible/hover/active consistentes, controls del carousel en el lenguaje btn-nav, spacing rhythm, responsive | inline | W4 |
| T6 | S4 | Verificación real: lint, build, browser desktop+mobile con screenshots; iterar hasta limpio | inline | — |
| T7 | S1 | Higiene post-cambios: Engram (status de decisiones absorbidas + actualizar obs 69 vigente), CodeGraph reindex | inline | — |
| T8 | S4 | Cierre: CHANGELOG/README si cambia, reporte final | inline | — |

## Log

- **L1** — "bueno entonces limpia todo lo innecesario o que genere drift en memoria/engram/codegraph,etc: despues implementá los fixes. necesitamos algo de glassmorfismo pero con buena identidad visual con un ux-ui de diseño impecable. que los textos sean legibles distinguibles y demás. hasta no conseguir ese /goal , no pares"
- L2 — Verificación previa del pass pendiente: `npx eslint src` exit 0; `pnpm build` ✓ (13.6s, static OK).
- L3 — **T1 done**: commit `7bb978d` "feat(ux): land agency Bocanada pass" (14 files, +727/−379, incluye CHANGELOG.md y task doc).
- L4 — **T2 done**: borrados `DarkVeil.jsx`, `CustomCursor.jsx`, `SkillsTicker.jsx` (0 refs); archivados `agency-rebrand.md`, `glassmorphism-trust-hero.md`, `agency-bocanada-pass.md`; faro `AGENTS.md` actualizado (sin DarkVeil); README sin SkillsTicker.
