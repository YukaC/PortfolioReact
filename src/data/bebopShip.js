/**
 * Single source of truth — Swordfish II Three.js WebGL silhouette fly-by.
 * Replaces V14 literal MP4 approach. See SPEC.md §G / §V14 (superseded).
 */

export const BEBOP_SHIP = {
  /** GLTF scene loaded by Three.js GLTFLoader */
  gltfUrl: "/bebop/scene.gltf",
  /** Total WebGL animation duration — approach hold + fly-by (V28) */
  durationMs: 3400,
  /** Retained for meta.json / V11 invariant compatibility */
  fps: 30,
  frameCount: 76,
  width: 1920,
  height: 1080,
  /** Brief hold after animation completes before phase handoff */
  holdAfterPlaybackMs: 200,
};

/** @type {Promise<void> | null} */
let gltfPrefetchPromise = null;
/** @type {Promise<unknown> | null} */
let sceneChunkPromise = null;
let gltfCached = false;

/** Sync gate — true once GLTF + bin are HTTP-cached (hover prefetch or prior run). */
export function isBebopGLTFCached() {
  return gltfCached;
}

/** Warm GLTF assets (hover / CRT / idle — before SHIP mount). */
export function prefetchBebopGLTF(config = BEBOP_SHIP) {
  if (typeof window === "undefined") return Promise.resolve();
  if (gltfCached) return Promise.resolve();
  if (!gltfPrefetchPromise) {
    gltfPrefetchPromise = import("@react-three/drei")
      .then(({ useGLTF }) => {
        const result = useGLTF.preload(config.gltfUrl);
        return result instanceof Promise ? result : Promise.resolve();
      })
      .then(() => {
        gltfCached = true;
      })
      .catch(() => {
        // Still mark cached so SHIP isn't blocked forever on a failed warm.
        gltfCached = true;
      });
  }
  return gltfPrefetchPromise;
}

/**
 * Warm the dynamic `BebopShipScene` webpack chunk (three/r3f/gsap/post).
 * Cold start after hard reload pays compile+download here — do it early
 * so SHIP mount doesn't wait (V34).
 */
export function prefetchBebopSceneChunk() {
  if (typeof window === "undefined") return Promise.resolve();
  if (!sceneChunkPromise) {
    sceneChunkPromise = import("@/components/bebop/BebopShipScene").catch(
      () => null,
    );
  }
  return sceneChunkPromise;
}

/** GLTF + scene chunk in parallel — call on idle / hover / CRT_ON. */
export function prefetchBebopAssets(config = BEBOP_SHIP) {
  return Promise.all([
    prefetchBebopGLTF(config),
    prefetchBebopSceneChunk(),
  ]).then(() => undefined);
}

/** @deprecated alias — use isBebopGLTFCached */
export function isBebopGltfCached() {
  return isBebopGLTFCached();
}

/** @deprecated alias — use isBebopGLTFCached */
export function isBebopVideoCached() {
  return isBebopGLTFCached();
}

/** @deprecated alias — use prefetchBebopGLTF */
export function prefetchBebopGltf(config = BEBOP_SHIP) {
  return prefetchBebopGLTF(config);
}

/** @deprecated alias — use prefetchBebopGLTF */
export function prefetchBebopVideo(config = BEBOP_SHIP) {
  return prefetchBebopGLTF(config);
}

/** @deprecated alias — use prefetchBebopGLTF */
export function prefetchBebopModel(config = BEBOP_SHIP) {
  return prefetchBebopGLTF(config);
}

/** @deprecated alias — use isBebopGLTFCached */
export function isBebopSheetCached() {
  return isBebopGLTFCached();
}

/** @deprecated alias — use prefetchBebopGLTF */
export function prefetchBebopSheet(config = BEBOP_SHIP) {
  return prefetchBebopGLTF(config);
}

export function bebopShipPhaseMs(config = BEBOP_SHIP) {
  return config.durationMs + config.holdAfterPlaybackMs;
}
