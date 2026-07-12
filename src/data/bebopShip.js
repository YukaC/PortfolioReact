/**
 * Single source of truth — Swordfish II Three.js WebGL silhouette fly-by.
 * Replaces V14 literal MP4 approach. See SPEC.md §G / §V14 (superseded).
 */

import { SHOTS_TOTAL_MS } from "./bebopShots.js";

export const BEBOP_SHIP = {
  /** GLTF scene loaded by Three.js GLTFLoader */
  gltfUrl: "/bebop/scene.gltf",
  /** Binary buffer referenced by scene.gltf — warm via fetch, not drei barrel */
  binUrl: "/bebop/scene.bin",
  /** Total WebGL animation duration — derived from keyframe timeline */
  durationMs: SHOTS_TOTAL_MS,
  /** Retained for meta.json / V11 invariant compatibility */
  fps: 30,
  frameCount: 76,
  width: 1920,
  height: 1080,
  /** Brief hold after animation completes before phase handoff */
  holdAfterPlaybackMs: 200,
};

/** @typedef {"idle" | "warming" | "ready" | "failed"} BebopGltfStatus */

/** @type {Promise<void> | null} */
let gltfPrefetchPromise = null;
/** @type {Promise<unknown> | null} */
let sceneChunkPromise = null;
/** @type {BebopGltfStatus} */
let gltfStatus = "idle";

/** Sync gate — true once GLTF + bin are HTTP-cached (hover prefetch or prior run). */
export function isBebopGLTFCached() {
  return gltfStatus === "ready";
}

export function isBebopGLTFFailed() {
  return gltfStatus === "failed";
}

export function getBebopGLTFStatus() {
  return gltfStatus;
}

/**
 * Dev-only QA query param (`?bebopDebug=ship|full`).
 * Always null outside development so production URLs cannot trigger it.
 * @returns {"ship" | "full" | string | null}
 */
export function getBebopDebugMode() {
  if (typeof window === "undefined") return null;
  if (process.env.NODE_ENV !== "development") return null;
  return new URLSearchParams(window.location.search).get("bebopDebug");
}

/**
 * Warm GLTF assets (hover / CRT_ON — before SHIP mount).
 * Uses fetch() so we don't pull the @react-three/drei barrel (mediapipe, etc.).
 * useGLTF on mount reuses the HTTP cache.
 */
export function prefetchBebopGLTF(config = BEBOP_SHIP) {
  if (typeof window === "undefined") return Promise.resolve();
  if (gltfStatus === "ready") return Promise.resolve();
  if (gltfStatus === "failed") {
    return Promise.reject(new Error("Bebop GLTF prefetch previously failed"));
  }
  if (!gltfPrefetchPromise) {
    gltfStatus = "warming";
    gltfPrefetchPromise = Promise.all([
      fetch(config.gltfUrl),
      fetch(config.binUrl),
    ])
      .then((responses) => {
        const failed = responses.find((r) => !r.ok);
        if (failed) throw new Error(`Bebop prefetch ${failed.status}`);
        // Consume bodies so the response is fully cached.
        return Promise.all(responses.map((r) => r.arrayBuffer()));
      })
      .then(() => {
        gltfStatus = "ready";
      })
      .catch((err) => {
        gltfStatus = "failed";
        gltfPrefetchPromise = null;
        throw err;
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

/** GLTF + scene chunk in parallel — call on hover / CRT_ON. */
export function prefetchBebopAssets(config = BEBOP_SHIP) {
  return Promise.all([
    prefetchBebopGLTF(config),
    prefetchBebopSceneChunk(),
  ]).then(() => undefined);
}

export function bebopShipPhaseMs(config = BEBOP_SHIP) {
  return config.durationMs + config.holdAfterPlaybackMs;
}

/** True when the user prefers reduced motion (skip WebGL/GSAP). */
export function prefersBebopReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
