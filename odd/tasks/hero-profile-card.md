# Feature: hero-profile-card

Reemplazar la card de proyectos (carrusel de repos GitHub) del hero por una
card de perfil tipo React Bits, adaptada al sistema glass frozen vigente y
con la foto de perfil nueva del user.

## Specs

- **S1** — "quiero que reemplacemos el card de los proyectos en el hero section
  por una card de referencia como estas que te adjunto. son ejemplos para que
  te inspires en ellos y los adaptes a la estetica glass frozen que tenemos
  con mi foto de perfil nueva que adjunto tambien
  /home/yuka/Descargas/image-transformed.png"
- Referencias S1 (inspiración, no copia 1:1):
  - https://reactbits.dev/c/components/spotlight-card — spotlight radial que
    sigue el puntero dentro de la card.
  - https://reactbits.dev/c/components/profile-card — card de perfil con
    tilt 3D hacia el cursor, badge y reverso con skills.
- Faro: sistema glass vigente (`odd/tasks/glass-surface-system.md`, tokens
  `--glass-*`, `.glass-card`, `.glass-nest`), tipografía y paleta ink→ice,
  motion desde `src/motion/config.js`, `prefers-reduced-motion` honrado,
  legibilidad AA sobre el humo. **Sin deps nuevas**: React Bits se adapta a
  mano (JS + CSS vars), no se instala `@react-bits/*` ni Motion.

## Dirección decidida

- Card vertical en la columna derecha del hero (lg:col-span-5, misma grilla
  site-shell; copy + CTA de la izquierda intactos).
- Frente: foto nueva como avatar (Image, quality 70, blur placeholder),
  nombre, rol, ubicación, socials con íconos existentes (github/linkedin/
  instagram según datos reales del sitio), handle GitHub.
- Spotlight: glow ice radial que sigue el puntero dentro de la card (CSS
  vars `--mouse-x/--mouse-y`), apagado o estático con reduced motion.
- Tilt: sutil (≤6°, perspective), rAF-throttled, off con reduced motion.
- Flip: control accesible (btn-icon, aria-pressed) que muestra el reverso
  con chips del stack (vocabulario de tags del sitio). Con reduced motion el
  flip es instantáneo.
- Sin carrusel: se elimina rotación, controles prev/next/pause, live region
  y lógica de pausa (la obligación WCAG 2.2.2 desaparece con la rotación).
- `HeroSection` pierde la prop `projects`; `src/pages/index.jsx` deja de
  pasarla (Layout y ProjectsGrid la conservan).
- README: actualizar el párrafo del visual system que describe la GitHub card.

## Tasks

| ID | Spec | Task | Route | Commit |
|----|------|------|-------|--------|
| T1 | S1 | Asset: foto nueva → `public/profile-hero.webp` (640², q82) + blur placeholder | inline | — |
| T1 | S1 | Asset: foto nueva → `public/profile-hero.webp` (640², q82) + blur placeholder | inline | `dac6389` |
| T2 | S1 | `src/components/ProfileCard.jsx`: card glass frozen con identidad, socials, spotlight, tilt y flip accesible | inline* | `dac6389` |
| T3 | S1 | Hero: montar ProfileCard en la columna derecha, remover carrusel y prop `projects` (HeroSection + index.jsx) | inline* | `dac6389` |
| T4 | S1 | Docs: README (párrafo GitHub card del visual system) + línea faro AGENTS.md | inline* | `dac6389` |
| T5 | S1 | Verificación: `check:lint` ✓, `build` ✓ (18.4s), `validate:bebop` ✓ (25 shots); browser CDP crudo 17/17 checks (spotlight, tilt ≤6°, flip a11y, reduced motion, 1440/768/390, consola limpia) + screenshots en /tmp/hero-shots | inline* | `dac6389` |
| T6 | S1 | Cierre: work-unit commit, evidencia en doc, mirror Engram, memoria | inline | `c2de9a4` |
| T7 | S1 + L3 | Re-balance hero: centrar fila verticalmente en lg (`content-center`) y compactar la card (avatar/gaps/padding/flip corner); re-medir geometría + harness | inline (writer inutilizable: bootstrap requiere repo root del proyecto de sesión) | `797d81a` |

Forecast: ~300 authored lines → un solo work-unit commit. Rama activa:
`feat/agency-rebrand`.

*Ruta: el runtime gentle-ai-worker rechazó el lanzamiento (unidad bajo el
backstop de contexto; no reintentar), T2–T4 fueron inline en el parent. Sin
test runner de UI: verificación proporcional (lint + build + e2e:a11y +
validate:bebop + browser visual); no aplica RED/GREEN (cambio visual sin
test determinista disponible).

## Log

- **L1** — Request original (2026-10-16): "quiero que reemplacemos el card de
  los proyectos en el hero section por una card de referencia como estas que
  te adjunto. son ejemplos para que te inspires en ellos y los adaptes a la
  estetica glass frozen que tenemos con mi foto de perfil nueva que adjunto
  tambien /home/yuka/Descargas/image-transformed.png" + URLs reactbits
  spotlight-card y profile-card.
- **L2** — Evidencia (2026-10-16): work-unit `dac6389` (373+/317−). `e2e:a11y`
  NO disponible en este checkout: el paquete `playwright` no está instalado
  en ningún node_modules alcanzable (falla preexistente; el script es un
  smoke trivial que no toca el sitio). Cobertura real vía harness CDP crudo
  (Node WebSocket + Chromium 1243 headless): 17/17 checks en /tmp/hero-cdp.mjs.
  AGENTS.md (faro) editado local: está gitignored, no entra al commit.
- **L3** — Corrección del user (2026-10-16): "quedó medio alto todo el hero no?
  medio descentrado verticalmente". Diagnóstico probable: grid con
  `content-start` (align-content top) + card ~500px alta → fila pegada arriba
  con hueco grande abajo. Fix en T7.
- **L3-evidencia** (2026-10-16): medición CDP confirmó: card 440px,
  contenido top-packed (hueco sup 96 vs inf ~300). Fix `797d81a`: card
  340px (avatar 96px), `lg:content-center` → 1440x900 contentTop 288 /
  bottomGap 272 (balanceado); hero 390 entra exacto en 100dvh (antes +100px
  de overflow). Re-verificado: harness CDP 17/17, validate:bebop ✓, lint ✓.
