# Feature: glass-consistency-pass

Unificar el lenguaje de cards glass en las superficies que quedaron fuera:
texto del hero, cápsulas del grid de proyectos y footer. Decisión del user:
**"Todo card"** — hero copy y footer pasan a glass card completa (misma
receta que la profile card); el grid mantiene sus tiers (featured panel +
tiles) pero con alturas iguales y la tile huérfana ocupando su fila.
Trabajo originalmente encargado a opencode (cancelado por quota de tokens,
sin cambios en el repo); lo retoma esta sesión.

## Specs

- **S1** — "el card del texto del hero section no tiene el mismo estilo de
  las demás cards"
- **S2** — "las capsulas del grid de proyectos no son simetricas" +
  aclaración del user: "tienen alturas desiguales y quedan cards solas
  inline sin ocupar el espacio que les corresponderia"
- **S3** — "el footer tambien mantienen discrepancias respecto al estilo de
  las cards"
- **Decisión** (ask, 2026-10-16): "Todo card" para S1+S3; S2 = alturas iguales
  por fila (`md:auto-rows-fr`) + tile huérfana full-width (`md:col-span-2`).
- **S4** — "por que opencode me dice que ya no tenemos tokens disponibles
  con apenas unos 2 o 3 prompts? me comio el 21% del uso mensual" —
  análisis-only, resuelto con veredicto (resend de contexto completo por
  request; sesión flash 01:27-02:23 del 16-oct: 179 reqs, 356 MB, contexto
  ~45k→~950k tok sin compactación). Sin cambios de código.
- **S5** — "despues de analizar esto y darme tu veredicto terminá lo que le
  encargue al modelo de opencode-go que se cancelo"

## Tasks

| ID | Spec | Task | Route | Commit |
|----|------|------|-------|--------|
| T1 | S1 | HeroSection: columna de texto en `.glass-card glass-live` (p-5/sm:p-6, gap-6), fuera `copy-veil` del hero (la clase queda para el header de work) | inline | `c19326b` |
| T2 | S2 | ProjectsGrid: `md:auto-rows-fr` en el ul (alturas iguales) + `Reveal className="h-full"` + tile huérfana (índice par/impar) con `md:col-span-2` | inline | `c19326b` |
| T3 | S3 | Footer: `.glass-rail glass-rail-top` → `.glass-card glass-live` dentro de site-shell (p-6/md:p-8); remover `.glass-rail-top` de globals.css (huérfano); beam y wordmark intactos | inline | `c19326b` |
| T4 | S1-S3 | Docs: línea del footer en AGENTS.md (faro local) | inline | `c19326b` |
| T5 | S1-S3 | Verificar: lint ✓, build ✓, harness CDP 17/17 ✓ + consistency 9/9 ✓ (dos .glass-card 24px/1px idénticas en hero, footer card radius 24px con trigger+wordmark intactos, grid 5 cápsulas filas [2,2,1] alturas iguales 989px, huérfana 1280px full row, consola limpia) | inline | `c19326b` |
| T6 | S5 | Commit work-unit + mirror + memoria | inline | docs commit |

Route: inline en toda la pasada (writer gentle-ai-worker inutilizable desde
esta sesión: gate de lanzamiento + bootstrap requiere repo root del proyecto
de sesión; verificado dos veces en hero-profile-card).

## Log

- **L1** (2026-10-16, mensajes previos) — S1/S2/S3 tal como están citados.
- **L2** — Decisión "Todo card" + custom S2 vía ask (2026-10-16).
- **L3** — S4/S5: análisis request-logs-2026-10-16.json (445 reqs, ~485 MB;
  sesión flash devoradora; 429 en sesión glm-5.3 actual) y orden de terminar
  el trabajo cancelado de opencode (repo sin cambios).
- **L4** — Evidencia (2026-10-16): work-unit `c19326b` (76+/22−). Verificado
  17/17 + 9/9. Screenshots: /tmp/hero-shots/consistency-{hero,grid,footer}-1440.png.
