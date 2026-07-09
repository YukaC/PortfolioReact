/**
 * Keyframes calibrados pixel-a-pixel contra public/bebop/refPng (76 frames,
 * 1280×720 @ 30fps → 2.5333s, extraídos 1:1 del MP4 de referencia — ver
 * refBebop.md §5–6: nariz = +Z world → restYawY = −π/2 → nariz −X).
 *
 * Metodología: cada `ship.position[0]` se derivó invirtiendo la fórmula de
 * proyección de cámara (fov=40°, y=16, aspect 16:9 → visibleWidth≈20.685u)
 * a partir del % de pantalla medido en el frame de referencia (nose = borde
 * izquierdo de la silueta negra, excluyendo halo del trail amarillo).
 * Excepción: keyframe `offscreen` (t=0) pone la nave past rightEdge
 * vía `offscreenRightX()` para fly-in visible antes del freno/flare —
 * no viene de refPng. Runtime reescribe L/R según aspect real (V26).
 *
 * Thin trail length authored ≈ rightEdge−tailX @ 16:9; runtime
 * (`BebopShipScene` useFrame) estira a `halfW − tailX` para cubrir
 * todo el ancho detrás de la nave en cualquier aspect.
 *
 * `rotation.z` (roll sobre el eje nariz-cola): el ángulo objetivo por
 * keyframe se derivó primero invirtiendo spanY medido vía modelo elíptico
 * (a=16.01 semi-wingspan θ=0, b=5.09 semi-alto fuselaje θ=90°) — pero esa
 * inversión frame-a-frame daba velocidad angular MUY dispareja entre
 * segmentos (156°/s → 511°/s → 158°/s...), que se percibe como "cortes"
 * en el roll aunque no haya ningún `cut:true`. Fix: rampa LINEAL de
 * velocidad angular constante (348.5°/s) entre flare (t=1.2, θ=0°) y
 * trail-exit (t=2.233, θ=360°) — un barrel-roll completo, sin kinks.
 *
 * SHIP_SCALE se calibró para que wingspan (9.1936u) llene 32% del alto de
 * viewport en la silueta de reposo (f01–34), igual que en refPng.
 */

/** Fondo CRT negro puro (pidió reemplazar el navy por negro estilo intro) */
export const BEBOP_BG = "#000000";
/** Nave + estela: blanco neón (bloom en postprocesado las hace "glow") */
export const BEBOP_TRAIL = "#FFFFFF";
export const BEBOP_SHIP_COLOR = "#FFFFFF";

/**
 * scale = 0.32 * visibleHeight(11.647u) / wingspan(9.1936u) ≈ 0.4055
 * Verificado con captura real: nose%/spanY% coinciden con refPng (±0.2%).
 */
export const SHIP_SCALE = 0.4055;

/** Nariz +Z → −X pantalla (refBebop.md §6) */
export const YAW_LEFT = -Math.PI / 2;

/**
 * Cola tip en local X post-yaw ≈ 4.55 (raw, refBebop.md). Trail ancla
 * desde ahí hacia +X — debe escalarse por SHIP_SCALE (bug corregido).
 */
export const TAIL_AFT_X = 4.55;

/**
 * Nariz tip en local |X| post-yaw ≈ 6.3194 (raw world +Z, refBebop.md).
 * Nose world X = ship.x − NOSE_FWD_Z·SHIP_SCALE.
 */
export const NOSE_FWD_Z = 6.3194;

/** Cámara top-down fija — composición tipo cel, no tracking */
export const BEBOP_CAM_Y = 16;
export const BEBOP_CAM_FOV = 40;
const CAM = { position: [0, BEBOP_CAM_Y, 0.01], target: [0, 0, 0] };

const deg = (d) => (d * Math.PI) / 180;

/**
 * Half-width del frustum top-down (fov vertical + aspect).
 * @param {number} aspect width/height
 */
export function bebopHalfWidth(aspect = 16 / 9) {
  const halfH =
    BEBOP_CAM_Y * Math.tan(((BEBOP_CAM_FOV / 2) * Math.PI) / 180);
  return halfH * aspect;
}

/** Margen past edge para que silueta no clippee al entrar/salir */
export const OFFSCREEN_MARGIN = 1.2;

/**
 * ship.x mínimo para que la nariz quede past rightEdge.
 * @param {number} halfW
 */
export function offscreenRightX(halfW = bebopHalfWidth()) {
  return halfW + NOSE_FWD_Z * SHIP_SCALE + OFFSCREEN_MARGIN;
}

/**
 * ship.x máximo para que la cola quede past leftEdge.
 * @param {number} halfW
 */
export function offscreenLeftX(halfW = bebopHalfWidth()) {
  return -halfW - TAIL_AFT_X * SHIP_SCALE - OFFSCREEN_MARGIN;
}

/**
 * @typedef {{
 *   t: number,
 *   id: string,
 *   bgColor: string,
 *   camera: { position: [number, number, number], target: [number, number, number] },
 *   ship: { position: [number, number, number], rotation: [number, number, number] },
 *   trail: { visible: boolean, length: number, width: number, flare: boolean },
 *   cut?: boolean,
 *   ease?: string,
 * }} BebopKeyframe
 *
 * `ease` = GSAP ease for shipPos tween INTO this keyframe (default "none").
 * Solo approach freno (enter/brake-settle/pre-flare); roll post-flare = none (V20).
 */

/**
 * Off-screen right @ 16:9 fallback (runtime reescribe con frustum real).
 * nose past rightEdge ≈ 10.34 → ship.x ≥ 12.91; 13.8 da margen.
 */
const OFFSCREEN_RIGHT_X = offscreenRightX(bebopHalfWidth(16 / 9));
/** Off-screen left @ 16:9 fallback — cola past leftEdge */
const OFFSCREEN_LEFT_X = offscreenLeftX(bebopHalfWidth(16 / 9));

/** @type {BebopKeyframe[]} */
export const BEBOP_SHOTS = [
  // t0: nave completamente fuera por derecha (antes del fly-in)
  {
    t: 0,
    id: "offscreen",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [OFFSCREEN_RIGHT_X, 0, 0], rotation: [0, YAW_LEFT, 0] },
    trail: { visible: false, length: 0, width: 0.06, flare: false },
  },
  // Approach: deceleración + coast residual hasta el glow.
  // ⊥ hold en x fijo (se siente como “muerte” de movimiento pre-flare).
  {
    t: 1.05,
    id: "enter",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [6.15, 0, 0], rotation: [0, YAW_LEFT, 0] },
    trail: { visible: false, length: 0, width: 0.06, flare: false },
    ease: "power1.out",
  },
  // Coast lento derecha — ease none = velocidad residual constante
  {
    t: 1.4,
    id: "brake-settle",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [6.65, 0, 0], rotation: [0, YAW_LEFT, 0] },
    trail: { visible: false, length: 0, width: 0.06, flare: false },
    ease: "none",
  },
  // Sigue derivando hacia la pose de flare (nunca x idéntico al siguiente)
  {
    t: 1.75,
    id: "pre-flare",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [6.95, 0, 0], rotation: [0, YAW_LEFT, 0] },
    trail: { visible: false, length: 0, width: 0.06, flare: false },
    ease: "none",
  },
  // f35–36: glow chico — llega a 7.15 aún en movimiento
  {
    t: 1.95,
    id: "pre-glow",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [7.15, 0, 0], rotation: [0, YAW_LEFT, 0] },
    trail: { visible: true, length: 0.7, width: 0.4, flare: true },
    cut: true,
  },
  // f37–38: FLARE — corte seco
  {
    t: 2.017,
    id: "flare",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [7.15, 0, 0], rotation: [0, YAW_LEFT, 0] },
    trail: { visible: true, length: 3.2, width: 2.8, flare: true },
    cut: true,
  },
  // f39–41: flare muere, roll a velocidad angular constante desde 0°
  {
    t: 2.084,
    id: "post-flare",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [6.57, 0, 0], rotation: [0, YAW_LEFT, deg(23.3)] },
    trail: { visible: true, length: 2.0, width: 1.1, flare: true },
  },
  // f42–43: silueta breve sin amarillo
  {
    t: 2.184,
    id: "post-sil",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [6.01, 0, 0], rotation: [0, YAW_LEFT, deg(58.2)] },
    trail: { visible: false, length: 0, width: 0.06, flare: false },
  },
  // f44: trail fino ON
  {
    t: 2.25,
    id: "trail-r1",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [5.41, 0, 0], rotation: [0, YAW_LEFT, deg(81.2)] },
    trail: { visible: true, length: 3.1, width: 0.05, flare: false },
  },
  // f47: roll ≈cerca de 90° — casi de canto, spanY mínimo
  {
    t: 2.35,
    id: "trail-r2",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [4.87, 0, 0], rotation: [0, YAW_LEFT, deg(116.1)] },
    trail: { visible: true, length: 3.6, width: 0.05, flare: false },
  },
  // f49: pasa 90°, empieza a desenrollarse
  {
    t: 2.417,
    id: "trail-r3",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [3.9, 0, 0], rotation: [0, YAW_LEFT, deg(139.4)] },
    trail: { visible: true, length: 4.6, width: 0.048, flare: false },
  },
  {
    t: 2.517,
    id: "trail-r4",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [2.97, 0, 0], rotation: [0, YAW_LEFT, deg(174.2)] },
    trail: { visible: true, length: 5.5, width: 0.046, flare: false },
  },
  {
    t: 2.584,
    id: "trail-r5",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [1.98, 0, 0], rotation: [0, YAW_LEFT, deg(197.6)] },
    trail: { visible: true, length: 6.5, width: 0.045, flare: false },
  },
  // f57: roll ≈cerca de 180° — nivelada otra vez, spanY máximo
  {
    t: 2.684,
    id: "trail-r6",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [1.08, 0, 0], rotation: [0, YAW_LEFT, deg(232.4)] },
    trail: { visible: true, length: 7.4, width: 0.044, flare: false },
  },
  // f59–63: segundo medio-roll (segundo mínimo spanY)
  {
    t: 2.75,
    id: "trail-r7",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [-0.12, 0, 0], rotation: [0, YAW_LEFT, deg(255.5)] },
    trail: { visible: true, length: 8.6, width: 0.043, flare: false },
  },
  {
    t: 2.784,
    id: "trail-r8",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [-1.25, 0, 0], rotation: [0, YAW_LEFT, deg(267.3)] },
    trail: { visible: true, length: 9.7, width: 0.042, flare: false },
  },
  {
    t: 2.85,
    id: "trail-r9",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [-2.42, 0, 0], rotation: [0, YAW_LEFT, deg(290.3)] },
    trail: { visible: true, length: 10.9, width: 0.04, flare: false },
  },
  {
    t: 2.884,
    id: "trail-r10",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [-3.58, 0, 0], rotation: [0, YAW_LEFT, deg(302.1)] },
    trail: { visible: true, length: 12.1, width: 0.04, flare: false },
  },
  // f64–68: desenrolla de vuelta a 360°(=0°), sale por izquierda
  {
    t: 2.917,
    id: "trail-r11",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [-4.73, 0, 0], rotation: [0, YAW_LEFT, deg(313.6)] },
    trail: { visible: true, length: 13.2, width: 0.038, flare: false },
  },
  {
    t: 2.95,
    id: "trail-r12",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [-5.83, 0, 0], rotation: [0, YAW_LEFT, deg(325.2)] },
    trail: { visible: true, length: 14.3, width: 0.037, flare: false },
  },
  {
    t: 3.017,
    id: "trail-r13",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [-6.89, 0, 0], rotation: [0, YAW_LEFT, deg(348.5)] },
    trail: { visible: true, length: 15.4, width: 0.036, flare: false },
  },
  // f68: nariz sale de cuadro, roll completo (360°, nivelada)
  // OJO: usar 360 y no 0 — gsap lerpea el número crudo, volver a 0 haría
  // que gire "para atrás" medio círculo en vez de seguir hacia adelante.
  // trail.length @ 16:9 = rightEdge − tailX; runtime estira al frustum real.
  {
    t: 3.05,
    id: "trail-exit",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: { position: [-7.42, 0, 0], rotation: [0, YAW_LEFT, deg(360)] },
    trail: { visible: true, length: 15.9, width: 0.035, flare: false },
  },
  // f70–76: nave sale past leftEdge; posiciones interpolan hacia OFFSCREEN_LEFT_X
  {
    t: 3.117,
    id: "trail-out1",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: {
      position: [-7.42 + 0.251 * (OFFSCREEN_LEFT_X + 7.42), 0, 0],
      rotation: [0, YAW_LEFT, deg(360)],
    },
    trail: { visible: true, length: 17.0, width: 0.035, flare: false },
  },
  {
    t: 3.217,
    id: "trail-out2",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: {
      position: [-7.42 + 0.625 * (OFFSCREEN_LEFT_X + 7.42), 0, 0],
      rotation: [0, YAW_LEFT, deg(360)],
    },
    trail: { visible: true, length: 18.6, width: 0.035, flare: false },
  },
  // f76: hold final — cola past leftEdge
  {
    t: 3.317,
    id: "trail-hold",
    bgColor: BEBOP_BG,
    camera: CAM,
    ship: {
      position: [OFFSCREEN_LEFT_X, 0, 0],
      rotation: [0, YAW_LEFT, deg(360)],
    },
    trail: { visible: true, length: 20.2, width: 0.035, flare: false },
  },
];

export const SHOTS_TOTAL_MS = Math.round(
  BEBOP_SHOTS[BEBOP_SHOTS.length - 1].t * 1000,
);
