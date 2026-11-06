# merge-to-main — handoff v3 (slices commiteados, main intacto)

**Estado: los slices están commiteados en `feat/audit-program`, el árbol de
trabajo quedó limpio y `main` no se tocó. Nada se pusheó: publicar sigue siendo
tu decisión.**

Fecha: 2026-11-06 · worktree: `/home/yuka/Proyectos/PortfolioReact` · rama:
`feat/audit-program` (8 commits nuevos sobre `a310ab0`)

Esta v3 registra lo que se ejecutó. La v2 era el plan; la v1 frenaba en una
incógnita ("el WIP no está documentado") que quedó resuelta: ver §"Qué es el WIP".

## El pedido original, verbatim

> "mergea todo a main para el deploy en https://ciucani.vercel.app/"

## Hechos verificados (comandos re-corridos el 6/11)

| Hecho | Comando | Salida |
|---|---|---|
| `main` == `origin/main` == `00cee8b` | `git log --oneline -1 main` | `00cee8b fix(work): key the Pelis card on the renamed repository` |
| La rama estaba **88 commits adelante** de `main` | `git rev-list --count main..HEAD` | `88` (ahora 96, con los 8 slices) |
| El merge es **fast-forward limpio** | `git merge-base --is-ancestor main HEAD` | exit `0` |
| Diff acumulado contra `main` | `git diff --stat main..HEAD` | `146 files changed, 25339 insertions(+), 5844 deletions(-)` + los 8 slices |
| Upstream de la rama | `git rev-parse --abbrev-ref @{u}` | `origin/feat/audit-program` |
| Gate verde | `pnpm gate` | `GATE SUMMARY: 5 pass, 0 fail — EXIT 0` (lint, unit, css, motion, bebop) |
| Build de producción | `pnpm build` | exit `0`, 30 rutas |
| Proyecto Vercel linkeado | `.vercel/project.json` | `ciucani` · `prj_gcEp9X9MHaa5gMmB3B55i2WfrPyS` |
| Árbol de trabajo | `git status --porcelain` | vacío |

El gate **no** corre `next build` ni e2e: verde ahí no prueba que el deploy
buildee. Por eso `pnpm build` se corrió aparte, sobre el árbol final ya
commiteado.

## Los slices, ya commiteados (8 commits)

| # | Commit | Archivos | SHA |
|---|---|---|---|
| **S1** | `feat(tooling): run every gate and fail on the report, not on tail` | `scripts/gate.mjs`, `src/lib/gate-report.js`, `src/lib/gate-report.test.js`, `package.json` | `f9e3e89` |
| **S2** | `perf(field): disperse the plume at display rate and park the loop` | `src/components/LiquidEther.jsx` | `1a3ef2b` |
| **S3** | `perf(field): drive the smoke phases from the background and measure them` | `src/components/AppBackground.jsx`, `scripts/measure-idle.mjs` | `bf169f5` |
| **S4** | `feat(identity): one slow bell with a short bright crest` | hunks de flare en `src/styles/globals.css`, `src/lib/flare-identity.test.js`, `src/lib/flare-density.test.js` | `3971533` |
| **S5** | `feat(identity): re-deal the flare table across the thirds and pin the spacing` | `src/lib/field-flares.js`, `src/lib/field-flares.test.js` | `848e440` |
| **S6** | `refactor(hero,nav): drop the magnetic CTA and let the shared button carry it` | `Magnetic.jsx` (borrado), `useMagnetic.js` (borrado), `HeroActions.jsx`, `Navbar.jsx`, `HeroSection.jsx`, hunks de `nav-cta`/moción compartida/hero | `ebc94c1` |
| **S7** | `fix(a11y): let the row, the tab and the disc answer the keyboard` | hunks de `:focus-within` / `focus-visible` / reduced-motion en `globals.css` | `428a83c` |
| **S8** | `docs(odd): record the flare rework, the full audit and the merge handoff` | `docs/css-map.md`, `odd/tasks/flare-tempo.md`, `docs/full-audit-2026-11-06.md`, este archivo | el commit que contiene este documento |

**S7 no estaba en el plan de la v2.** Apareció al clasificar los hunks de
`globals.css`: cuatro de ellos no eran ni flare ni nav, eran teclado
(`.work-tab:focus-visible`, `.work-row:is(:hover, :focus-within)` en cuatro
reglas, y `.work-go::before` / `.footer-links a` en reduced-motion). Van como
slice propio antes que mezclarlos con otra cosa.

Cada slice es revisable solo: `git show <SHA>` cuenta la historia completa de un
comportamiento, con sus tests si los tiene.

## Qué es el WIP que se commiteó

| Área | Qué hace ahora | Evidencia |
|---|---|---|
| `LiquidEther.jsx` | El humo dejó de avanzar a 5 fps: `active → dispersing → frozen` a ritmo de display. `SETTLE_AFTER_MS=350`, `DISPERSAL_DURATION_MS=3700`; si nadie tocó el puntero se congela en `frozen` | `LiquidEther.jsx:27-67`, `:60`, `:64`, `:1472-1479` |
| `AppBackground.jsx` | Documenta y maneja ese modelo de fases | `AppBackground.jsx:142-145`, `:259-265` |
| `globals.css` (flare) | Un solo `@keyframes flare` con campana lenta: reposo 0.02 → marea 0.16 → cresta 0.6, respiración de 12 beats a 128 BPM (5.625 s) | `globals.css:2554-2568`, `:279-282` |
| `field-flares.js` + tests | La tabla se reparte por tercios con separación mínima (sin racimos) | `field-flares.js:59-70`, `field-flares.test.js:249,278,300,311-326,425,436` |
| `Magnetic` fuera | Ningún CTA sigue al puntero; queda la moción de botón compartida (`.lb` + `SwapArrow`) | `HeroActions.jsx:3-16`, `Navbar.jsx:120-125` |
| `scripts/gate.mjs` + `gate-report.js` | El gate deriva su exit de un veredicto puro: deja de depender de `&&` y de `\| tail` | `gate.mjs` (146 líneas), `gate-report.js:38-60` (62), test (62) |
| `measure-idle.mjs` | Mide el humo por fases y verifica que los flares sigan animando | `measure-idle.mjs:29-31` |

La v1 decía "pasada posterior sin feature doc y sin memoria". **Falso** para el
grueso: `odd/tasks/flare-tempo.md` (Reaperturas 2–6, T9–T16) especifica el humo,
la respiración, la tabla, los discos parqueados y el burst del reload, con
mediciones. Sin documentar quedaban dos piezas: la remoción de `Magnetic` y el
gate runner (memoria Engram obs 219).

## Seams: cómo se resolvieron

1. **`src/styles/globals.css` cruzaba flare, nav y a11y.** Se partió por hunks con
   `git apply --cached` (no `git add -p`, que necesita terminal): flare → S4,
   `nav-cta`/moción compartida/hero → S6, teclado → S7. Verificado que el árbol
   final es idéntico al que había antes de partir nada.
2. **`odd/tasks/flare-tempo.md` no se pudo partir.** Su cola es **un solo hunk**
   (+304 líneas: reaperturas 2–6 y T9–T16 de una pieza), así que viaja entero en
   S8 junto con `docs/css-map.md`. El doc aterriza antes del merge, no antes de
   cada comportamiento.

**Trampa que costó un reset:** si se parte un archivo en dos commits, la segunda
pasada pierde la numeración original de los hunks (los ya commiteados desaparecen
del diff y el resto se renumera desde 1). La primera vez se eligieron números
viejos, S6 se llevó CSS de a11y y hubo que rehacer con `git reset --mixed` al
commit anterior al split, renumerando sobre el diff real.

## Tres contradicciones que se corrigieron

El árbol sucio se contradecía a sí mismo. Las tres quedaron arregladas:

1. `scripts/measure-idle.mjs` decía que el humo se dispersa **en 3.2 s**;
   `LiquidEther.jsx:64` dice `DISPERSAL_DURATION_MS = 3700`. → S3.
2. `scripts/measure-idle.mjs` afirmaba **cuatro** keyframes de flare (`flare`,
   `flare-22`, `flare-12`, `flare-6`); `globals.css` tiene **uno**. → S3.
3. `docs/css-map.md:138` decía que la cresta se queda **entre 0.25 y 0.4**;
   `field-flares.test.js:436` fija `0.5–0.7` y el CSS entrega `0.6`. → S8.

En el caso de `SETTLE_MS` no era sólo prosa: valía `4200` (350 + 3200 + 650) y con
la dispersión real de 3700 ms la ventana de medición arrancaba 150 ms antes de que
el humo terminara. Ahora es `4700` = 350 + 3700 + 650.

## Presupuesto de CSS

`@layer components` de `globals.css` está en ~29 795 B contra un techo de
29 900 B (según `odd/tasks/flare-tempo.md:470-472`). Los slices commiteados no lo
pasaron, pero queda al límite: cualquier regla nueva tiene que entrar borrando
otra en el mismo commit o `check:css` falla.

## Comandos: lo que ya corrió y lo que falta

Hecho el 6/11, todo con exit 0: los 8 slices, `pnpm gate` (5/5) y `pnpm build`
(30 rutas) sobre el árbol final.

Lo único que falta es publicar. Esto dispara el deploy de ciucani.vercel.app:

```bash
cd /home/yuka/Proyectos/PortfolioReact
git checkout main
git merge --ff-only feat/audit-program
git push origin main
git checkout feat/audit-program
```

Salida esperada: `git log --oneline -1 main` en el SHA final de la rama,
`origin/main` movido, deploy nuevo en Vercel.

## Lo único que falta decidir

**¿El push a `main` va ahora o lo hacés vos?** Es la única acción irreversible del
plan: cambia el sitio para cualquiera y dispara el deploy. Todo lo demás ya está
hecho y es reversible (`git reset --soft a310ab0` devuelve los 8 slices a un solo
working tree).

## Reglas que aplican

- **Push a `main` = publicar.** Decisión del dueño, no del agente.
- `--ff-only`, nunca `--force`, nunca `reset --hard`. Si el FF falla, `main` se
  movió: parar y releer, no forzar.
- Si `pnpm build` falla, no mergear: el deploy fallaría igual y encima dejaría
  `main` roto.

## Lo que NO hay que rehacer

- No volver a correr el gate para "confirmar": está verde tres veces (2 corridas
  del 5/11 en `/tmp/gate-230727.log` y `/tmp/gate-run.log`, y la del 6/11 sobre el
  árbol final ya commiteado).
- No auditar los 88 commits: `feat/audit-program` es la rama servible según
  `AGENTS.md` y es el estado que el dueño pidió publicar.
- No confundir el merge con el backlog: los hallazgos de
  `docs/full-audit-2026-11-06.md` (§2 bugs V-B1/V-B2/V-B3, §3–§8) son trabajo
  posterior al deploy, no parte de este merge.
- No tocar el modelo ni el routing: no tienen relación con este deploy.

## Correcciones a la v1 que quedan registradas

- "19 entradas sin commitear" → eran **21** (se sumaron el audit y el test del
  gate runner).
- "No es `flare-tempo` / sin feature doc" → **falso**: era la cola sin commitear
  de `odd/tasks/flare-tempo.md`, salvo la remoción de `Magnetic` y el gate runner.
- "Nadie lo documentó: averiguarlo es el primer trabajo de la próxima sesión" →
  resuelto.
- "El handoff es untracked: `git stash push -u` se lo lleva" → ya no: el árbol
  está limpio y los dos documentos están commiteados en S8.
