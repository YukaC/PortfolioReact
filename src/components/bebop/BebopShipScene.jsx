"use client";

import {
  Suspense,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Color, Vector3, Euler } from "three";
import { gsap } from "gsap";
import ShipModel from "./ShipModel";
import HalftoneEffect from "./HalftoneEffect";
import {
  BEBOP_BG,
  BEBOP_SHOTS,
  BEBOP_TRAIL,
  SHIP_SCALE,
  TAIL_AFT_X,
  YAW_LEFT,
  OUT1_FRAC,
  OUT2_FRAC,
  bebopHalfWidth,
  offscreenLeftX,
  offscreenRightX,
} from "@/data/bebopShots";
import { getBebopDebugMode, prefersBebopReducedMotion } from "@/data/bebopShip";
import styles from "./bebop.module.css";

/** Offset local (post-yaw) escalado — refBebop.md tail tip ≈ 4.55 raw */
const TAIL_AFT_X_SCALED = TAIL_AFT_X * SHIP_SCALE;

/** Micro-bob approach (enter→pre-glow): screen-up = −Z. ⊥ roll/trail (V29).
 * Amps bajos — residual barely-there, no wobble notorio. */
const APPROACH_BOB_END_T = 1.95;
const BOB_Z_AMP = 0.018;
const BOB_Z_FREQ = 3.4;
const BOB_X_AMP = 0.006;
const BOB_X_FREQ = 4.6;

/** Camera punch @ flare cut (t≈2.017) — X/Z only, keep top-down Y (V31). */
const FLARE_PUNCH_T = 2.017;
const PUNCH_AMP_X = 0.12;
const PUNCH_AMP_Z = 0.09;
const PUNCH_DUR = 0.12;

function detectLowEnd() {
  if (typeof window === "undefined") return false;
  const mobile = window.matchMedia("(max-width: 768px)").matches;
  const cores = navigator.hardwareConcurrency || 8;
  return mobile || cores <= 4;
}

/** Thin wake — box world-aligned (cola → rightEdge). */
function NeonTrail({ trailRef }) {
  return (
    <mesh ref={trailRef} visible={false} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={BEBOP_TRAIL} toneMapped={false} />
    </mesh>
  );
}

/**
 * Flare / explosión — esfera (vista top-down = círculo, como refPng
 * f35–41). Segmentos bajos — silueta basta bajo Bloom.
 */
function NeonFlare({ flareRef }) {
  return (
    <mesh ref={flareRef} visible={false} frustumCulled={false}>
      <sphereGeometry args={[0.5, 12, 8]} />
      <meshBasicMaterial color={BEBOP_TRAIL} toneMapped={false} />
    </mesh>
  );
}

/**
 * Reescribe offscreen L/R + trail-out según aspect real del canvas.
 * Trail thin se estira en useFrame; acá solo posiciones de nave.
 */
function resolveShotsForAspect(aspect) {
  const halfW = bebopHalfWidth(aspect);
  const rightX = offscreenRightX(halfW);
  const leftX = offscreenLeftX(halfW);

  const shots = BEBOP_SHOTS.map((s) => ({
    ...s,
    ship: {
      ...s.ship,
      position: /** @type {[number, number, number]} */ ([
        ...s.ship.position,
      ]),
    },
    trail: { ...s.trail },
  }));

  const byId = Object.fromEntries(shots.map((s) => [s.id, s]));
  if (byId.offscreen) byId.offscreen.ship.position[0] = rightX;
  if (byId["trail-hold"]) byId["trail-hold"].ship.position[0] = leftX;

  const exitX = byId["trail-exit"]?.ship.position[0] ?? -7.42;
  const span = leftX - exitX;
  if (byId["trail-out1"]) {
    byId["trail-out1"].ship.position[0] = exitX + OUT1_FRAC * span;
  }
  if (byId["trail-out2"]) {
    byId["trail-out2"].ship.position[0] = exitX + OUT2_FRAC * span;
  }

  return shots;
}

function applyKeyframe(s, shot) {
  const [cx, cy, cz] = shot.camera.position;
  const [tx, ty, tz] = shot.camera.target;
  const [sx, sy, sz] = shot.ship.position;
  const [rx, ry, rz] = shot.ship.rotation;
  const col = new Color(shot.bgColor);
  s.camPos.set(cx, cy, cz);
  s.camTarget.set(tx, ty, tz);
  s.shipPos.set(sx, sy, sz);
  s.shipRot.set(rx, ry, rz);
  s.bgColor.setRGB(col.r, col.g, col.b);
  s.trailLen = shot.trail.length;
  s.trailWidth = shot.trail.width;
  s.trailVisible = shot.trail.visible ? 1 : 0;
  s.trailFlare = shot.trail.flare ? 1 : 0;
}

function disposeObject3D(obj) {
  if (!obj) return;
  obj.geometry?.dispose?.();
  const mat = obj.material;
  if (Array.isArray(mat)) mat.forEach((m) => m?.dispose?.());
  else mat?.dispose?.();
}

function BebopScene({ onReady, playing }) {
  const { camera, scene, size, invalidate } = useThree();
  const shipRef = useRef(null);
  const trailRef = useRef(null);
  const flareRef = useRef(null);
  const tlRef = useRef(null);
  const shipLoadedRef = useRef(false);
  const readyFiredRef = useRef(false);
  /** Rising-edge punch — ⊥ mutate s.camPos (GSAP owns it). */
  const punchRef = useRef({
    primed: false,
    prevT: 0,
    age: 0,
    active: false,
    dx: 0,
    dz: 0,
  });

  const state = useRef({
    camPos: new Vector3(0, 16, 0.01),
    camTarget: new Vector3(0, 0, 0),
    shipPos: new Vector3(offscreenRightX(), 0, 0),
    shipRot: new Euler(0, YAW_LEFT, 0),
    bgColor: new Color(BEBOP_BG),
    trailLen: 0,
    trailWidth: 0.06,
    trailVisible: 0,
    trailFlare: 0,
  });

  const handleShipModelReady = useCallback(() => {
    shipLoadedRef.current = true;
    // Start timeline only once the GLTF is actually in the scene.
    const tl = tlRef.current;
    if (tl && tl.paused()) {
      tl.play(0);
    }
    invalidate();
  }, [invalidate]);

  useFrame((_, delta) => {
    const s = state.current;
    const punch = punchRef.current;
    const t = tlRef.current?.time() ?? 0;

    // Gate onReady: ship visible + first rendered frame after timeline play.
    if (
      shipLoadedRef.current &&
      !readyFiredRef.current &&
      tlRef.current &&
      !tlRef.current.paused()
    ) {
      readyFiredRef.current = true;
      onReady?.();
    }

    // Edge-detect flare t — fire once per pass (debugLoop re-arms on wrap).
    if (!punch.primed) {
      punch.prevT = t;
      punch.primed = true;
    } else if (t < punch.prevT) {
      punch.prevT = t;
    } else {
      if (punch.prevT < FLARE_PUNCH_T && t >= FLARE_PUNCH_T) {
        punch.active = true;
        punch.age = 0;
        punch.dx = PUNCH_AMP_X * (Math.random() < 0.5 ? -1 : 1);
        punch.dz = PUNCH_AMP_Z * (Math.random() < 0.5 ? -1 : 1);
      }
      punch.prevT = t;
    }

    let ox = 0;
    let oz = 0;
    if (punch.active) {
      punch.age += delta;
      const u = Math.min(punch.age / PUNCH_DUR, 1);
      const decay = (1 - u) * (1 - u); // ease-out quad ~120ms
      ox = punch.dx * decay;
      oz = punch.dz * decay;
      if (u >= 1) punch.active = false;
    }

    // Top-down: up must NOT be parallel to view (−Y). Use −Z so
    // screen-right = +X, screen-up = −Z → nariz (−X) queda a la izquierda.
    camera.up.set(0, 0, -1);
    camera.position.copy(s.camPos);
    camera.position.x += ox;
    camera.position.z += oz;
    camera.lookAt(s.camTarget);

    if (shipRef.current) {
      shipRef.current.position.copy(s.shipPos);
      shipRef.current.rotation.copy(s.shipRot);

      // Residual drift pre-flare — ⊥ frozen hold (V29). Off after glow/flare.
      const approachBob =
        t < APPROACH_BOB_END_T && s.trailFlare < 0.5 && s.shipPos.x > 0;
      if (approachBob) {
        shipRef.current.position.z += Math.sin(t * BOB_Z_FREQ) * BOB_Z_AMP;
        shipRef.current.position.x += Math.sin(t * BOB_X_FREQ) * BOB_X_AMP;
      }
    }

    scene.background = s.bgColor;

    const halfW = bebopHalfWidth(
      size.width > 0 && size.height > 0 ? size.width / size.height : 16 / 9,
    );
    const tailX = s.shipPos.x + TAIL_AFT_X_SCALED;
    const isFlare = s.trailFlare > 0.5;
    const trailOn = s.trailVisible > 0.5;

    // Flare = círculo (esfera top-down) en cola — refPng f35–41.
    // Thin trail = box cola→rightEdge. Mutuamente excluyentes.
    const flare = flareRef.current;
    if (flare) {
      const showFlare = trailOn && isFlare;
      flare.visible = showFlare;
      if (showFlare) {
        // Diameter ≈ trailWidth (authored). Peak flare width=2.8 → círculo
        // grande tipo puff; pre-glow 0.4 → chispa chica.
        const diam = Math.max(s.trailWidth, 0.05);
        flare.scale.set(diam, diam, diam);
        flare.position.set(tailX, s.shipPos.y, s.shipPos.z);
      }
    }

    const trail = trailRef.current;
    if (trail) {
      const showTrail = trailOn && !isFlare;
      trail.visible = showTrail;
      if (showTrail) {
        const len = Math.max(halfW - tailX, 0.01);
        // Hairline cross-section — Bloom (intensity 1.4) fattens glow;
        // base geom thin so wake reads as line vs ribbon (refPng f44+).
        trail.scale.set(len, 0.022, 0.014);
        trail.rotation.set(0, 0, 0);
        trail.position.set(tailX + len * 0.5, s.shipPos.y, s.shipPos.z);
      }
    }

    // Demand-mode: keep ticking only while the GSAP timeline is active.
    if (playing && tlRef.current?.isActive()) {
      invalidate();
    }
  });

  const buildTimeline = useCallback(() => {
    const s = state.current;
    const debugLoop = getBebopDebugMode() === "ship";
    const seekT =
      typeof window !== "undefined"
        ? Number(new URLSearchParams(window.location.search).get("t") ?? NaN)
        : NaN;

    // Aspect una sola vez al montar — trail thin se adapta en useFrame.
    // ⊥ rebuild on resize (rompería onReady / V24).
    let aspect = 16 / 9;
    if (size.width > 0 && size.height > 0) {
      aspect = size.width / size.height;
    } else if (typeof window !== "undefined" && window.innerHeight > 0) {
      aspect = window.innerWidth / window.innerHeight;
    }
    const shots = resolveShotsForAspect(aspect);

    // Paused until ShipModel signals ready — don't burn phase time without ship.
    const tl = gsap.timeline({
      paused: true,
      repeat: debugLoop ? -1 : 0,
    });

    // Pose inicial = primer keyframe (offscreen past rightEdge)
    applyKeyframe(s, shots[0]);

    for (let i = 1; i < shots.length; i++) {
      const prev = shots[i - 1];
      const shot = shots[i];
      const t0 = prev.t;
      const t1 = shot.t;
      const dur = Math.max(t1 - t0, 0.001);

      const [cx, cy, cz] = shot.camera.position;
      const [tx, ty, tz] = shot.camera.target;
      const [sx, sy, sz] = shot.ship.position;
      const [rx, ry, rz] = shot.ship.rotation;
      const col = new Color(shot.bgColor);
      const trailProps = {
        trailLen: shot.trail.length,
        trailWidth: shot.trail.width,
        trailVisible: shot.trail.visible ? 1 : 0,
        trailFlare: shot.trail.flare ? 1 : 0,
      };

      if (shot.cut) {
        // Cut = snap seco de trail on/off + bg. shipPos/Rot SIGUEN
        // lerpeando — ⊥ freeze de movimiento en hold pre-glow (V28).
        // trailWidth/Len lerpean (V30) — ⊥ hard square pops de diámetro.
        tl.set(s.camPos, { x: cx, y: cy, z: cz }, t1);
        tl.set(s.camTarget, { x: tx, y: ty, z: tz }, t1);
        tl.to(
          s.shipPos,
          { x: sx, y: sy, z: sz, duration: dur, ease: "none" },
          t0,
        );
        tl.to(
          s.shipRot,
          { x: rx, y: ry, z: rz, duration: dur, ease: "none" },
          t0,
        );
        tl.set(s.bgColor, { r: col.r, g: col.g, b: col.b }, t1);
        tl.set(
          s,
          {
            trailVisible: trailProps.trailVisible,
            trailFlare: trailProps.trailFlare,
          },
          t1,
        );
        const widthEase =
          shot.trail.width >= prev.trail.width ? "power2.out" : "power2.in";
        tl.to(
          s,
          {
            trailLen: trailProps.trailLen,
            trailWidth: trailProps.trailWidth,
            duration: dur,
            ease: widthEase,
          },
          t0,
        );
      } else {
        // Fly-by continuo. shipPos puede llevar ease (freno approach);
        // rot/cam/trail quedan "none" (V20 roll = velocidad angular constante).
        const shipEase = shot.ease ?? "none";
        tl.to(
          s.camPos,
          { x: cx, y: cy, z: cz, duration: dur, ease: "none" },
          t0,
        );
        tl.to(
          s.camTarget,
          { x: tx, y: ty, z: tz, duration: dur, ease: "none" },
          t0,
        );
        tl.to(
          s.shipPos,
          { x: sx, y: sy, z: sz, duration: dur, ease: shipEase },
          t0,
        );
        tl.to(
          s.shipRot,
          { x: rx, y: ry, z: rz, duration: dur, ease: "none" },
          t0,
        );
        tl.to(
          s.bgColor,
          { r: col.r, g: col.g, b: col.b, duration: dur, ease: "none" },
          t0,
        );
        tl.to(s, { ...trailProps, duration: dur, ease: "none" }, t0);
      }
    }

    if (Number.isFinite(seekT)) {
      tl.pause();
      tl.seek(Math.max(0, seekT));
    }

    tlRef.current = tl;

    // If ship already loaded (fast cache), start now.
    if (shipLoadedRef.current && !Number.isFinite(seekT)) {
      tl.play(0);
    }
    // size leído una vez al montar; no re-build on resize
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    buildTimeline();
    return () => {
      tlRef.current?.kill();
      tlRef.current = null;
      disposeObject3D(trailRef.current);
      disposeObject3D(flareRef.current);
    };
  }, [buildTimeline]);

  // Pause RAF when parent says playing=false (ENDCARD fade uses last frame).
  useEffect(() => {
    if (!playing) {
      tlRef.current?.pause();
    } else if (shipLoadedRef.current && tlRef.current?.paused()) {
      // Don't resume mid-flight after ENDCARD — only initial play path.
    }
  }, [playing]);

  return (
    <>
      <NeonTrail trailRef={trailRef} />
      <NeonFlare flareRef={flareRef} />
      <Suspense fallback={null}>
        <ShipModel ref={shipRef} onReady={handleShipModelReady} />
      </Suspense>
    </>
  );
}

export default function BebopShipScene({ onReady, onFailed, playing = true }) {
  const lowEnd = useMemo(() => detectLowEnd(), []);
  const reduced = useMemo(() => prefersBebopReducedMotion(), []);
  const dpr = lowEnd ? 1 : [1, 1.5];
  const enableHalftone = !lowEnd && !reduced;
  const bloomMipmap = !lowEnd && !reduced;
  const readyRef = useRef(false);

  // demand while playing (invalidate from useFrame); never when faded out.
  const frameloop = playing ? "demand" : "never";

  // Suspense hang / GLTF never resolves — only fire if onReady never came.
  useEffect(() => {
    const id = setTimeout(() => {
      if (!readyRef.current) onFailed?.();
    }, 15000);
    return () => clearTimeout(id);
  }, [onFailed]);

  const readyOnce = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onReady?.();
  }, [onReady]);

  return (
    <Canvas
      className={styles.bebopShipCanvas}
      dpr={dpr}
      frameloop={frameloop}
      camera={{ fov: 40, near: 0.1, far: 200, position: [0, 15, 0.01] }}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl, scene, invalidate }) => {
        gl.setClearColor(BEBOP_BG);
        scene.background = new Color(BEBOP_BG);
        invalidate();
      }}
    >
      <BebopScene onReady={readyOnce} playing={playing} />
      <EffectComposer>
        {enableHalftone ? (
          <HalftoneEffect dotSize={3} blendAmount={0.12} />
        ) : null}
        <Bloom
          intensity={1.4}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.3}
          mipmapBlur={bloomMipmap}
          radius={0.6}
        />
      </EffectComposer>
    </Canvas>
  );
}
