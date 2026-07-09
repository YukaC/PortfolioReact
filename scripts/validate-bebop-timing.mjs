#!/usr/bin/env node
/**
 * §V invariants — Bebop ship animation R3F silhouette (see SPEC.md §V)
 * Supersedes V14 (literal MP4 playback) — Approach B R3F invariants.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BEBOP_SHIP, bebopShipPhaseMs } from "../src/data/bebopShip.js";
import { BEBOP_SHOTS, SHOTS_TOTAL_MS } from "../src/data/bebopShots.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseShipPhaseMs(js) {
  if (!js.match(/SHIP:\s*bebopShipPhaseMs\(\)/)) {
    throw new Error("PHASE_TIMINGS.SHIP must use bebopShipPhaseMs()");
  }
  return bebopShipPhaseMs();
}

const css        = readFileSync(join(ROOT, "src/styles/bebop.css"), "utf8");
const constants  = readFileSync(join(ROOT, "src/data/constants.js"), "utf8");
const shipJs     = readFileSync(join(ROOT, "src/components/BebopShip.jsx"), "utf8");
const bebopShipJs= readFileSync(join(ROOT, "src/data/bebopShip.js"), "utf8");
const sceneJs    = readFileSync(join(ROOT, "src/components/bebop/BebopShipScene.jsx"), "utf8");
const meta       = JSON.parse(readFileSync(join(ROOT, "scripts/bebop-ship-meta.json"), "utf8"));

const shipPhase  = parseShipPhaseMs(constants);
const gltfPath   = join(ROOT, "public", BEBOP_SHIP.gltfUrl.replace(/^\//, ""));

const shipPhaseGte = shipPhase >= BEBOP_SHIP.durationMs;
const noVideoTag   = !/<video[\s\S]*?>/.test(shipJs);
const usesDynamic  = /dynamic\(/.test(shipJs) && /ssr\s*:\s*false/.test(shipJs);
const importsScene = /BebopShipScene/.test(shipJs);
const hasGltfGate  = /isBebopGltfCached/.test(shipJs) && /prefetchBebopGltf/.test(shipJs);
const gltfExists   = existsSync(gltfPath);
const gltfPrefetch = /prefetchBebopGltf/.test(bebopShipJs) && /useGLTF\.preload/.test(bebopShipJs);
const syncGltfCache= /isBebopGltfCached/.test(bebopShipJs) && /gltfCached\s*=\s*true/.test(bebopShipJs);
const shotsFile    = existsSync(join(ROOT, "src/data/bebopShots.js"));
const shotCount    = BEBOP_SHOTS.length;
const shotCountOk  = shotCount >= 4 && shotCount <= 40;
const totalDurOk   = SHOTS_TOTAL_MS >= 2400 && SHOTS_TOTAL_MS <= 3600;
const metaDurOk    = meta.durationMs === BEBOP_SHIP.durationMs;
const metaMode     = meta.mode === "r3f-silhouette";
const hasAbsTimes  = BEBOP_SHOTS.every((s, i) => typeof s.t === "number" && (i === 0 || s.t > BEBOP_SHOTS[i - 1].t));
const hasYawLeft   = /YAW_LEFT\s*=\s*-Math\.PI\s*\/\s*2/.test(readFileSync(join(ROOT, "src/data/bebopShots.js"), "utf8"));
const halftoneFile = existsSync(join(ROOT, "src/components/bebop/HalftoneEffect.jsx"));
const halftoneScene= /HalftoneEffect/.test(sceneJs);
const shipBleed    = (() => { const b = css.match(/\.bebopShipSystem\s*\{[\s\S]*?\}/); return Boolean(b) && /inset:\s*0/.test(b[0]) && !/display:\s*flex/.test(b[0]); })();
const noEndcard    = !/SEE YOU SPACE COWBOY/.test(readFileSync(join(ROOT, "src/components/BebopAnimation.jsx"), "utf8"));
const usesGsap     = /gsap/.test(sceneJs);
const usesHardCuts = /tl\.set\(/.test(sceneJs);
const usesLerp     = /tl\.to\(/.test(sceneJs);

let failed = 0;
function assert(label, ok) {
  if (!ok) { console.error("FAIL " + label); failed++; }
  else      { console.log ("OK   " + label); }
}

assert("V2  SHIP phase >= shot total duration",                        shipPhaseGte);
assert("V16 BebopShip has no <video> tag",                             noVideoTag);
assert("V16 BebopShip uses next/dynamic SSR-false",                    usesDynamic);
assert("V16 BebopShip imports BebopShipScene",                         importsScene);
assert("V16 BebopShip gates on isBebopGltfCached/prefetchBebopGltf",  hasGltfGate);
assert("V17 GLTF asset exists (public/bebop/scene.gltf)",              gltfExists);
assert("V17 bebopShip.js prefetches GLTF via useGLTF.preload",         gltfPrefetch);
assert("V17 bebopShip.js sync gltfCached gate",                        syncGltfCache);
assert("V18 bebopShots.js file exists",                                shotsFile);
assert("V18 shot count in range [4,10] (got " + shotCount + ")",       shotCountOk);
assert("V18 SHOTS_TOTAL_MS in [2400,3600] ms (got " + SHOTS_TOTAL_MS + ")", totalDurOk);
assert("V18 meta.durationMs matches BEBOP_SHIP.durationMs",            metaDurOk);
assert("V18 meta.mode === r3f-silhouette",                             metaMode);
assert("V18 keyframes have monotonic absolute t",                      hasAbsTimes);
assert("V18 YAW_LEFT = -π/2 (nariz +Z → −X)",                          hasYawLeft);
assert("V19 HalftoneEffect.jsx exists",                                halftoneFile);
assert("V19 HalftoneEffect wired into BebopShipScene",                 halftoneScene);
assert("V15 .bebopShipSystem full-bleed (inset:0, no flex)",           shipBleed);
assert("V20 no overlay endcard copy",                                  noEndcard);
assert("V21 BebopShipScene uses GSAP timeline",                        usesGsap);
assert("V21 GSAP hard cuts (tl.set) + continuous lerp (tl.to)",        usesHardCuts && usesLerp);

if (failed > 0) process.exit(1);
console.log("\nbebop timing invariants passed (" + BEBOP_SHOTS.length + " shots · " + SHOTS_TOTAL_MS + "ms)");
