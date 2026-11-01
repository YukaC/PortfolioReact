/**
 * Quality tiers for the WebGL field (audit.md §10 P0-3, §18.6; feature spec S3).
 *
 * The field used to decide whether to mount at all by looking only at
 * `navigator.connection`, and then ran the same simulation on a workstation and
 * on a machine that renders WebGL in software — the measured result on
 * SwiftShader was 87 ms per frame, 98 % of frames over 32 ms. The tier answers a
 * narrower question than "mount or not": **how much may this device spend on a
 * background**. `resolveTier` is the pure decision, `watchdogTier` is the only
 * thing allowed to change it afterwards, and it can only change it downwards.
 *
 * In this run the tiers do not gate the canvas by device. Removing the canvas
 * before the coral lattice with cell-aligned flares lives in CSS loses the
 * visual identity (audit.md §19.3, commit `8164756` was reverted for exactly
 * that); the device gate belongs to task T6. So `static` means "cheapest canvas",
 * not "no canvas".
 */

/** Cheapest last: the order is the downgrade path, not a preference. */
export const TIERS = Object.freeze(["full", "lite", "static"]);

/** The scroll budget the field has to fit into (§21.3: p95 ≤ 24 ms). */
export const FRAME_P95_BUDGET_MS = 24;

/** 60 frames ≈ one second at display rate: enough to see a stall, short enough
    to downshift inside the first interaction. */
export const WATCHDOG_FRAMES = 60;

/** Below this width the plume is not worth a full-rate simulation. */
export const MIN_FIELD_WIDTH = 900;

/** Chromium's `deviceMemory` is a coarse bucket (0.25 / 0.5 / 1 / 2 / 4 / 8). */
export const LOW_MEMORY_GB = 4;

const FEW_CORES = 2;

const SLOW_CONNECTIONS = new Set(["slow-2g", "2g", "3g"]);

/* Renderers that mean "there is no GPU": SwiftShader and ANGLE's software
   backend, Mesa's llvmpipe/softpipe/swrast, and the fallbacks that advertise
   themselves as software or as a basic render driver. */
const SOFTWARE_RENDERERS = [
  /swiftshader/i,
  /llvmpipe/i,
  /softpipe/i,
  /swrast/i,
  /\bsoftware\b/i,
  /basic render/i,
];

/** `true` when the reported WebGL renderer is a CPU rasterizer. */
export function isSoftwareRenderer(renderer) {
  if (typeof renderer !== "string" || renderer.length === 0) return false;
  return SOFTWARE_RENDERERS.some((pattern) => pattern.test(renderer));
}

/**
 * The tier a device starts in.
 *
 * Most restrictive rule first, so a device that hits several of them lands on
 * the cheapest and not on the first one checked. `renderer`, `deviceMemory` and
 * `hardwareConcurrency` are optional: a browser that hides them is not treated
 * as broken, it is simply not downshifted for a reason we cannot see.
 *
 * @param {{
 *   renderer?: string,
 *   webgl?: boolean,
 *   saveData?: boolean,
 *   effectiveType?: string,
 *   pointerCoarse?: boolean,
 *   width?: number,
 *   deviceMemory?: number,
 *   hardwareConcurrency?: number,
 * }} [env]
 * @returns {"full" | "lite" | "static"}
 */
export function resolveTier(env = {}) {
  const {
    renderer = "",
    webgl = true,
    saveData = false,
    effectiveType = "",
    pointerCoarse = false,
    width = 0,
    deviceMemory,
    hardwareConcurrency,
  } = env ?? {};

  // --- static: nothing to gain, or an explicit request for less ------------
  if (!webgl) return "static";
  if (saveData) return "static";
  if (pointerCoarse) return "static";
  if (width > 0 && width < MIN_FIELD_WIDTH) return "static";
  if (SLOW_CONNECTIONS.has(effectiveType)) return "static";
  if (typeof deviceMemory === "number" && deviceMemory > 0 && deviceMemory < LOW_MEMORY_GB) {
    return "static";
  }

  // --- lite: a real GPU path that cannot hold the full budget --------------
  if (isSoftwareRenderer(renderer)) return "lite";
  if (
    typeof hardwareConcurrency === "number" &&
    hardwareConcurrency > 0 &&
    hardwareConcurrency <= FEW_CORES
  ) {
    return "lite";
  }

  return "full";
}

/** The next cheapest tier. `static` is the floor: it never moves again. */
export function downgradeTier(tier) {
  if (tier === "full") return "lite";
  if (tier === "lite") return "static";
  return "static";
}

/**
 * p95 of a set of frame intervals, nearest-rank: the smallest sample that is at
 * or above 95 % of the set. With 60 samples that is the 57th.
 */
export function frameP95(frameTimes) {
  if (!Array.isArray(frameTimes) || frameTimes.length === 0) return 0;
  const sorted = [...frameTimes].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[index];
}

/**
 * What one watchdog run says about the current tier.
 *
 * It moves **one** step at most, and only when the p95 of the observed frames
 * is over budget. It never promotes: a device that recovers does not get its
 * frames handed back inside the same session, so the page cannot oscillate
 * between two qualities while the reader scrolls.
 */
export function watchdogTier(tier, frameTimes) {
  if (!Array.isArray(frameTimes) || frameTimes.length === 0) return tier;
  if (frameP95(frameTimes) <= FRAME_P95_BUDGET_MS) return tier;
  return downgradeTier(tier);
}

/**
 * Reads the environment `resolveTier` wants from a real browser.
 *
 * Not part of the pure decision (the unit test drives `resolveTier` with a plain
 * object), and never imported at module load on the server: it returns `null`
 * without a `window`. The WebGL probe creates a throwaway context to learn the
 * renderer string and releases it immediately, so the field's own context is the
 * only one alive.
 */
export function readTierEnv() {
  if (typeof window === "undefined") return null;
  const connection = navigator.connection ?? null;
  const probe = probeWebgl();
  return {
    renderer: probe.renderer,
    webgl: probe.webgl,
    saveData: Boolean(connection?.saveData),
    effectiveType: connection?.effectiveType ?? "",
    pointerCoarse: window.matchMedia("(pointer: coarse)").matches,
    width: window.innerWidth,
    deviceMemory: navigator.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
  };
}

function probeWebgl() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return { webgl: false, renderer: "" };
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    // Two live contexts for one background is a waste the browser may charge
    // for: drop this one as soon as the string is read.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return { webgl: true, renderer: String(renderer ?? "") };
  } catch {
    return { webgl: false, renderer: "" };
  }
}
