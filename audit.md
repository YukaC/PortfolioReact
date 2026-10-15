# Audit — Cursor × PortfolioReact (9–15 oct 2026)

Análisis de tus últimas sesiones de Cursor sobre este repo: **lo que pediste vs
lo que hizo, por qué se fue del diseño original, y qué queda por fixear.**

**Método:** extraje las 10 sesiones del workspace `PortfolioReact` de la base
SQLite de Cursor (`~/.config/Cursor/User/globalStorage/state.vscdb`, tablas
`composerHeaders` + `cursorDiskKV`), las leí completas, y las contrasté contra el
historial de git, los 34 briefs archivados en `odd/tasks/archive/` y el árbol
actual. No es impresión: cada afirmación abajo tiene sesión, fecha y commit.

---

## 1. Resumen ejecutivo

En una semana hubo **tres rebrands completos que terminaron en revert**, un
easter egg de fondo (Bocanada) que salió bien por colaboración, y un último pass
de pulido que sigue **sin commitear**.

| Arco | Fechas | Resultado |
|---|---|---|
| Rebrand "agencia violeta" (Syne/Outfit, foto tuya de perfil, Showcasy, Asake/CIUCANI®) | 9–10 oct | **Revertido** (`reset --hard 3667ab3`). Vos: *"fue una mierda tu implementación, no sigue ningún gusto"* |
| Fondo Bocanada (Dark Veil → LiquidEther → humo real) | 10–12 oct | **Consolidado.** Es el diseño actual |
| Pass agencia sobre Bocanada (design-taste, trust-first, SEO/GEO) | 12–13 oct | **Consolidado** (hero manifesto, spy del nav, perf) |
| Pass final (glassmorphism audit + hero al shell + carousel a11y) | 15 oct | **Consolidado pero SIN COMMITTEAR** (12 archivos modificados, +649/−379) |

El diseño actual del repo (fuentes Manrope/Space Grotesk, paleta ink→ice,
LiquidEther como simulación de humo custom) **coincide con el faro de
`AGENTS.md`**. Los "gustos horribles" ya no están en el código: quedaron en
commits huérfanos y en el desorden operativo que sigue abierto (sección 7).

---

## 2. Línea de tiempo — lo que pediste vs lo que hizo

### Sesión 1 (9 oct, 18:48) — GGC + rebrand violeta

| Pediste (verbatim) | Hizo | Veredicto |
|---|---|---|
| "dame un análisis completo con GGC, arquitectura, rendimiento, visual…" | Audit honesto: **B ~80/100**, "Visual C+: dark+púrpura genérico; hero en card" | ✔ Bien |
| "rebrand completo… colores oscuros con tonos **violetas**… 21st, motion frames y react-bits. Utiliza ODD" | Asumió sin esperar (1B+2A: Bebop a violet + motion sin shadcn). W1–W5 en **un solo commit** `cdda804` | ⚠ El brief ya contradecía el diseño cobalto/hielo existente |
| "hace lo recomendado… arregla `npm run dev/build` lento" | Worktree NVMe (`3667ab3`), explicó Turbopack×HDD | ✔ Bien (el fix real del dev lento) |
| "te pedí un rebrand entero y vos hiciste un **polish**, andá más" | Sobre-corrección: **Syne + Outfit** (pisó Space Grotesk/Manrope), hero full-bleed **con tu foto de perfil**, works magazine, skills invertidas (`9e15782`) | ✘ Inventó la foto. Nunca la pediste |
| "no pongas mi foto de perfil… fue una mierda… usá **Showcasy** como referencia y *mixealo con lo mío*" | Clon de Showcasy: "Hello! I'm Agustín", SilkBackdrop, nav `agustin.` (`7a33be0`) | ✘ Dijiste *mixear*; hizo reemplazo |
| "inspirate en esta web: **Asake**" | Clon Asake: wordmark `CIUCANI®` gigante, tipografía uppercase brutal, MENU overlay, orden Hero→Works→Studio→Services (`1abeb08`) | ✘ Re-theme total otra vez |

**10 oct 16:22:** *"No me gustaron los cambios. ¿Podemos volver atrás hasta donde creamos la branch?"*
→ `reset --hard 3667ab3`. Los 4 commits estéticos quedaron huérfanos. **Revert total.**

### Sesión 2 (10–12 oct) — Bocanada: el arco que salió bien (con tropiezos)

| Pediste | Hizo | Veredicto |
|---|---|---|
| Instalar React Bits MCP + "¿qué background se parece a las portadas de Bocanada? Humo azul, estático, que reaccione al mouse" | Recomendó **Dark Veil** con tuning azul correcto | ✔ |
| "Implementalo nomás" | Lo puso **solo en el hero**, detrás de la card | ✘ No releyó tu pedido original |
| "tiene que cubrir **todo el background**… quedó gris atrás de la tarjeta" | Lo movió a `AppBackground` full-bleed | ✔ |
| (sin pedido) | Página **toda blanca**: `texStorage2D` inmutable + Strict Mode `loseContext()` | ✘ Bug entregado como done |
| "sigue azul sin humo y no hay interacción" | Más debugging de WebGL (gate que ocultaba el canvas) | ✘→✔ |
| "**liquid ether quedaría muchísimo mejor**… tomá los colores de la imagen" | LiquidEther + paleta de la tapa: silueta `#02122d`, cobalto `#015ec3`, humo helado `#d4f0ff`, coral `#e2727f` | ✔ Punto de inflexión |
| "los patrones de puntos no son simétricos" | Una sola grilla 48×48 | ✔ |
| "el efecto no llega a ser humo de verdad" → "sigue pareciendo **agua**" | Cirugía mayor: campo de densidad (dye advection), flotación, turbulencia, disipación. Dejó de pintar velocidad (ondas) y pasó a pintar densidad (humo) | ✔ Su mejor trabajo de la semana |
| "quería una anim estática por default, que simule el visualizer de Bocanada" | Columna de humo ambiente + duración ×2.5 | ✔ |
| "analiza **este video** para imitar el efecto" | Bajó el video, y **copió también colores, partículas y exhalaciones** | ✘ Overreach |
| "tenías que usar el patrón de puntos de **ESTA imagen**, del video solo la animación como neblina persistente" | Revetió colores/partículas del video, dejó la bruma | ✔ Corrigió al escuche |
| "brillan puntos aleatorios, no los del grid" → "estelas" → "feo, quiero glow tipo estrella" → "estelas negras alrededor" → "parpadeo tipo cortocircuito" | 5 rounds de fixes (blend `screen`, alpha premultiplicado, seno lento) | ✔ Feedback corto = convergencia |

### Sesiones 4–5 (12 oct) — Pulido fino del fondo

- "yo solo quería **la imagen original** con spring glow aleatorio en puntos del grid" → lo hizo, con ciclos de 16–28s por celda. ✔
- "bruma de madrugada que evoque Bocanada: tristeza, vacío, lo no dicho" (pasteaste la interpretación de la canción) → niebla baja, pálida, pegada al piso; después la hizo interactiva en el fluido. ✔ Probablemente el momento donde mejor te escuchó.

### Sesiones 6–7 (12–13 oct) — Pass agencia sobre Bocanada

- Invocaste `/design-taste-frontend /emil-design-eng` "tono de agencia profesional" → hero asimétrico, nav h-16, work editorial, custom cursor out. ✔ (acá la skill de gusto trabajó a favor porque la invocaste vos)
- "mejora el cta final y el footer, **que quedó horrible**" → banda de cierre + barra utilitaria. ✔
- "grilla fea + el navbar no se ilumina al scrollear" → featured split + grid 2 col + spy con ScrollTrigger. ✔
- "el hero **no me gustó**, ¿volvemos a la inspiración Bocanada?" → manifesto "Crafting *smooth* digital compositions". ✔
- "optimizá al extremo el rendimiento" → DPR 1×, sim 0.32/0.22, BFECC off, HalfFloat, throttle idle: ~75fps. ✔
- "proyectos invertidos (zigzag), máximo 6, legibilidad, a11y, SEO y GEO" → filas alternadas + JSON-LD + `#d0dceb` con sombras. ✔

### Sesión 8 (14 oct) — Tu pregunta meta: "¿por qué no me hace caso?"

Pediste auditar tu setup "para descubrir qué daña la inteligencia de mis modelos, sobre todo el gusto en frontend, ya que son repetitivos y nunca me hace caso". La IA se autodiagnosticó y el diagnóstico **es correcto y yo lo verifiqué**:

1. **El always-on se comió el presupuesto de atención**: `gentle-ai.mdc` (~600 líneas, `alwaysApply: true`) + `gentle-gate.mdc` + user rules duplicadas + AGENTS/CLAUDE + 34 archivos `odd/tasks/bocanada-*` en el `git status` del system prompt. Tu instrucción del turno queda al fondo.
2. **Un segundo director de arte**: la skill `design-taste-frontend` (~1200 líneas, dials 8/6/4, vocabulario Awwwards: magnetic, liquid glass, sticky stack). El protocolo "leé el skill si matchea" la activaba incluso sin invocarla, y **reescribía tu pedido** para pasar su checklist.
3. **El menú del MCP es el "gusto repetitivo"**: 21st.dev always-on inyectaba decenas de tools por turno y sesgaba el catálogo: Dark Veil, Liquid Ether, Magnetic, glass cards — exactamente lo que aparecía en el árbol.
4. **Engram discutía con vos**: ~67 observaciones activas con direcciones contradictorias y **ninguna `supersedes`**: "agency Bocanada poético" vs "agency pro-taste, no Bocanada" vs "restore Space Grotesk, el serif es slop" vs "trust-first, menos motion". El modelo promediaba todo → siempre el mismo sitio.
5. **Inercia del código**: regla de "matchear el archivo existente" + un árbol que ya era neblina+magnetic → un cambio puntual se implementaba *dentro* de esa estética.

### Sesión 9 (15 oct) — Auditoría 21st + implementación final

Auditaste contra referencias (glass trust hero, magnetic cursor, navbar, footer, beam wordmark). Diagnóstico correcto: *"el hero es otro sitio pegado encima"* (pills, orbes `blur-[120px]`, card `rounded-3xl`, widget "Live from GitHub") mientras que de la primera pantalla para abajo volvía el Bocanada correcto.

Implementaste ("implementá todo lo que descubriste… faltaron botones de accesibilidad en el giro… el hero quedó más expandido respecto a los márgenes"):
- Hero al mismo `site-shell` (inset 64px), un solo CTA, card de vidrio con screenshot real.
- Carousel WCAG 2.2.2: prev/next, **pause** (`aria-pressed`), dots de 44px, teclado, live region.
- Work: un caso featured + grid 2 col con problema/resultado; About una sola sección; nav vidrio desde el primer pixel; footer con haz de hielo + wordmark recortado.

Commits: `f475d9c`, `8f1db0c`, `00ed785`, `7072470`, `c553a51` (en `feat/agency-rebrand`, sin mergear). **El pass final quedó sin commitear.**

### Sesión 10 (15 oct, tarde) — Sin diseño: setup de Termux/SSH/Tailscale.

---

## 3. El drift: decisiones tomadas fuera del pedido

Enumeradas, con el patrón de cada una:

1. **Foto de perfil full-bleed en el hero** (9 oct). Nunca la pediste. La inventó
   como "foto edge-to-edge con parallax" dentro del "rebrand entero". Es el
   ejemplo más claro de rellenar un brief con gustos propios.
2. **Reemplazo tipográfico total** (Syne + Outfit IN, Space Grotesk/Manrope
   OUT) sin pedido explícito. "Rebrand" se interpretó como "arrasá con todo".
3. **Referencias tratadas como spec**: "mixealo con lo mío" → clon Showcasy;
   "inspirate" → clon Asake. Dijiste *inspiración*, implementó *reemplazo*.
4. **W1–W5 en un solo commit** (`cdda804`): el ODD que él mismo propuso pedía
   work units revisables; entregó un mega-diff imposible de reviewar por partes.
5. **Overreach del video**: pediste la *animación*; copió también colores,
   partículas y exhalaciones. Tuve que marcarlo: "tenías que usar ESTA imagen".
6. **Bugs entregados como done**: Dark Veil hero-only, página blanca por
   `texStorage2D` + Strict Mode, canvas muerto, lint roto en `DarkVeil.jsx`
   durante días. La verificación era screenshot headless, no tu browser.
7. **Widget "Live from GitHub" + pills HTML5/CSS3 + orbes**: inventario de
   agencia-genérico que contradecía tanto tu trabajo real como la tapa.

## 4. Por qué pasó (causas raíz)

**De proceso (la mitad es compartida con vos):**

- **El brief inicial ya era el drift.** El 9/10 pediste "rebrand completo violeta
  con 21st/react-bits" sobre un sitio que era cobalto/hielo Bocanada. La IA
  obedeció *ese* brief; tu gusto real (Bocanada) recién apareció cuando viste el
  resultado violeta/foto/Asake. **No existía contrato de diseño**: el faro de
  `AGENTS.md` se escribió el 15/10, *después* de toda esta semana, como reacción.
  Las reglas 1–4 del AGENTS.md actual ("current-turn brief wins", "never
  re-theme", "never rewrite what the brief didn't ask") son literalmente las
  lecciones de este episodio.
- **"Andá más" sin definición de qué conservar.** Cuando dijiste "te pedí un
  rebrand entero, andá más", el espacio de cambio quedó sin límites → tipografía,
  composición, fondo y hasta tu identidad visual en una sola pasada. Un "andá
  más" pide escala, pero sin lista de intocables el modelo llena con su menú.
- **Referencias externas como fuente mutante.** Showcasy y Asake no comparten
  sistema con tu sitio; cada una implicaba re-theme. La tapa de Bocanada, en
  cambio, es un sistema cerrado (cobalto, hielo, coral, retícula) → convergió.

**Sistémicas (verificadas, no opinion):** el siempre-on de ~600 líneas + skill
`design-taste-frontend` como director de arte paralelo + 21st MCP como menú +
Engram autocontradictorio + 34 briefs en `git status`. Con ese stack, el modelo
no "no te escucha": **promedia** tu turno contra un corpus que pesa más. La
dieta que propuso el 14/10 era correcta; la mitad ya está aplicada (21st salió
de `~/.cursor/mcp.json`, lint hoy pasa limpio).

## 5. Lo que sí funcionó (y por qué)

El arco LiquidEther (10–13 oct) es el contraejemplo que confirma el diagnóstico:

- **Una sola referencia estable** (la tapa) en vez de referencias que cambian.
- **Briefs específicos y observables**: "los puntos no son simétricos", "sigue
  pareciendo agua", "dura poco", "bruma de madrugada, lo no dicho".
- **Feedback loops cortos**: vos mirabas y describías; la IA ajustaba y
  verificaba en browser, no en headless.
- Resultado: `LiquidEther.jsx` hoy **no es el componente stock de React Bits**;
  es una simulación de humo custom (campo de densidad, flotación, turbulencia,
  bruma ambiente, stars con spring en la retícula 48px). Eso es el faro.

## 6. Estado actual del repo (verificado hoy)

| Item | Estado |
|---|---|
| Fuentes | Manrope 400/500 + Space Grotesk 500/600 (faro ✔) |
| Paleta | ink/night/deep/mist/fog/paper/ice `#8fb4e8`; `amber-glow` y `available` mapeados a ice (faro ✔) |
| `LiquidEther` | Sim de humo custom, quality-scaled, `prefers-reduced-motion` cubierto (faro ✔) |
| Hero | Practice split en `.site-shell`, carousel glass con pause/prev/next (faro ✔) |
| Lint | `npx eslint src` → **exit 0, limpio** |
| `motion` (dep) | Ya no está en `package.json` ✔ |
| 21st MCP | Ya no está en `~/.cursor/mcp.json` ✔ |
| **Working tree** | ⚠ **12 archivos modificados sin commitear (+649/−379)** + `CHANGELOG.md` y `odd/tasks/agency-bocanada-pass.md` untracked |
| **Branch** | ⚠ `feat/agency-rebrand` 7 commits adelante de `main`, sin mergear |
| **Archivos muertos** | ⚠ `DarkVeil.jsx`, `CustomCursor.jsx`, `SkillsTicker.jsx`: cero referencias en `src/` |
| odd/tasks | ⚠ `agency-rebrand.md` (rebrand revertido) y `glassmorphism-trust-hero.md` siguen como activos |
| Engram | ⚠ Memorias contradictorias de diseño siguen activas sin resolver |

## 7. Plan de fix (priorizado)

- **P1 — Cerrar el working tree.** El pass `agency-bocanada-pass` (hero al
  shell, carousel a11y, featured case, wordmark) está hecho, verificado y **sin
  commitear**. Revisar el diff y commitear como work unit(s) con su task doc y
  `CHANGELOG.md`.
- **P2 — Merge a main.** `feat/agency-rebrand` (los 7 commits del fondo Bocanada
  + NVMe) → `main`. Decisión tuya (publicar es tuyo).
- **P3 — Borrar muertos.** `DarkVeil.jsx`, `CustomCursor.jsx`,
  `SkillsTicker.jsx`. El faro dice "DarkVeil kept on disk", pero es residuo del
  arco del 9–10 oct: hoy solo ocupa lint mental. Borrar y ajustar el faro.
- **P4 — Archivar odd/tasks viejos.** Mover `agency-rebrand.md` (revertido) y
  `glassmorphism-trust-hero.md` (absorbido por el pass final) a `archive/`.
- **P5 — Engram.** Marcar la dirección vigente (faro Bocanada del 15/10) como
  ganadora y `supersedes` sobre: agency-pro-taste, restore-Space-Grotesk,
  trust-first-spring. Evita que la próxima sesión "promedie" otra vez.
- **P6 — Guardas anti-drift.** Ya existen y funcionaron (AGENTS.md reglas 1–4).
  Mantener: 21st fuera del always-on, `design-taste-frontend` solo cuando lo
  invoques, y una sola dirección activa en memoria.

---

*Fuentes: `~/.config/Cursor/User/globalStorage/state.vscdb` (composerIds
`94717d9c…`, `04854100…`, `20fe2509…`, `1fcc1123…`, `9dd3078e…`, `09371562…`,
`3817d13d…`, `df653c1b…`, `f81ef954…`; sesiones extraídas a
`/tmp/cursor-sessions/`), `git log` de `feat/agency-rebrand`, `odd/tasks/`
y verificación directa del árbol el 15/10.*
