# Audit — PortfolioReact

Documento único. Una parte histórica y cinco de ingeniería, en orden cronológico:

- **Parte I — Histórico** (9–15 oct): qué se pidió vs qué hizo Cursor, el drift, y qué quedó pendiente (§7).
- **Parte II — Render, rendimiento, tokens** (31 oct 2026): diagnóstico medido en navegador, **33 hallazgos**,
  auditoría de Tailwind v4, centralización de tokens y el campo WebGL.
- **Parte III — Decisiones** (1 nov 2026): retícula de parpadeos, plan de App Router, datos de proyectos.
- **Parte IV — Sin JavaScript** (1 nov 2026): qué sobrevive sin fallbacks y qué hay que arreglar.
- **Parte V — Testing** (1 nov 2026): gates que bloquean el merge.
- **Parte VI — SEO, GEO, AEO, AIO** (1 nov 2026): visibilidad en buscadores y en motores de respuesta.

> Lo que se implementó y lo que no: nada. Todo lo de las Partes II–VI es diagnóstico con evidencia y plan.

**Índice**

| Parte | Secciones |
|---|---|
| I · Histórico | §1 resumen · §2 línea de tiempo · §3 el drift · §4 causas raíz · §5 lo que funcionó · §6 estado del repo (1 nov) · §7 pendiente heredado |
| II · Render | §8 método · §9 veredicto · §10 hallazgos (33) · §11 orden de trabajo · §12 lo que no hay que tocar · §13 Tailwind v4 · §14 tokens · §15 recomendaciones · §16 plan App Router · §17 datos de GitHub (check 6 h) · §18 campo WebGL |
| III · Decisiones | §19 retícula de parpadeos |
| IV · Sin JS | §20 fallback sin JavaScript |
| V · Testing | §21 suites y gates |
| VI · SEO/GEO/AEO/AIO | §22 estado actual · §23 los cuatro acentos · §24 plan por fases · §25 medición · §26 lo que no se hace |

---

# Parte I — Histórico (sesiones de Cursor, 9–15 oct 2026)

Análisis de las sesiones de Cursor sobre este repo: **lo que pediste vs lo que hizo, por qué se fue del
diseño original, y qué queda por fixear.**

**Método:** se extrajeron las 10 sesiones del workspace `PortfolioReact` de la base SQLite de Cursor
(`~/.config/Cursor/User/globalStorage/state.vscdb`, tablas `composerHeaders` + `cursorDiskKV`), se leyeron
completas y se contrastaron contra el historial de git, los 34 briefs archivados en `odd/tasks/archive/` y el
árbol actual. No es impresión: cada afirmación tiene sesión, fecha y commit.

## 1. Resumen ejecutivo

En una semana hubo **tres rebrands completos que terminaron en revert**, un
easter egg de fondo (Bocanada) que salió bien por colaboración, y un último pass
de pulido que quedó consolidado (hoy commiteado: ver §6).

| Arco | Fechas | Resultado |
|---|---|---|
| Rebrand "agencia violeta" (Syne/Outfit, foto tuya de perfil, Showcasy, Asake/CIUCANI®) | 9–10 oct | **Revertido** (`reset --hard 3667ab3`). Vos: *"fue una mierda tu implementación, no sigue ningún gusto"* |
| Fondo Bocanada (Dark Veil → LiquidEther → humo real) | 10–12 oct | **Consolidado.** Es el diseño actual |
| Pass agencia sobre Bocanada (design-taste, trust-first, SEO/GEO) | 12–13 oct | **Consolidado** (hero manifesto, spy del nav, perf) |
| Pass final (glassmorphism audit + hero al shell + a11y del carousel, hoy retirado) | 15 oct | **Consolidado** (commiteado; el carousel ya no existe en el árbol) |

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

Commits: `f475d9c`, `8f1db0c`, `00ed785`, `7072470`, `c553a51` (en `feat/agency-rebrand`; **hoy mergeados y
commiteados — ver §6**).

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
   `texStorage2D` + Strict Mode, canvas muerto, lint roto en `DarkVeil.jsx` (ya eliminado)
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
de `~/.cursor/mcp.json`, hoy lint 0 errores).

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

## 6. Estado del repo (verificado el 1 nov 2026)

Lo que sigue está comprobado contra el árbol de hoy, no contra el del 15 oct. Los ítems del antiguo plan
(working tree, merge a `main`, archivos muertos, `odd/tasks` viejos, guardas anti-drift) **están cerrados**: el
tree está limpio, `nvme/feat-agency-rebrand` figura en `--merged main`, hoy se trabaja en `feat/prod-polish`
(24 commits adelante), `DarkVeil/CustomCursor/SkillsTicker` no existen, y los tasks viejos están en
`odd/tasks/archive/`.

| Item | Estado real |
|---|---|
| Fuentes | Manrope 400/500 + Space Grotesk 500/600 + **Fraunces italic** (sólo wordmark del footer, `preload: false`) |
| Paleta | `ink #060b1a · night · deep · mist · fog · paper · mut #c2cde4 · dim #9eabc4 · sky/ice #8fcbff · coral #e2727f` |
| Hero | texto: status, split headline, lead, dos CTA, stackline y ornamentos. **No hay carousel** |
| `LiquidEther` | shader custom con calidad por `navigator.connection`, `prefers-reduced-motion` cubierto y fallback `onUnavailable` a la retícula CSS |
| Lint | `npx eslint src` → **0 errores, 1 warning**: `LiquidEther.jsx:1667` (dep `touchSmoke` faltante). `.lint-baseline.json` sólo cuenta errores |
| Deps | `motion` ya no está en `package.json` |
| Campo (commits recientes) | `2e92df1` retícula exclusiva · `4e9f647` fallback CSS sin WebGL · `cfc094e` sin humo siguiendo el dedo |
| SSG | HTML servido con todo el contenido; sin JS: 0 canvas, retícula CSS a 0.55 (ver §20) |

## 7. Pendiente heredado

- **P5 — Engram.** Marcar la dirección vigente (faro Bocanada) como ganadora con `supersedes` sobre
  `agency-pro-taste`, `restore-Space-Grotesk` y `trust-first-spring`, para que ninguna sesión futura vuelva a
  "promediar" el diseño. Hoy no hay contradicciones activas detectables, pero tampoco está marcado.
- **Warning de lint** (`LiquidEther.jsx:1667`): agregar `touchSmoke` al array de deps o quitar el `useEffect`
  redundante. Es el único warning del repo y por eso no lo ve el baseline.

---

*Fuentes: `~/.config/Cursor/User/globalStorage/state.vscdb` (composerIds
`94717d9c…`, `04854100…`, `20fe2509…`, `1fcc1123…`, `9dd3078e…`, `09371562…`,
`3817d13d…`, `df653c1b…`, `f81ef954…`; sesiones extraídas a
`/tmp/cursor-sessions/`), `git log` de `feat/agency-rebrand`, `odd/tasks/`
y verificación directa del árbol el 15/10.*

---

# Parte II — Render, rendimiento y tokens (31 oct 2026)

## 8. Cómo se midió (reproducible)

Servidor de producción (`pnpm build && PORT=4173 pnpm start`) y Chrome real vía Playwright,
con tres perfiles y CDP (`Performance.getMetrics` → `RecalcStyleCount`, `RecalcStyleDuration`,
`LayoutCount`, `TaskDuration`; `longtask`; rAF propio para el frame pacing).

| Perfil | Config |
|---|---|
| Desktop | 1440×900, DPR 1, GPU AMD RX 570 (ANGLE/GL), sin throttle |
| Desktop 2K | 2560×1440, DPR 1, misma GPU |
| Phone | 390×844, DPR 2, mobile+touch, **CPU 4× throttle**, misma GPU |
| **Potato / sin GPU** | 1440×900 con renderer **SwiftShader** (sin aceleración) |
| Sin JS | `javaScriptEnabled: false` |
| Variantes de atribución | `reduced-motion`, canvas removido, `backdrop-filter` off, canal de movimiento no-op |

Scripts usados (fuera del repo, no commiteados): `/tmp/audit/{reveal-audit,attribute,mobile,idle,targeted,lag,nojs,overflow,shots}.mjs`.

### Números clave

| Escenario | frame avg | p95 | frames >32ms | TaskDuration del scroll | RecalcStyle |
|---|---|---|---|---|---|
| Desktop 1440×900 | 15.9 ms | 20.5 | 0.6 % | 0.78 s | 513 / 380 ms |
| Desktop 2560×1440 | 18.2 ms | 20.6 | 0 % | 0.57 s | — / 269 ms |
| Phone 390×844 @4× CPU | 17.9 ms | 19.6 | 0.7 % | 1.68 s (medido con throttle) | 390 / 840 ms |
| **SwiftShader (potato)** | **87.4 ms** | **150** | **98.3 %** | **10.5 s** | 513 / 380 ms |
| SwiftShader + `reduced-motion` | 21.0 ms | 33.4 | 25.8 % | **0.13 s** | 66 / 10 ms |
| SwiftShader sin canvas | 65.4 ms | 100 | 99.4 % | 0.86 s | 459 / 370 ms |
| Canal de movimiento desactivado | 60.4 ms | 117 | 93.3 % | 6.97 s | 277 / 50 ms |

Lectura: **en hardware con GPU real la página va bien** (incluso 2K). El desastre aparece
cuando no hay aceleración (o cuando la GPU es débil): 11 fps y el main thread comido 10.5 s
en un scroll de 3 s. Y la variante `reduced-motion` demuestra que el mismo layout puede
correr a 21 ms/frame con 0.13 s de main thread: **el coste no está en el contenido, está en
las capas que se agregaron encima**.

Carga inicial (desktop): 404 KB de JS (17 archivos) en 17 requests; CSS en 2 archivos,
65 KB crudos / 14.5 KB gz (del `@layer components` propio salen 41 KB de los 50 KB de `globals.css`),
TBT 1.7 s en SwiftShader (28 long tasks, la peor 416 ms), LCP 268 ms, CLS 0.
En el perfil phone: TBT 324 ms, peor long task 224 ms — hydration + montaje del campo.

---

## 9. Veredicto

La base está bien pensada (SSG por idioma, fuentes subseteadas, capas separadas, comentarios
que documentan cada decisión). Lo que falla es la **arquitectura de animación**: hay tres
sistemas de suavizado empujando el mismo scroll, un canal de custom properties que invalida
estilo del subárbol del hero en cada frame, seis superficies con `blur(110px)` + `plus-lighter`
permanentes, y una capa WebGL que **no tiene ningún tier de calidad ni watchdog** — cuando la
GPU no acelera, se queda montada igual y hunde la página. Al sistema de revelado, además, se
le puede reprochar un bug de contenido: sin JS los tres `h2` de sección quedan **en blanco**.

Prioridad real de arreglo: P0-1 (contenido invisible), P0-2 (desfase), P0-3 (tiers), y después
P1-1/P1-2 (estilo por frame y blur permanente). El resto es prolijidad con impacto medible pero
menor.

A eso se suman tres decisiones de plataforma, resueltas en §15–§18: **migrar a App Router** (§16),
**snapshot validado de los datos de GitHub con check cada 6 h** (§17) y **campo WebGL congelado en reposo
con tiers** (§18).

---

## 10. Hallazgos

### P0-1 · Sin JS (o si el reveal no monta) los títulos de sección son invisibles

**Evidencia.** Carga con JS deshabilitado, `getComputedStyle` de cada `.w > span`:

```
H1 "Desarrollo tu software…"          transform: none          (ok, es data-r="paint")
H2 "Demos que funcionan…"             matrix(1,0,0,1,0,64.715)  ← fuera de su caja
H2 "Cómo trabajo: una persona…"       matrix(1,0,0,1,0,64.715)  ← fuera de su caja
H2 "Contame el problema…"             matrix(1,0,0,1,0,64.715)  ← fuera de su caja
```

Medición sobre el documento completo: **19 de 26 palabras** de `.w > span` quedan desplazadas (el hero aporta
las 7 que sí se ven, porque es `data-r="paint"`). Auditoría completa del modo sin JS en **§20**.

**Causa.** `src/styles/globals.css:732` deja la palabra en `transform: translateY(112%)` dentro
de una caja `.w` con `overflow: hidden` (`:723`); sólo `.is-in .w > span` (`:739`, clase que pone
JS) o la animación de `[data-r="paint"]` (`:686`) la devuelven. El bloque de rescate
`@media (scripting: none)` (`:1435`) resetea `[data-r]` y `.statement .sw` pero **no** `.w > span`.

Esto viola la invariante escrita en el propio CSS (`:618-625`: "una revelación es decoración y
nunca puede ser la razón por la que la página se ve vacía"). El mismo agujero se abre si:

- un error de JS ocurre antes de `useRevealOnEnter` (todo el hero pinta, los `h2` no);
- el heading queda dentro de un ancestro que nunca intersecta (`display:none`, `content-visibility`).

**Fix.** Invertir el default: `.w > span` visible; la animación entra por clase/keyframe (igual que
`data-r="paint"`) y el estado oculto lo pone JS (`html.js` inline en `_document`). Como mínimo,
agregar `.w > span { transform: none }` al bloque `scripting: none` y al de `prefers-reduced-motion`.

---

### P0-2 · El fondo va 0.5–0.7 s atrás del contenido (doble suavizado, dependiente del FPS)

**Evidencia.** Salto instantáneo de scroll a progreso 0.5; lectura de `--p` por frame:

```
f1  (18 ms)  --p = 0
f2  (32 ms)  --p = 0.055
f5  (83 ms)  --p = 0.186
--p al 95 % → 479 ms
--p al 99 % → 716 ms
```

Con rueda (Lenis), en el primer frame: `scrollY` ya está en progreso 0.294 y `--p` recién en 0.134.

**Causa.** Tres suavizados en serie sobre el mismo scroll:

1. `src/motion/smoothScroll.js:49` — Lenis `lerp: 0.07` (constante de tiempo ≈ 240 ms). También pasa
   `duration: 0.55` (`:51`), que Lenis ignora cuando hay `lerp`: configuración contradictoria.
2. `src/hooks/useFieldMotion.js:8` — `SCROLL_LERP = 0.11` aplicado **por frame** (no por delta time):
   a 30 fps el retraso se duplica, a 120 fps se reduce — el desfase cambia con el hardware.
3. `TILT_LERP 0.07` / `POINTER_LERP 0.14` (`:9-10`), mismos problemas para el puntero.

Todo lo que lee `--p` (`field-blob` translate/opacidad, `field-progress`, hue del campo) y `--scy`
(parallax del hero, `.orn`) arrastra ese retraso: eso es exactamente el "fondo desfasado".

**Fix.** Un solo dueño del scroll suavizado. O Lenis (y el canal lee el valor ya suavizado sin
volver a interpolar), o ningún suavizado y valores directos. Si queda algún lerp, hacerlo
`damp(value, target, lambda, dt)` (frame-rate independent). El parallax del hero no debería
depender de un canal suavizado propio.

---

### P0-3 · No existe tier de calidad: sin GPU acelerada la página cae a ~11 fps

**Evidencia.** SwiftShader: 87.4 ms/frame, 98.3 % de frames >32 ms, 10.5 s de main thread en un
scroll de 3 s, warnings `GPU stall due to ReadPixels`. Removiendo el canvas: 65 ms/frame y
0.86 s de task (el WebGL solo aporta ~9.6 s de bloqueo). Con `reduced-motion`: 21 ms.

**Causa.** `src/components/AppBackground.jsx:31-46` decide si montar el campo mirando **solo**
`navigator.connection` (slow-2g/2g/3g/saveData). No hay:

- sonda de GPU (renderer string, `deviceMemory`, `hardwareConcurrency`);
- watchdog de FPS que degrade a la retícula CSS;
- DPR adaptativo: `src/components/LiquidEther.jsx:136,149` fija `pixelRatio = 1` siempre
  (ver P1-4 para el otro lado del problema);
- `powerPreference: 'high-performance'` (`:156`) fuerza la dGPU en notebooks para animar… un fondo
  que en reposo es casi estático;
- recuperación degradada: `webglcontextlost` sólo apaga el canvas y deja la retícula CSS (eso **sí** existe,
  commit `4e9f647`), pero no vuelve a intentar con menos resolución ni con otra calidad.

**Fix.** Un `qualityTier` de tres estados (`full` / `lite` / `static`) decidido por
renderer+memoria+saveData, más un watchdog de 60 frames al montar y otro tras el primer scroll:
si el p95 de frame supera ~24 ms, bajar de tier (half-rate → CSS lattice). Y `pixelRatio =
min(devicePixelRatio, 2)` sólo cuando el tier es `full`.

---

### P0-4 · Sin JS no hay navegación en mobile (y el hamburguesa miente)

**Evidencia** (Chrome con `javaScriptEnabled: false`, 390×844): `.nav-links` computa `display: none`
(`hidden md:flex`), el drawer necesita JS para abrirse, y el toggle `.btn-icon` está **visible** y no hace
nada (`toggleVisible: true`). Resultado: el visitante no puede llegar a `#portfolio`, `#about` ni `#contact`.
En desktop no pasa (3 links visibles), así que el fallo es exclusivamente mobile.

**Causa.** La navegación mobile vive entera detrás de estado de React (`useState` del drawer) y no existe
ningún `<noscript>` propio: el único del HTML es el de Next (`data-n-css`).

**Fix.** Drawer sobre `<details>/<summary>` (funciona sin JS y con JS se le agrega animación), o como mínimo
un `<noscript>` con los tres anchors y el toggle oculto salvo `html.js`. Criterio: en 390 px sin JS se llega a
las tres secciones en un tap. Detalle en **§20.4**.

---

### P1-1 · El canal de movimiento invalida el estilo de todo el hero en cada frame

**Evidencia.** Variante con el canal no-op vs base, mismo scroll: `RecalcStyleCount` 513 → 311,
`RecalcStyleDuration` 380 ms → 120 ms. En phone con 4× CPU: 390 recalcs / 840 ms medidos
(≈210 ms reales ≈ 8.5 % de la ventana de scroll). El CSS del hero además repinta texto con
`text-shadow: … 0 0 24px` (`:1794-1801`, heredado por todo `.hero-copy`) cada vez que el subárbol se
invalida.

**Causa.** `useFieldMotion` escribe `--scy` y `--hf` sobre `.hero-copy`, un ancestro con ~80-150
descendientes; una custom property no registrada hereda y **invalida el subárbol entero** cada
frame. Encima `.w { translate: calc(var(--scy) * var(--k) …) }` (`:723`) hace que cada una de las
12+ cajas de palabra dependa del valor, y `.hero-copy { opacity: var(--hf) }` (`:751`).

**Fix.** Escribir sólo en los lectores (`:root` no, ancestro tampoco), declarar las propiedades con
`@property { syntax: "<length>"; inherits: false; }`, y mover el parallax del hero a **un** wrapper
compuesto (`transform: translate3d(0, var(--scy), 0)`) en vez de doce valores por palabra. Con
ScrollTrigger `scrub` ya hay un único write por frame y una capa compuesta.

---

### P1-2 · 4.8 Mpx de superficies con blur + blend, permanentes

**Evidencia.** Medido en el DOM a 1440×900: `blurSurfaceMpx = 4.83`, 19 elementos con
`will-change` distinto de `auto`; 6 capas con `filter: blur(110px)` y `mix-blend-mode: plus-lighter`
(`:182-196`) sobre blobs de 64/48/42 vw, más `.field-grain` full-screen con `mix-blend-mode: overlay`
(`:278`) y `backdrop-filter: blur(14px)` en `.orn-orb` (`:953`) y en `.work-preview-tag` (`:1290`).
El `nav-pill` agrega `backdrop-filter: blur(26px)` al cruzar 24 px de scroll (`:772`), encima de un
canvas que se repinta.

**Causa.** El cross-fade se resolvió con dos gradientes fijos + `opacity`, que es correcto para no
re-rasterizar, pero el resultado son **seis** capas enormes con blur real y blend aditivo que el
compositor tiene que recomponer en cada cambio de `--p`. En GPU integrada/phone el fill-rate de eso
más el shader es lo que satura.

**Fix.** Un solo blob pre-desenfocado (PNG/gradiente rasterizado a 1/8 de resolución y escalado) o
los tres en **una** capa con `filter` en el padre; `will-change` sólo mientras se scrollea; `grain`
con `opacity` y `background-blend-mode` en lugar de `mix-blend-mode` sobre el canvas.

---

### P1-3 · El reveal esconde contenido ya pintado después de hidratar

**Evidencia.** `src/hooks/useRevealOnEnter.js:32-49`: tras hidratar, recorre los `[data-r]` y a los
que están fuera de pantalla les agrega `is-pending` (`opacity: 0; translateY(28px)`; `blur(6px)` en
desktop, `:634`). Es decir: el HTML pinta todo → hydration los apaga → el observer los vuelve a
prender. En un phone lento eso se ve como secciones que desaparecen y reaparecen; y cualquier nodo
que se renderice después del primer efecto (el `<ul key={filter}>` de `WorkList:315` se remonta
completo al cambiar de filtro) **no se observa nunca** → revelado ausente = inconsistencia visual
("el mismo bug en todas las revelaciones").

Además el observer corre una sola vez y no se re-suscribe: la arquitectura asume un documento
estático, que ya no es el caso.

**Fix.** Estado inicial oculto decidido por CSS sólo cuando hay JS confirmado (`<html class="js">`
inline en `_document`) y observers con `threshold: 0` + `rootMargin: "0px 0px -8% 0px"`; un
`MutationObserver` (o un `useReveal` por componente) para nodos nuevos. Alternativa mejor para
mobile: `content-visibility: auto` + `contain-intrinsic-size` por sección y revelado por transición
de opacidad únicamente (sin translate ni blur).

---

### P1-4 · El campo WebGL no aporta nada en reposo, pero sigue costando (y se ve más blando que el fallback)

**Evidencia.** Captura del hero a 3.5 s de reposo: el humo se disipó (`autoDemo={false}` y sin
puntero no hay inyección de tinta); lo único visible es la retícula coral de 48 px. Eso es
exactamente lo que dibuja `.bocanada-sparks` (`:303-312`) sin GPU.
Aun así el loop sigue despertando cada 143 ms para siempre (`LiquidEther.jsx:34`,
`IDLE_BREATH_INTERVAL_MS`) y el chunk de `three` (180 KB gz, 712 KB crudo) se descarga en la primera
ventana de idle (`AppBackground.jsx:121-122`, `timeout: 400`) — justo cuando el usuario empieza a
scrollear.
Y como el canvas se crea con `pixelRatio = 1` (`LiquidEther.jsx:149`) sobre pantallas DPR 2/3, la
retícula sale **medio resolución**: en la captura mobile los puntos se ven blandos al lado del texto
nítido. El fallback CSS (radial-gradients vectoriales) se ve *más* definido que el original.

**Fix.** Desarrollado en **§18 (rev 2)**: la retícula de puntos y sus destellos salen del shader y pasan a CSS
(siempre vivos, también en mobile), el humo queda como capa aparte con fases `active → settling → frozen`
(0 rAF en reposo), tiers `full`/`lite`/`static` y `pixelRatio = min(dpr, 2)`.

---

### P1-5 · `body { overflow-x: hidden }` (`globals.css:97`)

Crea un contenedor de scroll en `body`. Es la receta conocida para que `position: fixed` (el fondo
del campo, `AppBackground.jsx:130-134`) se comporte mal en iOS Safari (se mueve/tiembla con el
scroll, el clásico "fondo sticky") y además mata cualquier `position: sticky` futuro.
Hoy no está tapando ningún overflow real (medido: `scrollWidth === innerWidth` en 320/390/768/1024/
1280/1440); los desbordes que existen son de hijos `fixed` (blobs, glow), que no pueden scrollear.

**Fix.** Borrarlo o reemplazarlo por `overflow-x: clip` (`clip` no crea contenedor de scroll). Si
hace falta recortar los adornos, `contain: paint` en el contenedor del campo.

---

### P1-6 · Fugas de carga inicial en mobile (SSR/SSG bien aplicado, pero…)

Lo que está bien: `getStaticProps` + ISR por idioma, locale decidido en el proxy y horneado en el
HTML, `<html lang>` en el documento, sin swap en cliente, `__NEXT_DATA__` 3 KB, fuentes subseteadas
(2 preload, Fraunces diferida), sin dependencias de UI pesadas.

Lo que falta:

1. `three` se baja en la primera ventana de idle (ver P1-4), en el momento de peor presupuesto.
2. Las portadas de proyectos usan `sizes="(max-width: 900px) 100vw, 1px"` (`WorkList.jsx:89`): en un
   phone cada fila pide un variante de ancho completo (~7 imágenes) mientras se scrollea.
3. CSS: 56.6 KB crudos / 12.4 KB gz en un archivo render-blocking, de los cuales ~82 % es
   `@layer components` escrito a mano (Tailwind aporta sólo ~6 KB de utilidades + preflight).
4. El documento completo (63 KB de HTML, ~860 nodos) se layoutea y pinta de una: no hay
   `content-visibility` en las secciones de abajo.

---

### P1-7 · Sin JS hay controles que mienten

Filtros de trabajo (5 botones), "Copiar mail" y el tagline de Bebop (`role="button"`) se ven y no responden
cuando no hay JS: son controles focusables que no hacen nada. Los filtros son tolerables (la lista muestra
todo), pero el botón de copiar no: promete una acción que no ocurre. Fix: ocultarlos sin JS (`js-only`) salvo
que tengan equivalente estático — el `mailto:` gigante ya cubre el copiar, y el tagline puede quedar como
texto sin `role="button"`.

---

### P2 · Detalles con evidencia (arreglar cuando toque, no son la causa)

1. **`useIntroTimeline` es código muerto**: busca `[data-intro]` (`useIntroTimeline.js:14`) y no existe
   ningún nodo con ese atributo en el repo. El `useLayoutEffect` + `gsap.context` corre igual.
2. **`ping` infinito**: `.status i { animation: ping 2.4s infinite }` (`globals.css:388`) anima
   `box-shadow`. Medido en reposo: **una recalculación de estilo por frame, para siempre**
   (231 recalcs / 231 frames, con cero writes al DOM). El documento nunca queda quieto (batería).
3. **`orn-in` con `fill: both`** (`:938`): deja tres nodos del hero en el animation stack toda la vida
   de la página — el propio CSS documenta esa trampa para `[data-r="paint"]` y ahí usa `backwards`.
4. **`useMagnetic`** (`useMagnetic.js:39`) hace `getBoundingClientRect()` dentro del handler de
   `pointermove`: lectura de layout intercalada con los writes del rAF → layout thrash. Cachear rects
   y actualizar en resize.
5. **El canal de puntero corre con `pointer: coarse`**: `useFieldMotion` registra `pointermove` sin
   `hasFinePointer()` y escribe `--px/--py/--mx/--my` para elementos que en mobile están
   `display: none` (`.field-glow`, `.hero-ornament`).
6. **`ScrollTrigger.refresh()` sin throttle en resize** (`smoothScroll.js:34`) + ResizeObserver en
   `body` (`Navbar.jsx:254`, `useFieldMotion.js:172`): en iOS el colapso de la barra de URL dispara
   `resize` durante el scroll → refresh en pleno gesto. Falta `ignoreMobileResize` y debounce.
   ***Resuelto (9 nov 2026).*** ScrollTrigger ya no está en el sitio: el re-measure vive en
   `src/motion/scrollProgress.js` con política width-only más debounce de 200 ms, y
   `src/lib/scroll-contract.test.js` lo bloquea (un resize que sólo cambia la altura no re-mide, y la
   ruta de re-measure no escribe nunca la posición del scroll).
7. **`will-change` permanente** en `.work-row` (`:1140`) para 6 filas que sólo animan en hover.
8. **Wordmark del footer**: `background-clip: text` con gradiente por letra reescrito en cada frame de
   puntero (`Footer.jsx:147`) sobre un elemento de 1434×275 px → re-raster completo del bloque más
   grande de la página (medido: 378 recalcs en un barrido de 2.5 s; 0 % jank en esta GPU, riesgo alto
   en integradas).
9. **Cinco listeners de puntero** en `window` (`LiquidEther` mousemove + rect por frame, `useFieldMotion`,
   `usePointerLight`, `Footer`, `Magnetic`).
10. **`SiteLogo`**: `<img alt="Agustín Ciucani">` dentro de un link con `aria-label` → nombre duplicado.
11. **`.footer-mark` se corta** en 1440: `font-size: clamp(5.5rem, 23vw, 20.5rem)` + `nowrap` excede el
    shell y lo recorta `overflow: hidden` en mitad de glifo (visual, no es bug de perf).

---

### P2 · Derivados de la pasada Tailwind (12–22)

12. **`tailwind.config.js` no se lee (verificado).** En Tailwind v4 el config JS sólo entra con
    `@config "./tailwind.config.js"`, y `globals.css` no lo tiene. Prueba: agregué
    `theme.extend.colors.zzprobe = '#123456'`, corrí `pnpm build` y el color **no aparece** en el CSS
    compilado; archivo restaurado, `git diff` vacío. Es decir: `darkMode: "class"`, `content` y
    `theme.extend` son letra muerta, y `<html class="dark">` (`_document.js:20`) no tiene ni un solo
    `dark:` detrás en todo el repo. El archivo sobrevive como documentación engañosa.
13. **`autoprefixer` corre encima de Tailwind v4** (`postcss.config.js:4`), que ya prefija con
    Lightning CSS: doble proceso sobre el mismo CSS.
14. **Los 22 tokens de `@theme` no se usan como utilidad ni una vez.** Cero apariciones de
    `bg-ink` / `text-paper` / `border-border` en JSX: el JSX habla en `text-white/55`,
    `bg-white/10`, `border-white/15`, `bg-[#060b1a]`. El sistema de tokens sólo alimenta el CSS
    escrito a mano. Son dos gramáticas de color conviviendo.
15. **13 literales `rgb(143 203 255)`** en `globals.css` que son exactamente `--color-sky`: cambiar el
    acento obliga a tocar 13 lugares y el token no alcanza.
16. **Colores fuera de tokens**: `#4ade80` (dot de estado, `:392`), `#07102a` (texto del botón sólido,
    ×3), `#fff`, `#000`, `#061020`.
17. **`@theme static` fuerza a emitir los 22 colores + alias aunque no se usen**, y crea API fantasma:
    `bg-bg`, `bg-bg-main`, `bg-bg-light`, `text-text-muted`, `bg-secondary`, `bg-available`.
18. **`.sr-only` escrito a mano** (`:1819`) cuando Tailwind ya lo trae, y **`.focus-ring:focus-visible`**
    (`:149`) duplicando el `:focus-visible` global (`:132`): dos caminos para el mismo anillo.
19. **Clases sin regla**: `.site-logo` (`SiteLogo.jsx:16`) y `.work-repo` (`WorkList.jsx:107`) se usan
    como clase y no existen en el CSS. Hooks muertos que invitan a "arreglar" estilos que nunca se
    aplicaron.
20. **`!important` ×2** en `#__next`/`#next` (`:274-280`) peleando con preflight.
21. **`.hero-title`** (`:894`) resuelve su ancho con
    `width: min(30ch, calc(100% + (100vw - 100%) / 2 - 0.75rem))` en lugar de recortar el adorno:
    es el parche que compensa el `overflow-x: hidden` de P1-5.
22. **8 utilidades con valor arbitrario** (`bg-[#060b1a]`, `min-h-[100dvh]`, `text-[0.6875rem]`,
    `text-[clamp(4rem,9vw,7rem)]`, `tracking-[0.01em]`, `tracking-[0.14em]`, `z-[3]`,
    `text-[0.625rem]`) que deberían ser tokens o escalas del tema.

## 11. Orden de trabajo propuesto

| # | Tarea | Criterio de aceptación |
|---|---|---|
| 1 | Reveal sin JS / sin observer | Con `javaScriptEnabled: false` los 4 headings muestran sus palabras (`transform: none`) |
| 2 | Un solo dueño del scroll suavizado | Salto de scroll: `--p` al 95 % en <100 ms; `--scy` no duplica lerp |
| 3 | Tiers de calidad + watchdog | En SwiftShader la página entra en `lite` y sostiene p95 < 24 ms |
| 4 | Canal de movimiento acotado | `RecalcStyleCount` de un scroll completo < 150 (hoy 513) y sin repintar texto con halo |
| 5 | Blur permanente reducido | `blurSurfaceMpx` < 2 y `will-change` sólo durante el gesto |
| 6 | `overflow-x` + `ping` + `orn` fill | Sin `overflow-x` en body; cero recalcs por frame en reposo |
| 7 | Carga: campo diferido, portadas mobile, secciones diferidas | JS inicial ≤ 260 KB, sin chunk de `three` en los primeros 10 s de un phone lento |

> La **secuencia consolidada** (P0 → tokens → RUM → App Router → scroll-driven → Tailwind) está en §15.3;
> esta tabla queda como alcance y criterios de los P0/P1 de render.

Cada punto es una unidad de trabajo independiente y verificable con los harness de la sección 1.
La migración a Tailwind de §13 es un plan aparte: no cambia ninguna de estas cifras y conviene ejecutarla
**después** de los puntos 1–3, que tocan los mismos bloques de CSS.

## 12. Lo que NO hay que tocar

- El HTML prerenderizado por idioma y el proxy: está bien resuelto (cero flash, `<html lang>` real).
- La elección de `next/font` y la diferición de Fraunces.
- Los breakpoints de `[data-r]` por `pointer: coarse` (el blur del reveal ya está apagado en mobile).
- `content-visibility`, `will-change` transitorio y los tres tiers son aditivos: no cambian el diseño.

---

23. **Tres declaraciones del mismo font-stack**: `@theme` (`:46-49`), `.root-layout` (`:63-66`) y
    `body` (`:126`) que además **ignora `--font-display`** y usa `var(--font-manrope)` directo. Cambiar
    la fuente del cuerpo = 2 ediciones; cambiar la de títulos = 2 ediciones.
24. **Dos rampas de movimiento que no se tocan**: el CSS usa 0.3 / 0.35 / 0.36 / 0.4 / 0.5 / 0.6 / 0.7 /
    0.9 / 1.1 s con **3 curvas** (una en `--ease`, dos inline); `src/motion/config.js` usa
    0.18 / 0.26 / 0.34 / 0.55 / 0.62 s con 3 springs + `DRAWER_BEZIER` que el CSS no conoce. Cambiar
    "el feel" hoy son 2 archivos y 24 números que no se refieren entre sí.
25. **Cuatro vocabularios de breakpoint**: CSS 560 px / 900 px / 64rem · Tailwind 640 / 768 / 1024 / 1280 ·
    JS `innerWidth <= 900` (`WorkList.jsx:181`) · JS `matchMedia` 768 px y 900 px. Consecuencia medida a
    800 y 900 px de ancho: `desktopNav: visible, heroOrnament: hidden, workPreview: hidden` — o sea nav
    de escritorio con layout de contenido mobile durante 132 px de ancho.
26. **Escala tipográfica fuera de grilla**: `0.8125rem` (13 px, ×10), `0.9375rem` (15 px, ×4) y
    `1.0625rem` (17 px, ×2) no existen en la escala de Tailwind (12/14/16/18). 16 usos fuera de escala.
27. **Espaciado sin sistema**: 27 paddings, 10 gaps y 17 `margin-top` únicos, ninguno tokenizado.
28. **Radios y sombras ad hoc**: 8 radios (incluido `999px` en `.btn` vs `9999px` en `.btn-icon` para la
    misma píldora) y **13 `box-shadow` distintas**, todas literales.
29. **z-index sin escala**: `-1, 0, 1, 2, 40, 50, 60, 70` + `z-[3]` en JSX (`WorkList.jsx:107`).
30. **Alfa sobre blanco a medio tokenizar**: `--line` y `--glass` existen, pero hay **25 alfas distintos**
    literales en CSS (`0.03 … 0.9`: `.nav-ind` 0.1, `.work-tab-ind` 0.13, `.skill-chips` 0.05…), más
    `white/x` en JSX. Tres formas de decir lo mismo.
31. **264 declaraciones con dimensión cruda y sin `var()`** en `globals.css` (37 `font-size`, 24 `width`,
    24 `height`, 18 `gap`, 18 `padding`, 16 `border-radius`, 15 `letter-spacing`): el 33 % de las 807.

## 13. Auditoría Tailwind v4 y plan de migración

### 13.1 Inventario medido (no impresiones)

| Métrica | Valor |
|---|---|
| `globals.css` | 50.3 KB · 2116 líneas |
| `@theme static` | 1.3 KB (22 colores + 5 stacks de fuente) |
| `@layer base` | 1.5 KB |
| **`@layer components`** | **41.1 KB · 203 bloques · 807 declaraciones** |
| `@layer utilities` | 0.3 KB |
| CSS compilado total | 65.4 KB crudos / 14.5 KB gz en 2 archivos (uno render-blocking de 56.6 KB / 12.4 KB gz) |
| Peso relativo | **~82 % del CSS es `@layer components` a mano**; Tailwind aporta ~6 KB (preflight + las 73 utilidades que el JSX realmente usa) |
| Tokens de clase distintos en JSX | 176 |
| — apuntan a clases escritas a mano | 97 |
| — apuntan a utilidades Tailwind | 73 distintas |
| — no existen en ningún lado | 2 (`.site-logo`, `.work-repo`) |
| Declaraciones expresables 1:1 con utilidades | **372 / 807 = 46 %** (107 bloques) |
| Declaraciones que no lo son | 435 (96 bloques: keyframes, blend, filtros, `mask-composite`, `background-clip` con `calc()`, pseudo-elementos decorativos, `:has()`, `@supports`, `(scripting:none)`) |

Conclusión del inventario, antes de cualquier plan: **la deuda no es "falta Tailwind", son dos sistemas
de color y 41 KB de componentes escritos a mano conviviendo con utilidades sueltas**. Y el peso del CSS
no baja solo por migrar: muda de lugar.

### 13.2 Regla de decisión (dónde va cada cosa)

| Bucket | Criterio | Destino | Ejemplos del repo |
|---|---|---|---|
| **A · Utilidad inline** | un solo uso, sin pseudo-elementos ni composición, props de caja/tipografía/color/estado | clases en JSX | `.site-shell`, `.section-y`, `.hero`, `.hero-actions`, `.section-head`, `.about-grid`, `.about-copy`, `.contact-actions`, `.footer-row`, `.footer-links`, `.skill-chips`, `.work-list`, `.work-num`, `.work-body`, `.timeline-*`, `.lead`, `.eyebrow`, `.status`, `.stackline` |
| **B · Receta reutilizable** | ≥2 usos del mismo conjunto, o se necesita un nombre para leer el JSX | `@utility` de Tailwind v4 (una sola definición) | `.glass`, `.btn` + `.btn-solid`, `.nav-pill`, `.work-tab`, `.focus-ring`, `.skip-link`, `.work-go` |
| **C · Se queda en CSS** | keyframes, máquina de estados, geometría de split, composición blur/blend, `mask-composite`, `background-clip` con `calc()`, `:has()`, `@supports`, `(scripting: none)`, `(prefers-reduced-transparency)` | CSS, en un bloque ordenado | `.field-*`, `.w`/`.w > span`, `[data-r]`/`.is-pending`/`.is-in`, `.btn::before/::after`, `.lb`, `.ar`, `.footer-mark-ch`, `.timeline::after`, `.mq-outline` (`-webkit-text-stroke`), `.menu-toggle[data-open]` |

Traducción operativa de "todo lo posible en Tailwind": **A + B = 46 % de las declaraciones y ~60 % de los
bloques**. El otro 40 % no es terquedad: Tailwind no puede expresar `@keyframes` y una máquina de estados
de tres clases compartida por 19 nodos se vuelve ilegible como ternario de 80 caracteres por nodo.

### 13.3 Plan de migración (7 pasos, cada uno verificable)

> **Actualizado por §14.7**: el orden vigente es S0–S7, con la centralización de tokens (S2a–S2d) antes de
> tocar JSX. Esta tabla queda como el detalle de alcance por paso.

| # | Paso | Alcance | Criterio de aceptación |
|---|---|---|---|
| S1 | **Sanear la config** | borrar `tailwind.config.js` (o conectarlo con `@config` si se quiere `dark:`); sacar `autoprefixer` de `postcss.config.js`; `@theme` → sólo tokens con consumidor; matar los alias fantasma (`bg-bg`, `text-text-muted`, …) | `pnpm build` verde; 0 variables `--color-*` sin consumidor; CSS compilado no crece |
| S2 | **Una sola gramática de color** | reemplazar los 13 `rgb(143 203 255)` por `var(--color-sky)`; `#4ade80`/`#07102a`/`#fff`/`#000`/`#061020` → tokens (`--color-live`, `--color-on-solid`); `bg-[#060b1a]` → `bg-ink` | `grep -rn "rgb(143 203 255)\|#4ade80\|#07102a" src` = 0; `grep -rn "bg-\[#" src` = 0 |
| S3 | **Bucket A: utilidades inline** por sección (About → Contact → Footer → Work → Hero), una sección por unidad de trabajo | reemplazar la clase por utilidades en el JSX y borrar el bloque CSS | capturas 1440/1024/390 idénticas (pixel diff ≤ 0.1 % en las 3); `@layer components` baja de 41 KB a ≤ 28 KB |
| S4 | **Bucket B: `@utility`** | una definición por receta (`glass`, `btn`, `nav-pill`, `work-tab`, `focus-ring`, `skip-link`); `.sr-only` se borra (Tailwind lo trae) | 1 sola definición por receta; `.focus-ring` deja de duplicar el `:focus-visible` global |
| S5 | **Estados y breakpoints a variantes** | `@media (hover: hover) and (pointer: fine)` → `pointer-fine:`; `(pointer: coarse)` → `pointer-coarse:`; `(max-width: 900px)` → `max-[900px]:` (o decisión explícita de mover a `lg`); `(max-width: 560px)` → `max-[560px]:` | mismas capturas en 320/390/768/1024/1440; 0 media queries de puntero en CSS |
| S6 | **Ordenar lo que queda** | un solo bloque CSS con las secciones en el orden del documento, comentario de por qué cada una no es utilidad, y keyframes agrupados | documento §12 del `AGENTS.md` del repo con la regla; nadie agrega un bloque nuevo sin razón escrita |
| S7 | **Guardarraíles** | script `pnpm check:css`: hex/rgb crudos fuera de `@theme`, clases usadas sin regla, tamaño del CSS compilado, tokens sin consumidor | falla el check si aparece un literal de color, una clase muerta o el CSS crece >5 % |

Reglas de proceso que conviene fijar en el mismo paso (si no, la migración se revierte sola):

- un color nuevo **entra por `@theme`**, nunca como hex en JSX ni en CSS;
- una clase nueva en `@layer components` necesita ≥2 usos y una razón escrita de por qué no es `@utility`;
- las utilidades inline llevan variantes (`hover:`, `pointer-coarse:`, `max-md:`) en vez de media queries;
- los custom properties de animación (`--d`, `--i`, `--k`, `--od`, `--h`, `--rx/--ry`, `--bx/--by`) siguen
  siendo `style={{}}` inline: son datos de instancia, no clases (Tailwind puede hacer `[--d:120ms]`, pero
  en un `.map()` no se lee mejor).

### 13.4 Lo que NO se migra, y por qué (para que nadie lo intente después)

- `[data-r]` / `.is-pending` / `.is-in`: máquina de tres estados con default visible y 19 consumidores.
  En utilidades sería un ternario por nodo que pierde el default y agranda el HTML servido. (Además es
  donde vive el bug P0-1: se arregla una vez en CSS, no en 19 lugares.)
- `.w` / `.w > span`: geometría del split de palabras con `overflow: hidden` + `calc()` sobre `--i`.
- `.field-blob*`, `.field-glow`, `.field-grain`: composición (`filter` + `mix-blend-mode` + `isolation`)
  y cross-fade por opacidad; en utilidades quedaría un `[filter:blur(110px)]` ilegible y sin `@supports`.
- `.btn::before` / `::after`: `radial-gradient(… at var(--bx) var(--by))` + `mask-composite: exclude`.
- `.footer-mark-ch`: `background-clip: text` con `calc(0.34 + var(--b) * 0.5)`.
- `.timeline::before/::after`: dos rieles superpuestos con `scaleY(var(--tlp))`.
- `@supports not (backdrop-filter)`, `(scripting: none)`, `(prefers-reduced-transparency: reduce)`,
  `(prefers-reduced-motion: reduce)`: Tailwind no tiene variante para esas condiciones.

### 13.5 Qué se gana y qué no (para no vender humo)

| Se gana | No se gana |
|---|---|
| Un solo lugar para el acento (hoy: token + 13 literales) | Frame time: la migración **no cambia** ninguna cifra de §8/§10, porque no toca composición ni el canal de movimiento |
| Un solo idioma de color para JSX y CSS | Mucho peso: piso realista −12 a −20 KB crudos (≈ −2 KB gz), no la mitad del CSS |
| Menos superficie de bug: 2 clases muertas, `sr-only` y `focus-ring` duplicados, 22 tokens fantasma | Menos archivos: los keyframes y el motor de revelado siguen en CSS |
| Recetas con un solo dueño (`@utility`) y estados como variantes (`pointer-coarse:`, `max-[900px]:`) | Poder usar `@apply`: conviene evitarlo salvo dentro de `@utility`, para no volver a crear componentes |

### 13.6 Orden recomendado (dependencias reales)

`S1 → S2` primero (bajo riesgo, desbloquean todo: sin tokens canónicos, migrar utilidades propaga colores ad
hoc). El desglose vigente de S2 en S2a–S2d y el baseline S0 están en §14.7. Después `S4` (recetas, toca pocas líneas y fija el idioma). `S3` y `S5` van por
sección y conviene hacerlos **después** de los P0 de §11, porque esos arreglos tocan los mismos bloques
(`[data-r]`, `.w`, `.field-*`) y hacerlo al revés obliga a reescribir la migración. `S6 → S7` cierran.

---

## 14. Centralización de tokens (auditoría profunda)

Objetivo real: que **color, tipografía, superficie y comportamiento** se cambien en un lugar, sin mover
un pixel de la estética actual. La pregunta correcta no es "¿todo a Tailwind?" sino **"¿en cuántas capas
vive cada decisión?"**.

### 14.1 Tres capas, no una

| Capa | Qué contiene | Dónde | Regla |
|---|---|---|---|
| **1 · `@theme`** | lo que genera utilidad (`--color-*`, `--font-*`, `--text-*`, `--radius-*`, `--shadow-*`, `--blur-*`, `--ease-*`, `--duration-*`, `--animate-*`, `--breakpoint-*`, `--z-*`) | `globals.css` | sólo entra si hay (o habrá) una clase que lo lea |
| **2 · `:root` semántico** | lo que sólo consume CSS propio: gradientes del campo, hues de blob, composición del glass, `--line`, `--glass` | `globals.css` | nombre semántico + comentario de por qué no es capa 1 |
| **3 · animación** | `--animate-*` + `@keyframes` + curvas | `@theme` o bloque propio | CSS y `motion/config.js` leen **los mismos** tokens |

Meter todo en la capa 1 es lo que ya pasó: 22 `--color-*` en `@theme` que **no genera ni una utilidad usada**
y sí generan API fantasma (`bg-bg`, `text-text-muted`).

### 14.2 Inventario: dónde vive hoy cada decisión

| Familia | Estado hoy | Distintos | Destino |
|---|---|---|---|
| Color | 22 `@theme` + 20 hex sueltos + 13 `rgb(143 203 255)` + `--line`/`--glass` | 42 valores | capa 1 (10 reales) + capa 2 (campo) |
| Alfa sobre blanco | 25 pasos literales en CSS + `white/x` en JSX + 2 tokens a medias | 27 | capa 1: escalera de 5 + excepciones documentadas |
| Familias tipográficas | `@theme` **y** `.root-layout` **y** `body` (que ignora `--font-display`) | 3 declaraciones | capa 1, una sola |
| Escala tipográfica | 10 `clamp()` + 37 `font-size` crudos (13/15/17 px fuera de grilla) | 47 | capa 1 `--text-*` (v4 admite par `--text-*--line-height` / `--letter-spacing`) |
| Espaciado | 27 paddings · 10 gaps · 17 `margin-top` | 54 | capa 1 (`--spacing`) en lo migrado; excepciones exactas |
| Radios | 50 % · 999 px · 9999 px · 6 px · .375 · 1 · 1.125 · 1.25 rem | 8 | capa 1: `pill`, `card`, `tag`, `thumb`, `sm` |
| Blur | 110 · 26 · 20 · 14 · 6 · 1 px | 6 | capa 1: `field`, `glass`, `panel`, `soft`, `reveal` |
| Sombras | 13 `box-shadow` distintas | 13 | capa 1: 4 reales (`nav`, `float`, `preview`, `inset`) + glow del logo |
| Movimiento | CSS: 9 duraciones (0.3–1.1 s) + 3 curvas + 6 keyframes · JS: 8 duraciones (0.14–0.62 s) + 3 springs + drawer | **2 rampas disjuntas** | capa 3 única, leída por ambos lados |
| z-index | `-1, 0, 1, 2, 40, 50, 60, 70` + `z-[3]` | 9 | capa 1 semántica: `field/nav/preview/progress/skip` |
| Breakpoints | CSS 560 / 900 / 1024 · Tailwind 640 / 768 / 1024 / 1280 · JS 900 · JS matchMedia 768 y 900 | 4 vocabularios | capa 1 `--breakpoint-*` + un módulo JS que los deriva |
| Superficie/glass | `--glass`, `--line` + literales equivalentes | 3 formas | capa 2, una receta |

Total de fondo: **264 declaraciones con dimensión cruda y sin `var()`** (33 % de las 807).

### 14.3 Los tres agujeros de centralización (estos sí son bugs de arquitectura)

1. **Dos rampas de movimiento.** El CSS transiciona en 0.3/0.35/0.36/0.4/0.5/0.6/0.7/0.9/1.1 s con
   `--ease` (y dos curvas inline); `motion/config.js` mueve GSAP en 0.18/0.26/0.34/0.55/0.62 s con tres
   springs. **No comparten un solo número ni una curva.** "Acelerar la UI" hoy = 24 valores en 2 archivos.
2. **Tres declaraciones del mismo stack de fuentes**, una de ellas (`body`) usando `--font-manrope` en vez
   de `--font-display`: cambiar la fuente del cuerpo no cambia todo el cuerpo.
3. **Cuatro vocabularios de breakpoint con consecuencia visible**: a 800 y 900 px de ancho la nav es la de
   escritorio (`md:` = 768) mientras `.hero-ornament` y `.work-preview` ya están apagados (CSS = 900).

### 14.4 Especificación de tokens (valores copiados del CSS actual, sin redondear)

```css
@theme static {
  /* --- color: sólo los que tienen consumidor (capa 1) ---------------- */
  --color-ink: #060b1a;   --color-night: #0a1226;  --color-deep: #0e1830;
  --color-mist: #16233d;  --color-fog: #c9d6ea;    --color-paper: #eef2ff;
  --color-mut: #c2cde4;   --color-dim: #9eabc4;    --color-sky: #8fcbff;
  --color-coral: #e2727f;
  --color-live: #4ade80;          /* dot de estado, hoy literal         */
  --color-on-solid: #07102a;      /* texto sobre botón blanco, hoy ×3   */

  /* --- tipografía: un solo lugar ------------------------------------- */
  --font-display: var(--font-manrope), ui-sans-serif, system-ui, sans-serif;
  --font-heading: var(--font-space-grotesk), ui-sans-serif, system-ui, sans-serif;
  --font-serif: var(--font-fraunces), Georgia, "Times New Roman", serif;
  --font-mono: ui-monospace, "Cascadia Mono", "Segoe UI Mono", monospace;

  --text-display: clamp(2.6rem, 7.6vw, 7rem);      --text-display--line-height: 1.02;
  --text-display--letter-spacing: -0.04em;
  --text-h2: clamp(2.125rem, 4.6vw, 3.75rem);      --text-h2--line-height: 1.06;
  --text-h2--letter-spacing: -0.035em;
  --text-h3: clamp(1.25rem, 2vw, 1.6rem);          --text-h3--line-height: 1.3;
  --text-lead: clamp(1.0625rem, 1.5vw, 1.25rem);
  --text-statement: clamp(1.625rem, 3.9vw, 3rem);   --text-statement--line-height: 1.16;
  --text-work-title: clamp(1.625rem, 3.4vw, 2.5rem);
  --text-marquee: clamp(3.375rem, 9.5vw, 8.5rem);   --text-marquee--line-height: 1.12;
  --text-bigmail: clamp(1.75rem, 6.2vw, 4.75rem);
  --text-wordmark: clamp(5.5rem, 23vw, 20.5rem);    --text-wordmark--line-height: 0.78;
  --text-ui: 0.9375rem;  --text-ui-sm: 0.875rem;  --text-meta: 0.8125rem;  /* 15/14/13px */
  --text-micro: 0.75rem;  --text-body: 1rem;       --text-copy: 1.0625rem;

  /* --- forma y profundidad ------------------------------------------- */
  --radius-pill: 999px;  --radius-card: 1.25rem;  --radius-spot: 1.125rem;
  --radius-thumb: 1rem;  --radius-sm: 0.375rem;
  --blur-field: 110px;  --blur-glass: 26px;  --blur-panel: 20px;
  --blur-soft: 14px;    --blur-reveal: 6px;
  --shadow-nav: 0 18px 44px -20px rgb(0 0 0 / 0.6);
  --shadow-float: 0 24px 60px -24px rgb(0 0 0 / 0.6);
  --shadow-preview: 0 30px 70px -20px rgb(0 0 0 / 0.7);
  --shadow-inset: inset 0 1px 0 rgb(255 255 255 / 0.1);

  /* --- comportamiento (capa 3): la rampa de las dos capas ------------- */
  --ease-out-field: cubic-bezier(0.2, 0.7, 0.2, 1);   /* hoy --ease          */
  --ease-snap: cubic-bezier(0.23, 1, 0.32, 1);        /* hoy inline ×3       */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);      /* hoy inline ×2       */
  --duration-instant: 0.18s;  --duration-fast: 0.3s;  --duration-base: 0.4s;
  --duration-slow: 0.5s;      --duration-slower: 0.6s;
  --duration-draw: 0.9s;      --duration-reveal: 1.1s;
  --duration-ping: 2.4s;      --duration-orn: 1.15s;
  --stagger-word: 70ms;       --stagger-phrase: 40ms;

  --animate-ping: ping var(--duration-ping) infinite;
  --animate-orn-in: orn-in var(--duration-orn) var(--ease-out-field) both;
  --animate-reveal: r-paint var(--duration-reveal) var(--ease-out-field) backwards;
  --animate-reveal-word: r-word var(--duration-reveal) var(--ease-out-field) backwards;
  --animate-flash: section-flash var(--duration-draw) ease-out;

  /* --- profundidad de capas ------------------------------------------ */
  --z-field: 0;  --z-main: 10;  --z-preview: 40;  --z-nav: 50;  --z-progress: 60;  --z-skip: 70;

  /* --- breakpoints: los del diseño, con nombre ----------------------- */
  --breakpoint-xs: 35rem;    /*  560px */
  --breakpoint-nav: 48rem;   /*  768px, hoy md:  */
  --breakpoint-wide: 56.25rem; /* 900px, hoy el CSS a mano */
}
```

Notas de fidelidad (esto es lo que evita romper la estética):

- los `clamp()` se copian **literales**, con su `line-height` y `letter-spacing` en el mismo token;
- `999px` y `9999px` se unifican a `--radius-pill`: ambos exceden media altura del elemento, así que se
  renderizan como la misma píldora;
- `0.35 s` (`.work-tab`) y `0.36 s` (`.menu-toggle`) colapsan en `--duration-fast` **con pixel-diff de por
  medio**: el desvío es de 50 y 60 ms respectivamente, visible en una captura a mitad de transición;
- la alfa de 25 pasos **no** se tokeniza paso por paso: se define la escalera (`line 9 %`, `glass 5 %`,
  `hover 10 %`, `soft 13 %`, `strong 22 %`) y **toda excepción queda literal con comentario**;
- los tres springs de GSAP siguen en `motion/config.js`: no son expresables como `cubic-bezier` (se
  muestrean a `CustomEase`). Lo que sí se comparte es la rampa de duraciones y las 3 curvas CSS.

### 14.5 Protocolo para no perder la estética (obligatorio, va antes que todo)

1. **Baseline**: 5 anchos (390 / 768 / 900 / 1280 / 1440) × 3 posiciones de scroll (0 / hero-out / footer)
   × 3 idiomas = **45 capturas** con el build actual, guardadas fuera de git (`/tmp` o CI artifact).
2. Cada paso del plan compara contra ese baseline con diff perceptual; **umbral 0.1 %**. Lo que exceda, se
   justifica en el commit o se revierte.
3. `pnpm measure:vitals` antes y después de cada paso que toque CSS (para no cambiar el presupuesto de
   carga sin darse cuenta).
4. Prohibido en la migración: redondear un `clamp()`, cambiar una alfa de 0.09 a 0.1, mover un
   `letter-spacing`, o "aprovechar" para normalizar espaciados de medio grid.

### 14.6 Lo que NO debería ir a variable

- **Los hues del campo** (204–224) y las paradas del gradiente de `.bocanada-field`: parametrizarlos invita
  a re-tematizar, y la regla del repo es *extender, nunca re-tematizar*. Van a capa 2, con nombre y
  comentario.
- **Las fórmulas de composición** (`calc(var(--p) * -30vh)`, `calc(var(--scy) * var(--k) * 1px)`): son
  matemática del movimiento, no tokens.
- **Cada alfa de la escalera**: se tokeniza la escalera, no las 25 excepciones.
- **Los 6 keyframes**: si sólo los consume CSS propio, `--animate-*` alcanza; no hace falta una utilidad
  `animate-*` para cada uno (y `animate-ping` pisaría la de Tailwind: usar nombre propio, `animate-field-ping`).

### 14.7 Plan revisado (reemplaza el orden de §13.3 — ver §15.3 para la secuencia completa)

| # | Paso | Depende de | Criterio de aceptación |
|---|---|---|---|
| **S0** | Baseline de 45 capturas + métricas de §8 | — | artefacto guardado; 45 PNG + JSON de vitals |
| **S1** | Sanear config: sacar `tailwind.config.js` (o `@config`), sacar `autoprefixer`, matar tokens sin consumidor | S0 | build verde; 0 `--color-*` sin consumidor; CSS no crece |
| **S2a** | Colores y alfa: 13 literales sky → token, `#4ade80`/`#07102a` → token, escalera de alfa, `--line`/`--glass` únicos | S1 | `grep` de literales = 0; diff 0 % |
| **S2b** | Tipografía/espaciado/radios/blur/sombras: un stack, escala `--text-*`, `--radius-*`, `--blur-*`, `--shadow-*` | S2a | diff 0 %; 47 `font-size` crudos → ≤ 12 tokens |
| **S2c** | Movimiento: `--ease-*`/`--duration-*`/`--animate-*` y `motion/config.js` leyéndolos | S2b | una sola rampa; ningún `0.xs` literal en CSS ni en config.js |
| **S2d** | Breakpoints y z-index: `--breakpoint-*`, módulo JS único, `--z-*` | S2c | 0 números de breakpoint en JS; capturas en 800/900 idénticas al baseline |
| **S3** | Bucket A → utilidades inline, por sección | S2d | diff ≤ 0.1 % en las 3 anchos clave; `@layer components` ≤ 28 KB |
| **S4** | Bucket B → `@utility`; borrar `.sr-only`, unificar `.focus-ring` | S3 | una definición por receta |
| **S5** | Estados/breakpoints a variantes (`pointer-coarse:`, `max-nav:`) | S4 | 0 media queries de puntero en CSS |
| **S6** | Ordenar el CSS que queda + regla escrita en `AGENTS.md` | S5 | secciones en orden del documento |
| **S7** | `pnpm check:css` (literales, clases muertas, tokens huérfanos, tamaño) | S6 | falla si aparece un literal o crece >5 % |

S0–S2d son **invisibles** (no tocan JSX, diff 0 %): son puro reordenamiento de la fuente de verdad. Ahí está
el 80 % del beneficio de centralización con riesgo casi nulo. S3–S5 son los que mueven código de verdad.

---

## 15. Recomendaciones adoptadas

> Diagnóstico medido de esta parte. El histórico de las sesiones de Cursor (9–15 oct) es la Parte I; el
> fallback sin JS, el plan de testing y el de SEO/GEO/AEO/AIO son las Partes IV, V y VI.

### 15.1 Router: migrar a App Router (decisión)

La doc de Next 16 lo dice explícito ("Pages Router sigue soportado, pero recomendamos migrar al App Router"),
y las features nuevas (PPR, `use cache`, Server Actions, View Transitions) salen primero ahí. Para este
proyecto el beneficio no es genérico, es medible: hoy **la página entera es cliente** — 404 KB de JS en 17
requests para servir texto estático y 7 imágenes. Con App Router, Work/About/Contact dejan de mandar JS.

| Criterio | Pages (hoy) | App Router |
|---|---|---|
| Peso inicial en mobile | todo el árbol hidrata | sólo islas (field, nav, work preview, footer/Bebop) |
| 3 rutas idénticas | 3 `page.jsx` + `getStaticProps` triplicado | `[lang]` + `generateStaticParams` |
| `<head>` | ~40 líneas de `<meta>` en `Layout.jsx` | `generateMetadata` por ruta |
| `<html lang>` | truco en `_document.js` con header del proxy | `lang` prop del layout raíz |
| Reveal de página completa | `useRevealOnEnter` obliga a un efecto cliente global | al arreglar P0-1 (CSS-only) **desaparece** ese efecto |

**Condición sin la cual no vale la pena:** si se migra y todo queda `"use client"` (como hoy `Layout`), se paga
el refactor y se hidrata lo mismo. El pago de la migración es que el contenido estático deje de ser cliente.

### 15.2 Qué se adopta, en orden de impacto

| # | Adopción | Por qué | Verificación |
|---|---|---|---|
| 1 | **P0 de §10** (reveal sin JS, dueño único del scroll, tiers) | 11 → 60 fps en hardware sin GPU; los títulos dejan de desaparecer | los criterios de §11 |
| 2 | **Scroll-driven animations nativas** (`animation-timeline: scroll()/view()`) | Chrome/Edge 115+, **Firefox 159+**, **Safari 26+** (~88 % global) y degrada sola; corre en el compositor: mata el desfase de 0.5 s y el rAF del parallax | `--p` y el parallax sin JS; mismo pixel-diff |
| 3 | **RUM real** (`useReportWebVitals` → Speed Insights o endpoint propio) | todo el diagnóstico actual es de laboratorio; el lag reportado es de campo | p75 de LCP/INP por dispositivo en el dashboard |
| 4 | **`content-visibility: auto` + `contain-intrinsic-size`** por sección | el documento de ~860 nodos deja de layoutearse entero al cargar | LayoutCount del load inicial |
| 5 | **Tokens de §14 (S0–S2d)** | habilita todo lo demás; hoy `--font-display` se ignora en `body` | diff 0 % + greps de §14.7 |
| 6 | **Sacar lastre**: `autoprefixer`, `shadcn` (instalado sin uso), y Lenis si entra scroll-driven | −14 KB y un sistema de suavizado menos | package.json + bundle |
| 7 | **Snapshot versionado de proyectos** (§17) | el scrape es hoy una dependencia frágil de producción (6 de 7 requests dieron 403 en el build) | build sin red |

**No se adopta:** TypeScript big-bang (si se va, por área y con JSDoc de puente), otra librería de animación
(framer-motion sobre GSAP+CSS es sumar un sistema), librería de i18n (la propia está testeada), state manager,
CMS, ni `output: 'export'` (se pierde ISR).

### 15.3 Orden consolidado (reemplaza §11 y §14.7 en cuanto a secuencia)

```
1. P0 render (§10)             → sin JSX nuevo, sin tokens
2. Tokens S0 → S2d (§14.7)     → diff 0 %, red de seguridad de capturas
3. RUM + content-visibility   → medir de verdad antes de refactorizar
4. App Router (§16)            → contenido estático fuera del cliente
5. scroll-driven + Lenis out  → el desfase desaparece de raíz
6. Buckets A/B de Tailwind (§13)
```

Los pasos 1–3 no cambian la estética (diff 0 %) y dejan el sitio medible. El 4 es el que paga la migración.

---

## 16. Plan de migración a App Router

Coexisten `pages/` y `app/` durante toda la migración: se migra ruta por ruta y se borra `pages/` al final.
Riesgo de estética: **nulo** (mismo CSS, mismos componentes). Riesgo real: semántica de hidratación.

### 16.1 Mapa de destino

| Hoy (`pages/`) | Después (`app/`) | Tipo |
|---|---|---|
| `pages/_document.js` (lang por header) | `app/layout.jsx` → `<html lang={locale}>` con `headers()` de `next/headers` | server |
| `pages/_app.js` (fuentes + LocaleProvider) | `app/layout.jsx` (fuentes) + `LocaleProvider` como isla cliente mínima | mixto |
| `pages/index.jsx`, `es.jsx`, `pt.jsx` | `app/page.jsx` (en) + `app/[lang]/page.jsx` con `generateStaticParams` → `es`, `pt` | server |
| `getStaticProps` + `revalidate: 3600` | `export const revalidate = 21600` (6 h, ver §17) + `dynamicParams = false` | server |
| `Layout.jsx` (todo cliente) | `PageFrame` (server: `metadata`, JSON-LD, `AppBackground`, `main`) + `MotionRoot` (isla: `useFieldMotion`, `useSmoothScroll`, `usePointerLight`) | split |
| `next/head` (40 líneas) | `generateMetadata({ params })` con `alternates.languages`, OG por locale | server |
| `pages/404.jsx` | `app/not-found.jsx` | server |
| `src/proxy.js` | **se queda** (mismo nombre y matcher); `x-pf-html-lang` se lee con `headers()` | igual |

### 16.2 Islas cliente (el punto de todo)

| Componente | Server o isla | Nota |
|---|---|---|
| `HeroSection` | **server** | el split y el reveal son CSS; sólo `Magnetic` + `scrollToSection` necesitan isla → `HeroActions` |
| `Marquee` | isla | rAF + IntersectionObserver (o CSS si se adopta scroll-driven) |
| `WorkList` | isla (fase 1) | filas server-renderizadas dentro de la isla; opcional fase 2: filas RSC + isla sólo para tabs/preview |
| `About` | **server** | statement y timeline son CSS/scroll-driven |
| `Contact` | server + isla `CopyButton` | el `mailto` es HTML |
| `Footer` | isla | wordmark con springs + Bebop (`next/dynamic`, `ssr: false`) |
| `AppBackground` + `LiquidEther` | isla | `dynamic` `ssr: false`, montaje diferido (§18) |
| `Navbar` | isla | spy, drawer, indicador |
| `Reveal` / `useRevealOnEnter` | **se elimina** | reemplazado por CSS puro (P0-1) |

### 16.3 Fases, con criterio de aceptación y vuelta atrás

| Fase | Alcance | Criterio de aceptación | Rollback |
|---|---|---|---|
| **A1** | `app/layout.jsx` + `app/page.jsx` (inglés) envolviendo el `Home` actual tal cual, todo `"use client"` | `/` idéntico al baseline; `lang`, canonical y OG correctos | borrar `app/`, `pages/` intacto |
| **A2** | `app/[lang]/page.jsx` + `generateStaticParams`; `proxy.js` apuntando al nuevo árbol | `/es`, `/pt` y el rewrite de `/` funcionando; hreflang en el HTML | revertir 3 archivos |
| **A3** | `generateMetadata` por locale; borrar `next/head` de `Layout` | 14 metas equivalentes 1:1 (diff del `<head>` vacío salvo orden) | volver a `Head` |
| **A4** | Split `PageFrame` (server) / `MotionRoot` (isla) + islas de §16.2 | JS inicial −40 % vs baseline; diff 0 %; sin warnings de hidratación | restaurar `Layout.jsx` |
| **A5** | `revalidate = 21600` + snapshot de §17; borrar `pages/` | build sin red externa; `/`, `/es`, `/pt` prerenderizadas | restaurar `pages/` desde git |

Regla de oro: **una fase = un work-unit commit** y el baseline de capturas (§14.5) corrido en cada una.

### 16.4 Riesgos conocidos y su mitigación

| Riesgo | Mitigación |
|---|---|
| El reveal deja de funcionar al desaparecer `useRevealOnEnter` | se arregla en el paso 1 (CSS-only) **antes** de migrar |
| `Strict Mode` monta dos veces los efectos de las islas (dev) | ya pasa hoy; verificar que `LiquidEther` y `Lenis` limpien bien en `dispose` (lo hacen) |
| `ScrollTrigger` y contenido RSC que cambia de alto | ~~`ScrollTrigger.refresh()` ya está; agregar `ignoreMobileResize` (§10 P2-6)~~ **moot desde el 9 nov 2026**: no hay ScrollTrigger; el re-measure es de `src/motion/scrollProgress.js` (width-only + debounce, §10 P2-6) |
| Metas duplicadas (`Head` + `metadata`) | A3 borra `next/head` en el mismo commit |
| `[lang]` capturando rutas inválidas | `dynamicParams = false` + `not-found` |
| Perder el `~40 líneas` de SEO/GEO | A3 compara el `<head>` renderizado contra el baseline, atributo por atributo |

---

## 17. Datos de proyectos: de scrape frágil a snapshot validado (check cada 6 h)

**Problema medido:** en el build de hoy, **6 de 7 requests a `api.github.com` devolvieron 403** y los links
"Website" se degradaron en silencio; además el parser depende del markup del perfil
(`js-pinned-items-reorder-list`, `class="repo">`). Es un parser de terceros como dependencia de producción.

**Diseño adoptado: un solo check cada 6 h, y el sitio se sirve siempre de caché.**

```
[cron 0 */6 * * *]  →  /api/sync-projects (Vercel Cron, header CRON_SECRET)
                        ├─ fetch perfil + homepages (timeout 4 s, sin redirects fuera de host)
                        ├─ validate()  ← el "check de seguridad", todo o nada
                        └─ OK  → escribe snapshot (data/pinned-projects.json o KV) → revalidate
                           FAIL → conserva el snapshot anterior, log + exit≠0 (fail-closed)
[render]            →  lee SÓLO del snapshot cacheado (ISR 6 h). Nunca habla con GitHub.
```

**`validate()` — reglas (un único check, fail-closed):**

1. sólo `https:`; host en allowlist (`github.com`, `*.github.io`, `vercel.app` + lo declarado en
   `PROJECT_OVERRIDES`); rechaza `javascript:`, `data:`, protocol-relative y URLs con credenciales (`@`);
2. `name` contra `^[A-Za-z0-9._-]{1,100}$`; descripción sin etiquetas HTML, espacios colapsados, ≤240 chars,
   sin caracteres de control;
3. cantidad ≤ `MAX_PINNED_PROJECTS`, sin duplicados por `repoLink`;
4. escritura atómica (tmp + rename) y `sha256` del snapshot en el log de la corrida;
5. si **cualquier** ítem falla, no se escribe nada: el sitio sigue sirviendo el snapshot anterior.

**Efectos:** 0 requests a GitHub desde el render, 4 corridas/día por repo en vez de un fan-out por
revalidación, y el contenido no puede inyectar markup ni schemes raros aunque GitHub cambie. El snapshot vive
versionado en el repo → el build funciona **sin red** (y ese es el criterio de aceptación de §16.3 fase A5).

---

## 18. Campo WebGL: arquitectura de dos capas (revisión 2 — requisito del usuario)

### 18.1 Requisito (esto manda sobre cualquier recomendación anterior)

1. **Los puntos coral con sus destellos tienen que estar siempre**, aunque el lector se detenga a leer y la
   página quede estática.
2. **El humo se disipa siempre hacia la parte de abajo** (el mist vive abajo y se va por abajo). Ese
   comportamiento se conserva.
3. **En mobile no hay humo**: sólo puntos con destellos.
4. Coste en reposo: el mínimo posible, sin impacto en rendimiento.

**¿Es un buen approach?** Sí, y es mejor que el `freeze` de la rev 1: separa la **identidad** (puntos, que
deben vivir siempre) de la **capa cara** (humo, que sólo tiene sentido mientras hay movimiento). Con esa
separación el rAF del campo se puede apagar del todo sin que el sitio se vea muerto — que era el único
motivo por el que existía el `breath` de 143 ms.

La conclusión que se sigue, y que es el corazón de esta revisión: **los puntos no pueden ser parte del
canvas**. Mientras la retícula se dibuje en el shader, tenerla viva obliga a un pase full-screen por frame
(hoy: 6 `fbm` + 5 taps de dye + el grid, cada 143 ms para siempre). Si la retícula se muda a CSS, la
identidad cuesta **cero** y el canvas puede congelarse en reposo.

### 18.2 Dos capas, una por responsabilidad

| Capa | Qué dibuja | Tecnología | Cuándo vive | Coste |
|---|---|---|---|---|
| **1 · identidad** | retícula de puntos coral 48 px + destellos ("parpadeos") | **CSS**: `background-image` con `radial-gradient` (ya existe en `.bocanada-sparks`, `globals.css:303`) + **N elementos `<i>` con `@keyframes` de `opacity`/`transform`** | **siempre**, en todos los dispositivos (incluye mobile) | un raster tiled estático + N animaciones compuestas |
| **2 · humo** | dye + mist, con disipación hacia abajo | shader (`LiquidEther`) **sin el grid** | sólo desktop (`pointer: fine` + ancho ≥ 900 px) y tier ≠ `static`; `active → settling → frozen` | 0 en `frozen` |

Ventajas estructurales, no cosméticas:

- desaparece el problema del **doble origen** de retícula (el CSS admite hoy que "las dos grillas no comparten
  origen"): queda **una sola** retícula, la de CSS, y por construcción `active`, `frozen` y `static` se ven
  idénticos;
- el shader se vuelve más barato (se le quita `coverGrid` del pase final, que es su bloque más caro);
- el `breath` cada 143 ms se elimina: en reposo no hay rAF;
- mobile deja de necesitar WebGL para verse igual.

### 18.3 Fases del humo (la capa 2)

| Fase | Disparador | Qué pasa | Coste |
|---|---|---|---|
| `active` | `pointermove`, `wheel`, `touchstart`, `resize`, `visibilitychange` | rAF a ritmo de pantalla, simulación completa, la tinta entra donde está el puntero/scroll | el actual |
| `settling` | 350 ms sin interactuar | medio ritmo ~1.2 s; `dissipation: 0.993` **disipa el dye hacia abajo** (comportamiento que se conserva) | ~50 % por 1.2 s |
| `frozen` | el dye dejó de ser visible (o 2 s duros) | **cancela el rAF**, conserva el último frame (mist abajo, ya quieto) | **0 rAF, 0 GPU, 0 main thread** |

El despertar es **por evento**, nunca por timer. `needsPresent` (ya existe en el componente) fuerza el primer
frame al volver. El scroll cuenta como interacción: si sólo respondiera al puntero, quien lee con la rueda en
desktop nunca vería humo.

Nota de diseño: con el canvas congelado, el mist queda como una **imagen quieta** abajo; los destellos de la
capa 1 siguen vivos encima. Eso es exactamente el requisito 1 + 2 combinados.

### 18.4 Especificación de la retícula viva en CSS (la forma más económica)

**Regla del usuario, que manda:** la retícula de parpadeos vive **sólo en el viewport**, y funciona
**igual en cualquier dispositivo**. Consecuencias de diseño, todas obligatorias:

1. la capa es `position: fixed; inset: 0` (ya lo es: `AppBackground`, `AppBackground.jsx:130-134`), así que
   **nunca se extiende al largo del documento** y el scroll no le hace ningún trabajo;
2. **no depende de tiers ni de `pointer`**: es la capa de identidad, no la capa de humo (§18.6);
3. la **densidad se deriva del viewport** (celdas de 48 px), no de un número fijo, así se ve igual de
   poblada en un teléfono que en un 4K;
4. **cero JavaScript**: 36 elementos servidos en el HTML, con posiciones en `%` del viewport y sobrantes
   apagados por media query. Sin hidratación, sin `ResizeObserver`, sin listeners.

```css
/* Capa 1a: la retícula. Un raster tiled, coste por frame = 0. */
.bocanada-lattice {
  position: absolute; inset: 0;
  contain: strict;                     /* su pintura no invalida nada del documento */
  background-image:
    radial-gradient(circle 1.8px at 50% 50%, rgb(255 226 228 / 0.9), transparent 100%),
    radial-gradient(#e2727f 1.5px, transparent 1.7px);
  background-size: 192px 192px, 48px 48px;   /* mismo origen (0 0) y misma celda 48px que el shader */
  background-position: 0 0;
  opacity: 0.55;
}

/* Capa 1b: destellos. Sólo opacity + transform ⇒ compuestos, cero paint. */
.flare {
  position: absolute; width: 24px; height: 24px; margin: -12px 0 0 -12px;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(255 214 216 / .95), rgb(226 114 127 / .45) 45%, transparent 70%);
  opacity: 0;
  animation: flare var(--dur, 8s) var(--delay, 0s) infinite;
}
@keyframes flare {
  0%, 90%, 100% { opacity: 0; transform: scale(0.6); }
  93%           { opacity: 1; transform: scale(1); }
  96%           { opacity: .6; transform: scale(1.25); }
  98%           { opacity: 0; transform: scale(0.9); }
}

/* Densidad por viewport: mismo aspecto relativo en todo dispositivo. */
@media (max-width: 40rem)  { .flare:nth-child(n+7)  { display: none; } }  /*  ≤640px  →  6 */
@media (min-width: 40.0625rem) and (max-width: 64rem)  { .flare:nth-child(n+13) { display: none; } } /* ≤1024 → 12 */
@media (min-width: 64.0625rem) and (max-width: 100rem) { .flare:nth-child(n+23) { display: none; } } /* ≤1600 → 22 */
/* > 1600px → los 36 */

@media (prefers-reduced-motion: reduce) { .flare { display: none; } }
```

Cómo se eligen las 36 posiciones (`src/data/field-flares.js`, generadas una vez, no en runtime):

- **coordenadas de celda enteras**, nunca porcentajes: la retícula tiene celda fija de 48 px y origen en
  `(0,0)`, así que el centro de un punto está en `n × 48 + 24`. Un destello en `%` del viewport cae *entre*
  puntos y deja de leerse como un golpe sobre el punto. Esto no es teoría: **ya se intentó y se revirtió**
  (ver §19.3);
- secuencia de **baja discrepancia** sobre la grilla de celdas, con la lista ordenada por bandas de viewport:
  las primeras 6 celdas caen dentro de 390×844, las 12 dentro de 1024×768, las 22 dentro de 1600×900 y las 36
  dentro de 1920×1080. Así **todo prefijo** entra en pantalla y queda repartido parejo — sin esto, apagar
  sobrantes con `nth-child` deja huecos y deja destellos fuera del viewport;
- `--dur` entre 7 y 11 s y `--delay` entre 0 y 8 s, todos distintos: entre **1 y 4 destellos encendidos a la
  vez** (fase brillante ≈ 0.6 s). Es a propósito más calmo que el shader (que sostiene ~18 glows simultáneos,
  `~58 % de celdas` por ciclo de 22–34 s): con el lector quieto leyendo, 18 destellos compiten con el texto.

Por qué esto es lo más barato posible: la retícula es **un raster estático** y los destellos son
**elementos compuestos** (opacity/transform), no repintan, no fuerzan layout, no tocan el canvas y no
necesitan JS. El único costo conocido es el que ya está medido en §10 P2-2: una animación CSS infinita
mantiene ~1 recálculo de estilo por frame (231/231 frames idle, 17 ms por 4 s ≈ **0.4 %**), con 6–36 nodos
triviales animando en lugar de uno.

En pestaña de fondo el navegador ya suspende composición y animaciones: no hace falta código extra.

### 18.5 Qué se le quita al shader

`coverGrid()` (`LiquidEther.jsx:604-639`, invocado en `:680`) sale del fragment shader de salida. Ese bloque hace, **por píxel**:
`floor`, `length`, dos `smoothstep`, `hash(cell)`, `hash(cell + cycle)`, `hash` de dos vecinos, tres `step`,
`exp` ×2 y `mix` ×4 — alrededor de 40 % del ALU del pase más caro del campo, y **para dibujar puntos que ahora
son CSS**. Beneficio doble: menos GPU por frame activo y una identidad que ya no depende del canvas.

Se mantiene: `haze`/mist (abajo, con `groundFalloff`), el dye, la disipación, los blobs CSS y el glow del
puntero.

### 18.6 Tiers y mobile (regla de producto)

> **Ojo con el árbol de hoy**: actualmente el shader corre en **todos** los dispositivos. Un gate por
> dispositivo ya se intentó y se revirtió (`8164756`) porque al sacar el canvas en mobile se perdía la
> identidad — los destellos de reemplazo no caían sobre los puntos (§19.3). La tabla de abajo **sólo es válida
> después** de que la retícula con destellos viva en CSS (§19.2); hasta entonces, aplicarla cuesta la firma
> visual.

| Tier | Cuándo | Capa 1 (puntos + destellos) | Capa 2 (humo) |
|---|---|---|---|
| `full` | `pointer: fine`, ancho ≥ 900 px, sin `saveData`, GPU real, DPR ≤ 2 | **CSS, siempre, densidad por viewport** | montado, `pixelRatio = min(dpr, 2)`, sim `0.32 / poisson 12` |
| `lite` | `pointer: fine`, ancho ≥ 900 px, GPU débil o watchdog p95 > 24 ms | **CSS, siempre, densidad por viewport** | montado, `pixelRatio = 1`, sim `0.22 / poisson 8` |
| `static` | **coarse pointer (mobile/tablet)**, `saveData`, `deviceMemory < 4`, ancho < 900 px, o sin WebGL | **CSS, siempre, densidad por viewport** | **no se monta** |

Consecuencia: **en mobile no se descarga ni se monta `three`** (180 KB gz / 712 KB crudos). El ahorro de
mobile es real y no cosmético, porque la retícula ya no lo necesita. `powerPreference: 'default'` en vez de
`'high-performance'` (no tiene sentido despertar la dGPU para un fondo congelado).

### 18.7 Coste comparado

| Momento | Hoy | Con la rev 2 |
|---|---|---|
| Reposo, desktop | 1 draw cada 143 ms + pase full-screen con grid + 4.8 Mpx de blur compuestos + ~1 recalc/frame | **0 rAF**; canvas congelado con el último frame; 24 animaciones compuestas + 1 raster tiled |
| Reposo, mobile | canvas montado + `three` descargado + mismos puntos que la capa CSS ya sabe dibujar | **sin canvas ni descarga de `three`**; sólo CSS |
| Scrolling | sim + pase completo cada frame | igual, con el pase **sin** `coverGrid` (más barato por frame) |
| Watchdog | no existe | 60 frames al montar + 60 en el primer scroll; baja de tier y no vuelve a subir en la sesión |

Los números de la columna derecha son el objetivo a medir con el harness de §8 (criterio: `idle taskMs` y
`RecalcStyleCount` iguales o menores que la variante `reduced-motion` de §8, y p95 de frame sin cambios durante
el scroll).

### 18.8 Criterios de aceptación

1. En reposo, 30 s sin tocar nada: **0 draws** del canvas (verificable con `performance` del renderer o
   contando `requestAnimationFrame` del componente) y los destellos siguen.
2. En mobile (390×844, `hasTouch`): no existe `<canvas>` en el DOM y la retícula + destellos se ven igual que
   en desktop.
2b. Densidad por viewport, sin JS: 390→6, 1024→12, 1440→22, 1920→36 destellos visibles (contados por
   `display` computado). La capa mide exactamente el viewport en todas las posiciones de scroll (no crece con
   el documento).
3. `static` / `frozen` / `active` son **indistinguibles** en la retícula (misma celda 48 px, mismo origen 0 0).
4. El humo se disipa hacia abajo y, al congelarse, el mist queda abajo (no desaparece el degradado inferior).
5. `prefers-reduced-motion`: sin destellos, retícula visible, sin canvas.
6. Pixel-diff del baseline (§14.5) con el humo activo: ≤ 0.1 %, salvo la retícula, que cambia de origen por
   diseño (se aprueba una vez, con captura antes/después al lado).
7. **Cada destello cae sobre el centro de un punto** (test: la distancia entre el centro del `.flare` y el
   centro de celda más cercano es 0, verificado a 390/1024/1440/1920). Es el criterio que faltó la vez
   anterior.

### 18.9 Decisiones cerradas y el único número que queda abierto

Cerrado por el usuario: la retícula con parpadeos se ve **siempre**, en el viewport de **cualquier**
dispositivo, y su densidad se deriva del viewport (§18.4). El humo no existe en mobile y se disipa hacia
abajo (§18.3).

Queda abierto un solo número, y es estético: **la cantidad base de destellos** (36 elementos servidos, de los
cuales se ven 6 / 12 / 22 / 36 según el ancho). Si querés un campo más eléctrico, subí la tabla a 48 y la
densidad a 8 / 16 / 30 / 48: cada destello extra cuesta un elemento compuesto de 24 px, nada.

---

# Parte III — Decisiones (1 nov 2026)

## 19. Retícula de parpadeos: decisión de la capa de identidad

Cierra lo del campo WebGL de la Parte II (**§18**); el diagnóstico medido completo es **§8–§18** (33
hallazgos). Acá queda sólo la decisión cerrada y su regla, para que no derive.

### 19.1 Requisito

1. Los **puntos coral con sus destellos** tienen que estar siempre, aunque el lector se detenga a leer y la
   página quede estática.
2. La retícula de parpadeos vive **sólo en el viewport del usuario**, y funciona **igual desde cualquier
   dispositivo** (mobile incluido).
3. El **humo se disipa siempre hacia la parte de abajo**; en **mobile no hay humo**, sólo puntos y destellos.
4. Coste en reposo: el mínimo posible.

### 19.2 Regla adoptada

| Aspecto | Decisión |
|---|---|
| Alcance de la capa | `position: fixed; inset: 0` — **nunca** se extiende al largo del documento; el scroll no le cuesta nada |
| Dispositivos | **todos**, sin depender de tier, `pointer`, ni ancho: es la capa de identidad |
| Densidad | derivada del **viewport** (celdas de 48 px): ≤640 px → 6 destellos · ≤1024 → 12 · ≤1600 → 22 · mayor → 36 |
| Implementación | **cero JavaScript**: 36 elementos en el HTML con **coordenadas de celda enteras** (`left: calc(var(--cx) * 48px + 24px)`) y `--dur`/`--delay`; sobrantes apagados por media query |
| Propiedades animadas | sólo `opacity` y `transform` (compuestas: no repintan, no fuerzan layout) |
| Selección de posiciones | celdas de la retícula elegidas por banda de viewport (6 dentro de 390×844, 12 dentro de 1024×768, 22 dentro de 1600×900, 36 dentro de 1920×1080) con secuencia de baja discrepancia → **todo prefijo** cae adentro y repartido parejo |
| Cadencia | ciclos de 7–11 s, fase brillante ≈0.6 s → 1–4 destellos encendidos a la vez (más calmo que el shader, que sostiene ~18) |
| Reduced motion | destellos apagados, retícula visible |
| Coste en reposo | 0 rAF de canvas · retícula = 1 raster tiled · destellos = animaciones compuestas · ~1 recálculo de estilo por frame (**0.4 %** medido) |

Consecuencia estructural: **la retícula sale del shader**. Mientras estaba adentro, tenerla viva obligaba a un
pase full-screen cada 143 ms para siempre. Mudada a CSS, el canvas puede congelarse en reposo (0 draws) y
**mobile se queda sin descargar `three`** (180 KB gz). Además desaparece el problema del doble origen de
retícula: queda una sola.

Del shader se elimina `coverGrid()` (`LiquidEther.jsx:604-639`) — ~40 % del ALU de su pase más caro.
El humo queda como capa aparte, con fases `active → settling → frozen` y despertar por evento, detallado en
§18.3.

### 19.3 Lo que ya se intentó y por qué falló (evidencia)

En la sesión del 31/10 hubo un intento de exactamente esta idea —sacar el shader de los teléfonos y cubrir la
identidad con seis `.spark-flare` en CSS— y se revirtió en el commit `8164756`:

> "L21 tried to cover the loss with six CSS `.spark-flare` glows placed as viewport percentages over a fixed
> 48px lattice. **Percentages cannot land on a fixed grid**, so the flares stopped reading as strikes on the
> dots, and the deferred mount left the field missing for seconds on desktop too."

Dos lecciones, las dos incorporadas arriba:

1. **posiciones en coordenadas de celda enteras**, no en porcentajes (de ahí la corrección de §19.2);
2. el gate por dispositivo **no es lo que estaba mal**: se revirtió porque al sacar el canvas en mobile se
   perdió la identidad (quedaban destellos que no golpeaban ningún punto). Con la retícula viva en CSS y los
   destellos sobre las celdas, el gate por dispositivo pasa a ser seguro — y es lo que el dueño pidió ahora
   (§19.1 punto 3).

Nota de coherencia con §18: el árbol actual corre el shader **en todos los dispositivos** otra vez. La tabla de
tiers de §18.6 lo restringe; este apartado documenta por qué ahora sí, y qué tiene que pasar antes
(retícula CSS con destellos sobre la grilla) para que el recorte no vuelva a costar la identidad.

### 19.4 Criterios de aceptación

- Reposo de 30 s: **0 draws** del canvas y los destellos siguen.
- Mobile 390×844: **sin `<canvas>`** en el DOM, 6 destellos, misma retícula que desktop.
- Densidad sin JS: 6 / 12 / 22 / 36 según ancho, contada por `display` computado.
- La capa mide exactamente el viewport en cualquier posición de scroll.
- El humo se disipa hacia abajo y al congelarse el mist queda abajo.
- `prefers-reduced-motion`: sin destellos, retícula visible, sin canvas.
- **Cada destello cae sobre el centro de un punto**: la distancia entre el centro del `.flare` y el centro de
  celda más cercano (origen del tile + `n × 48 + 24`) es 0, a 390 / 1024 / 1440 / 1920 px. Es el criterio que
  faltó en el intento de `8164756`.

---

# Parte IV — Sin JavaScript (1 nov 2026)

## 20. Fallback sin JavaScript (medido)

Pregunta: si el visitante tiene JS completamente deshabilitado, ¿la web mantiene un mínimo de calidad
respecto al diseño original? **Respuesta: parcialmente. El contenido está, la navegación en mobile no, y hay
tres títulos de sección que no se leen.**

### 20.1 Cómo se midió

Chrome real con `javaScriptEnabled: false`, servidor de producción (`pnpm build && pnpm start`), dos
perfiles: 1440×900 y 390×844 (`isMobile`, DPR 2). Se inspeccionó el DOM computado, no el HTML fuente.

Contexto: la sesión del 31/10 ya había verificado que el sitio **es SSG** (HTML servido con hero, lead, email
y footer; 0 canvas sin JS). Esta pasada confirma eso y encuentra lo que aquella no miró: los `h2` recortados,
la navegación mobile y los controles inertes.

### 20.2 Qué sobrevive (verificado)

| Se mantiene | Evidencia |
|---|---|
| Idioma y SEO | `<html lang="es">`, `<title>`, metas y JSON-LD vienen del HTML |
| Hero completo y su entrada | `data-r="paint"` es animación CSS; 7/7 palabras visibles |
| Statement de About legible | `@media (scripting: none)` lleva `.sw` a `opacity: 1` (medido: todas en 1) |
| Campo visual | 0 `<canvas>`, retícula CSS (`.bocanada-sparks`) + blobs en su estado asentado |
| Imágenes | `next/image` renderiza `<img>` con `src`; sin JS cargan |
| CTAs del hero | son anchors nativos (`#portfolio`, `#contact`): scroll nativo, funcionan |
| Cambio de idioma | anchors `?lang=es/pt` con navegación dura: funciona |
| Sin overflow horizontal | `scrollWidth === innerWidth` en ambos perfiles |
| Nada más oculto | 0 elementos con `opacity < 0.9` en viewport |

### 20.3 Qué se rompe (verificado)

| Roto | Evidencia | Severidad |
|---|---|---|
| **Los 3 `h2` de sección son invisibles** | **19 de 26 palabras** de `.w > span` desplazadas fuera de su caja (`translateY(112%)`); sólo se liberan con `.is-in`, que pone JS | **P0** |
| **Navegación imposible en mobile** | `.nav-links` = `display: none`; el drawer necesita JS; el hamburguesa se ve (`toggleVisible: true`) y no hace nada | **P0 (mobile)** |
| **Controles muertos** | 5 filtros de trabajo, "Copiar mail" y el tagline de Bebop (`role="button"`) se ven y no responden | P1 |
| Decoración ausente | barra de progreso `scaleX(0)`; rail del timeline `scaleY(0)` por `--tlp: 0` (`globals.css:78,1499`); marquesina quieta; indicador del nav oculto | aceptable |

Y no hay **ni un `<noscript>` propio**: el único que aparece en el HTML es el de Next (`data-n-css`).

### 20.4 Plan de fallback

1. **Palabras visibles por defecto.** El estado oculto lo pone JS (`<html class="js">` inline en el documento);
   el default CSS es legible y la animación entra por clase/keyframe. Arregla P0-1 y P0-4 de una vez.
   *Criterio:* con JS off, **0 palabras desplazadas**.
2. **Navegación sin JS.** El drawer pasa a `<details>/<summary>` (funciona sin JS) o, mínimo, un `<noscript>`
   con los tres anchors de sección y el toggle oculto salvo `html.js`.
   *Criterio:* en 390 px con JS off se llega a `#portfolio`, `#about` y `#contact` en un tap.
3. **Ningún control que mienta.** Lo que depende de JS se oculta sin JS (`js-only`) salvo que tenga equivalente
   estático: el botón de copiar se oculta (el `mailto:` gigante ya cumple), los filtros se ocultan (la lista
   muestra todo por default), el tagline queda como texto sin `role="button"`.
4. **Completar `@media (scripting: none)`**: `.w > span { transform: none }`,
   `.timeline::after { transform: scaleY(1) }`, `.field-progress { display: none }`.
5. **Gate en CI**: el test de §21.2 (`e2e/no-js`) impide la regresión.

### 20.5 Lo que no se pretende sin JS

Filtros, copiar al portapapeles, Bebop y humo necesitan JS y está bien. El estándar es más simple y más
duro: **contenido completo, navegación completa, cero controles que mienten.**

---

# Parte V — Testing (1 nov 2026)

## 21. Testing: suites y gates que bloquean el merge

El objetivo no es "cobertura": es que **ninguno de los 33 hallazgos de §10 pueda volver** y que
la estética no derive. Hoy hay 5 tests unitarios (`src/lib/*.test.js`), 3 scripts e2e y `measure:vitals`; falta
todo lo que convierte eso en un contrato.

### 21.1 Principios

1. Un test por **regla observable**, no por archivo.
2. El test atraviesa la **interfaz pública** (DOM computado, CSS compilado, HTTP), nunca el estado interno.
3. Determinismo: **sin red** en CI (el snapshot de proyectos está versionado), sin `sleep`, sin fechas.
4. Un fallo se reproduce con **un comando**, sin leer el código del test.
5. Los umbrales son **números**, no adjetivos: fallan el build.
6. Si un test no puede fallar por una razón concreta, no se escribe.
7. Nada de snapshots gigantes de HTML: se afirman propiedades.

### 21.2 Matriz de suites

| Suite | Herramienta | Qué afirma | Gate |
|---|---|---|---|
| **Unit** | `node:test` | i18n (paridad, locale), links, monogramas, `heading-accent`, y **nuevo**: `validate()` del snapshot, tabla de destellos, contraste de tokens calculado | bloquea |
| **Contract CSS** | `node:test` leyendo `globals.css` + CSS compilado | invariantes del sistema (abajo, §21.3) | bloquea |
| **E2E funcional** | Playwright | 3 rutas × 3 idiomas: sin errores de consola, sin warnings de hidratación, anclas resuelven, filtros filtran, drawer abre/cierra con foco atrapado y restaurado, copiar con clipboard simulado, Bebop abre/cierra | bloquea |
| **E2E sin JS** (§20) | Playwright `javaScriptEnabled: false` | 0 palabras desplazadas, navegación alcanzable, 0 controles muertos visibles | bloquea |
| **E2E motion** | Playwright + `reducedMotion` | con `reduce`: sin destellos, sin canvas, contenido completo; animaciones apagadas | bloquea |
| **Visual regression** | Playwright screenshots | baseline 45 capturas (§14), umbral 0.1 % | bloquea |
| **Performance** | CDP (`measure:vitals` + harness de scroll) | presupuestos de §21.3 en 3 perfiles: desktop, mobile 4× CPU, **software GL** | bloquea |
| **A11y** | axe-core + walkthrough de teclado | 0 críticos/serios; foco, skip-link, drawer, contraste desde tokens | bloquea |

### 21.3 Los gates duros (números)

**Performance**
- LCP ≤ 2500 ms · CLS ≤ 0.1 · TBT ≤ 300 ms · JS inicial ≤ 260 KB (ya existen en `measure:vitals`).
- Scroll: **p95 de frame ≤ 24 ms y jank ≤ 2 %** en desktop 1440 y mobile 390 con CPU 4×.
- **Software GL (SwiftShader)**: p95 ≤ 24 ms con los tiers activos (hoy: 150 ms → el gate es el que obliga
  a que existan).
- Reposo 10 s: **0 draws del canvas**, `RecalcStyleCount ≤ 1.5/frame`, `TaskDuration ≤ 100 ms`.
- Load: **0 long tasks > 250 ms**.
- Presupuesto de blur: superficie total con `filter/backdrop` **≤ 2 Mpx** a 1440×900 (hoy 4.83).

**Contract CSS** (los tests que atrapan los bugs de esta sesión)
- bajo `(scripting: none)` y `(prefers-reduced-motion: reduce)`: **ninguna palabra desplazada** y `.statement`
  legible;
- todo `--color-*` de `@theme` tiene consumidor, y **no hay hex/rgb literal fuera de `@theme`**;
- ningún canal de movimiento (`--scy/--p/--px/--py`) se escribe sobre un ancestro de más de N nodos;
- `--line` y `--glass` son la única fuente de su valor;
- **paridad de breakpoints**: el conjunto de anchos de `matchMedia`/`innerWidth` en JS ⊆ el de las media
  queries de CSS (hoy: 4 vocabularios, 800–900 px roto);
- **paridad de movimiento**: cada duración/curva de `motion/config.js` existe como token `--duration-*`/`--ease-*`.

**Seguridad y datos**
- `validate()` fail-closed: `javascript:`, `data:`, URL con credenciales, host fuera de allowlist, HTML en la
  descripción, nombre inválido, > MAX_PINNED, duplicados → **8 casos que deben rechazar** y conservar el
  snapshot anterior;
- `pnpm audit --prod --audit-level=high` → 0;
- CSP sin `unsafe-eval` fuera de dev (hoy es report-only: el test falla cuando se vuelva enforcing con eval).

**Calidad**
- `eslint` 0 errores, `check:motion` OK, `validate:bebop` OK, `check:css` (literales, clases muertas, tokens
  huérfanos, delta de tamaño del CSS ≤ 5 %).

### 21.4 Qué hallazgo agarra cada suite (trazabilidad)

| Suite | Habría frenado |
|---|---|
| Contract CSS | P0-1 (títulos sin JS), P1-1 (canal en ancestro), tokens fantasma de §14, `--line` duplicado |
| E2E sin JS | P0-1, P0-4 (nav mobile), controles muertos |
| Performance mobile | P1-1, P1-2, P2-2 (`ping` infinito), P2-8 (wordmark) |
| Performance software GL | P0-3 (ausencia de tiers) |
| Synchrony test (`--p` vs scroll < 100 ms) | P0-2 (desfase de 0.5 s) |
| Paridad de breakpoints | P2-25 (800–900 px) |
| Paridad de movimiento | P2-24 (dos rampas disjuntas) |
| Visual regression | cualquier deriva de estética en la migración Tailwind / App Router |
| A11y + contraste de tokens | P2-10 (nombre duplicado), contraste AA de la paleta |
| Datos | el 403 silencioso del build (§17) |

### 21.5 CI

`.github/workflows/quality.yml`, jobs en paralelo (objetivo < 8 min): `lint` · `unit` · `contract` · `build` ·
`e2e` (matriz: desktop / mobile / no-js / reduced) · `visual` · `perf` (matriz: desktop / mobile-4x /
software-gl) · `a11y`. Los ocho son **required checks**. Artefactos por corrida: `vitals.json` por perfil,
`screenshots/` del diff visual y `trace.zip` cuando un e2e falla.

### 21.6 Definition of Done (para cualquier cambio futuro)

Un cambio no está listo si: (1) no tiene un test que falle sin él; (2) no corre las 8 suites; (3) cambia la
estética sin actualizar el baseline con justificación; (4) agrega un literal de color; (5) rompe no-JS; (6)
empeora cualquier presupuesto de §21.3; (7) agrega un control que depende de JS sin estado sin-JS; (8) no
actualiza la Parte II o III de este documento si cambia una decisión que ahí se documenta.

### 21.7 Qué NO se testea (y por qué)

Snapshots de HTML completo (ruidosos, nadie los lee), unit tests de componentes de presentación (probados por
el e2e visual), mocks de GSAP/ScrollTrigger (se testea el resultado en el DOM), cobertura como número objetivo
(mide líneas, no comportamiento), y scroll con `sleep` fijo (se espera por señal).

---

# Parte VI — SEO, GEO, AEO, AIO (1 nov 2026)

Objetivo: que el sitio sea **encontrable** (SEO), **citado por motores generativos** (GEO), **elegido como
respuesta** (AEO) y **legible por agentes y AI Overviews** (AIO). Todo lo de abajo está verificado contra el
árbol actual, no es una lista de buenas prácticas genéricas.

## 22. Estado actual (verificado)

| Pieza | Estado | Dónde |
|---|---|---|
| HTML prerenderizado por idioma, `<html lang>` real | ✅ | `_document.js`, `src/pages/{index,es,pt}.jsx` |
| `<title>`, description, author, canonical, 5 `hreflang` (incluye `x-default`) | ✅ | `Layout.jsx:35-70` |
| OG + Twitter completos (`og:image:alt`, `summary_large_image`) | ✅ | `Layout.jsx:70-95` |
| JSON-LD: `Person`, `WebSite`, `WebPage`, `ItemList` → `SoftwareSourceCode` | ✅ | `SiteJsonLd.jsx` |
| Imágenes con `next/image` (AVIF/WebP), favicons, manifest, `theme-color` | ✅ | `next.config.js`, `public/` |
| ISR + prerender por idioma (sin swap en cliente) | ✅ | `revalidate: 3600` |
| **Sitemap con una sola URL** | ❌ | `public/sitemap.xml`: sólo `/`, sin `/es`, `/pt`, sin `lastmod`, sin alternates |
| **OG image cuadrada 640×640** para `summary_large_image` | ❌ | `public/profile-hero.webp` (`og:image`, `twitter:image`), sin `og:image:width/height` |
| **`/` sirve 3 idiomas** con `Vary: Accept-Language, Cookie` + `Set-Cookie` | ⚠️ | `src/proxy.js:87-105` |
| JSON-LD ignora la formación (`EDUCATION`) | ❌ | `constants.js:28`, ausente en `SiteJsonLd.jsx` |
| Sin `dateModified` / fecha visible de actualización | ❌ | — |
| `robots.txt` sin reglas para crawlers de IA; sin `llms.txt` | ❌ | `public/robots.txt` |
| Sin páginas por proyecto (7 proyectos detrás de 1 URL) | ❌ | `WorkList.jsx` |
| Sin Q&A citable (`FAQPage`) ni `ProfilePage` | ❌ | — |
| `theme_color` del manifest ≠ meta `theme-color` (`#02122d` vs `#060b1a`) | ⚠️ | `site.webmanifest` vs `Layout.jsx` |
| Sin medición (Search Console, RUM) | ❌ | — |

## 23. Los cuatro acentos, y qué cambia en cada uno

| Disciplina | Qué premia | Palanca principal en este repo |
|---|---|---|
| **SEO** | crawl, index, ranking clásico | sitemap completo + hreflang consistente + canonical único por idioma + Core Web Vitals (§21) |
| **GEO** | ser **recuperado y citado** por motores generativos (Perplexity, ChatGPT Search, Gemini) | HTML con los hechos en crudo (sin depender de JS), `llms.txt`, entidades claras, hechos atómicos y fechados |
| **AEO** | ser **la respuesta** (snippet, voz) | Q&A visibles con `FAQPage`, respuestas de 40–60 palabras, headings en forma de pregunta |
| **AIO** | AI Overviews de Google + agentes | datos machine-readable (`/projects.json`), `dateModified`, coherencia de entidades, nada crítico detrás de hidratación |

**La conexión con la Parte II que hay que ver primero:** el P0-1 (`19` palabras de los `h2` fuera de su caja,
§10) es un problema **SEO/AIO antes que de diseño**. Un crawler que *no* renderiza (la mayoría de los de IA)
lee el DOM y ve el texto; un crawler que *sí* renderiza —Google, y con él los AI Overviews— ve tres títulos
de sección en blanco. **Arreglar §10 P0-1 es la acción de mayor impacto de toda esta parte**, y ya está
presupuestada.

## 24. Plan, por fases

| # | Acción | Criterio de aceptación |
|---|---|---|
| **S1** | **Sitemap completo**: 3 URLs (`/`, `/es`, `/pt`), `lastmod` desde el `generatedAt` del snapshot (§17) y `<xhtml:link rel="alternate" hreflang>` cruzados | `test` que parsee el XML: 3 `loc`, cada una con 3 alternates + `x-default`, `lastmod` ISO válido |
| **S2** | **OG card 1200×630 por idioma** (wordmark + rol + ciudad), `og:image:width/height`, `twitter:creator`; dejar de usar el retrato cuadrado como tarjeta | ruta `/og/{lang}.png` responde `image/png` 1200×630; metas declaran dimensiones |
| **S3** | **Canonical determinista**: `/` siempre inglés, `/es` y `/pt` como URLs reales (el switcher navega a la ruta). Alternativa conservadora: mantener el rewrite y emitir `canonical` a la ruta del idioma — pero el `Vary` sigue fragmentando caché | `/` responde `en` sin `Accept-Language`; una sola URL por idioma con `hreflang` recíproco; `Vary` sin `Cookie` en HTML público |
| **S4** | **JSON-LD rico**: `ProfilePage` con `mainEntity: Person`, `alumniOf` desde `EDUCATION` (`EducationalOccupationalProgram`), `dateModified`, y por proyecto `programmingLanguage`, `codeRepository`, `applicationCategory` | validador de schema (test de §21): 0 errores, 0 warnings de propiedad desconocida |
| **S5** | **Crawlers de IA, decidido explícitamente**: bloques en `robots.txt` para `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`, `CCBot`, `Applebot-Extended`; `llms.txt` con el índice de la Parte II de contenido; `/projects.json` (el snapshot de §17 ya es JSON) | `robots.txt` con 8 bloques nombrados; `/llms.txt` y `/projects.json` responden 200 `text/plain`/`application/json` con schema |
| **S6** | **Superficie citable**: una URL por proyecto (`/work/<slug>` + `/es`, `/pt`), con stack, problema, resultado, demo y "última actualización"; y 4 Q&A visibles con `FAQPage` construidas **sólo** con datos existentes (`SKILLS`, `LOCALITY`, estado de disponibilidad, `EDUCATION`) | 7 URLs nuevas prerenderizadas + alternates; `FAQPage` cuyo texto coincide 1:1 con lo visible; 0 contenido generado fuera de los datos del repo |

Dependencias: S1–S3 son de SEO puro y no tocan el diseño. S4–S5 son aditivos (metadatos y archivos).
S6 es el único que agrega páginas y conviene hacerlo **después** de la migración a App Router (§16), porque
`generateStaticParams` las deja gratis.

## 25. Medición (sin humo)

| Qué | Cómo | Frecuencia |
|---|---|---|
| Indexación y queries | Search Console + Bing Webmaster (sitemap enviado) | semanal, primera vez |
| Visitas de crawlers de IA | logs de Vercel filtrados por user-agent (`GPTBot`, `ClaudeBot`, `PerplexityBot`) | mensual |
| Citabilidad | 5 prompts fijos ("¿quién es Agustín Ciucani?", "portfolio full-stack Argentina", "Next.js developer Buenos Aires"…) contra 3 motores, registrando si cita el sitio | trimestral, a mano |
| Salud técnica | las suites de §21 (schema válido, sitemap completo, no-JS, CWV) | en cada PR |

No existe una métrica de GEO equivalente a una posición en Google: los proxies honestos son **presencia del
hecho en el HTML**, **crawlers que entran**, y **citas observadas**. Cualquier promesa de "subir X % en IA" es
humo.

## 26. Lo que NO se hace (y por qué)

- **Schema que no coincide con el contenido visible** (FAQPage con preguntas que nadie ve): viola las
  guidelines de Google y es motivo de penalización.
- **Cloaking por user-agent** (servir distinto a `GPTBot`): riesgo real, no beneficio.
- **Keyword stuffing** en `meta description` o en el copy del hero: el diseño actual está bien escrito y
  optimizado para lectura; el copy no se toca por SEO.
- **Contenido generado sin revisar** en páginas de proyecto: los datos salen de `projects.js`, del snapshot
  (§17) y de lo que ya existe en el repo.
- **Perseguir "AIO" con trucos**: Google no documenta un schema especial para AI Overviews; lo que funciona es
  lo mismo que SEO + entidades coherentes + contenido renderizable.
- **Bloquear a todos los bots de IA por default** sin decisión: hoy están permitidos por el `*` de
  `robots.txt`. Si se decide bloquear, que sea explícito y con razón escrita acá.
