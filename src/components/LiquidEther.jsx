'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Presentation cadence, driven by how long the pointer has been still. Below the
// first threshold the field runs at display rate; between the two it runs on
// every other animation frame; after the second it settles into a slow breath so
// the haze keeps drifting instead of freezing, at ~7 composite passes per second
// instead of the 15 the previous build spent on unchanged output.
const IDLE_HALF_RATE_AFTER_MS = 320;
const IDLE_BREATH_AFTER_MS = 2200;
const IDLE_BREATH_INTERVAL_MS = 143;

export default function LiquidEther({
  mouseForce = 20,
  cursorSize = 100,
  isViscous = false,
  viscous = 30,
  iterationsViscous = 32,
  iterationsPoisson = 32,
  dt = 0.014,
  BFECC = true,
  resolution = 0.5,
  isBounce = false,
  colors = ['#5227FF', '#FF9FFC', '#B497CF'],
  style = {},
  className = '',
  autoDemo = true,
  autoSpeed = 0.5,
  autoIntensity = 2.2,
  takeoverDuration = 0.25,
  autoResumeDelay = 1000,
  autoRampDuration = 0.6,
  backgroundColor = '#FFFFFF',
  lightMode = false
}) {
  const mountRef = useRef(null);
  const webglRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const rafRef = useRef(null);
  const intersectionObserverRef = useRef(null);
  const isVisibleRef = useRef(true);
  const resizeRafRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    function makePaletteTexture(stops) {
      let arr;
      if (Array.isArray(stops) && stops.length > 0) {
        if (stops.length === 1) {
          arr = [stops[0], stops[0]];
        } else {
          arr = stops;
        }
      } else {
        arr = ['#ffffff', '#ffffff'];
      }
      const w = arr.length;
      const data = new Uint8Array(w * 4);
      for (let i = 0; i < w; i++) {
        const c = new THREE.Color(arr[i]);
        data[i * 4 + 0] = Math.round(c.r * 255);
        data[i * 4 + 1] = Math.round(c.g * 255);
        data[i * 4 + 2] = Math.round(c.b * 255);
        data[i * 4 + 3] = 255;
      }
      const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      return tex;
    }

    const paletteTex = makePaletteTexture(colors);
    const bg = new THREE.Color(backgroundColor);
    const bgVec4 = lightMode ? new THREE.Vector4(bg.r, bg.g, bg.b, 1) : new THREE.Vector4(0, 0, 0, 0);

    // Releases every geometry and material reachable from a root object. Used on
    // unmount so the field never leaves GPU programs or buffers behind.
    const disposeObject3D = (root) => {
      if (!root) return;
      root.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        const material = obj.material;
        if (Array.isArray(material)) {
          for (const entry of material) if (entry) entry.dispose();
        } else if (material) {
          material.dispose();
        }
      });
      root.clear();
    };

    class CommonClass {
      constructor() {
        this.width = 0;
        this.height = 0;
        this.aspect = 1;
        this.pixelRatio = 1;
        this.isMobile = false;
        this.breakpoint = 768;
        this.fboWidth = null;
        this.fboHeight = null;
        this.time = 0;
        this.delta = 0;
        this.container = null;
        this.renderer = null;
        this.timer = null;
      }
      init(container) {
        this.container = container;
        this.pixelRatio = 1;
        this.resize();
        this.renderer = new THREE.WebGLRenderer({
          antialias: false,
          alpha: true,
          depth: false,
          stencil: false,
          powerPreference: 'high-performance',
          premultipliedAlpha: true
        });
        this.renderer.autoClear = false;
        this.renderer.setClearColor(new THREE.Color(0x000000), 0);
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.setSize(this.width, this.height);
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        this.renderer.domElement.style.display = 'block';
        this.timer = new THREE.Timer();
      }
      resize() {
        if (!this.container) return false;
        const rect = this.container.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        if (width === this.width && height === this.height) return false;
        this.width = width;
        this.height = height;
        this.aspect = this.width / this.height;
        if (this.renderer) this.renderer.setSize(this.width, this.height, false);
        return true;
      }
      update() {
        this.timer.update();
        this.delta = this.timer.getDelta();
        this.time += this.delta;
      }
    }
    const Common = new CommonClass();

    class MouseClass {
      constructor() {
        this.mouseMoved = false;
        this.coords = new THREE.Vector2();
        this.coords_old = new THREE.Vector2();
        this.diff = new THREE.Vector2();
        this.timer = null;
        this.container = null;
        this.docTarget = null;
        this.listenerTarget = null;
        this.isHoverInside = false;
        this.hasUserControl = false;
        this.isAutoActive = false;
        this.autoIntensity = 2.0;
        this.takeoverActive = false;
        this.takeoverStartTime = 0;
        this.takeoverDuration = 0.25;
        this.takeoverFrom = new THREE.Vector2();
        this.takeoverTo = new THREE.Vector2();
        this.onInteract = null;
        this.pendingX = 0;
        this.pendingY = 0;
        this.pointerRaf = 0;
        this._onMouseMove = this.onDocumentMouseMove.bind(this);
        this._flushPointer = this.flushPointer.bind(this);
        this._onTouchStart = this.onDocumentTouchStart.bind(this);
        this._onTouchMove = this.onDocumentTouchMove.bind(this);
        this._onTouchEnd = this.onTouchEnd.bind(this);
        this._onDocumentLeave = this.onDocumentLeave.bind(this);
      }
      init(container) {
        this.container = container;
        this.docTarget = container.ownerDocument || null;
        const defaultView =
          (this.docTarget && this.docTarget.defaultView) || (typeof window !== 'undefined' ? window : null);
        if (!defaultView) return;
        this.listenerTarget = defaultView;
        // Passive: this handler never cancels the event, so letting the browser
        // wait on it would cost scroll responsiveness for nothing.
        this.listenerTarget.addEventListener('mousemove', this._onMouseMove, { passive: true });
        this.listenerTarget.addEventListener('touchstart', this._onTouchStart, { passive: true });
        this.listenerTarget.addEventListener('touchmove', this._onTouchMove, { passive: true });
        this.listenerTarget.addEventListener('touchend', this._onTouchEnd);
        if (this.docTarget) {
          this.docTarget.addEventListener('mouseleave', this._onDocumentLeave);
        }
      }
      dispose() {
        if (this.pointerRaf && this.listenerTarget) {
          this.listenerTarget.cancelAnimationFrame(this.pointerRaf);
        }
        this.pointerRaf = 0;
        if (this.listenerTarget) {
          this.listenerTarget.removeEventListener('mousemove', this._onMouseMove);
          this.listenerTarget.removeEventListener('touchstart', this._onTouchStart);
          this.listenerTarget.removeEventListener('touchmove', this._onTouchMove);
          this.listenerTarget.removeEventListener('touchend', this._onTouchEnd);
        }
        if (this.docTarget) {
          this.docTarget.removeEventListener('mouseleave', this._onDocumentLeave);
        }
        this.listenerTarget = null;
        this.docTarget = null;
        this.container = null;
      }
      isEmptyRect(rect) {
        return !rect || rect.width === 0 || rect.height === 0;
      }
      isPointInsideRect(rect, clientX, clientY) {
        if (this.isEmptyRect(rect)) return false;
        return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
      }
      updateHoverState(clientX, clientY) {
        if (!this.container) {
          this.isHoverInside = false;
          return false;
        }
        this.isHoverInside = this.isPointInsideRect(this.container.getBoundingClientRect(), clientX, clientY);
        return this.isHoverInside;
      }
      setCoords(x, y) {
        if (!this.container) return;
        this.setCoordsFromRect(x, y, this.container.getBoundingClientRect());
      }
      setCoordsFromRect(x, y, rect) {
        if (this.isEmptyRect(rect)) return;
        if (this.timer) window.clearTimeout(this.timer);
        const nx = (x - rect.left) / rect.width;
        const ny = (y - rect.top) / rect.height;
        this.coords.set(nx * 2 - 1, -(ny * 2 - 1));
        this.mouseMoved = true;
        this.timer = window.setTimeout(() => {
          this.mouseMoved = false;
        }, 100);
      }
      // A pointer burst can fire far more often than the display refreshes.
      // Events only record the latest position; one rAF resolves it against a
      // single layout read, so a burst cannot force a layout per event.
      queuePointer(clientX, clientY) {
        this.pendingX = clientX;
        this.pendingY = clientY;
        if (this.pointerRaf || !this.container || !this.listenerTarget) return;
        this.pointerRaf = this.listenerTarget.requestAnimationFrame(this._flushPointer);
      }
      flushPointer() {
        this.pointerRaf = 0;
        if (!this.container) return;
        const clientX = this.pendingX;
        const clientY = this.pendingY;
        const rect = this.container.getBoundingClientRect();
        this.isHoverInside = this.isPointInsideRect(rect, clientX, clientY);
        if (!this.isHoverInside) return;
        if (this.onInteract) this.onInteract();
        if (this.isAutoActive && !this.hasUserControl && !this.takeoverActive) {
          const nx = (clientX - rect.left) / rect.width;
          const ny = (clientY - rect.top) / rect.height;
          this.takeoverFrom.copy(this.coords);
          this.takeoverTo.set(nx * 2 - 1, -(ny * 2 - 1));
          this.takeoverStartTime = performance.now();
          this.takeoverActive = true;
          this.hasUserControl = true;
          this.isAutoActive = false;
          return;
        }
        this.setCoordsFromRect(clientX, clientY, rect);
        this.hasUserControl = true;
      }
      setNormalized(nx, ny) {
        this.coords.set(nx, ny);
        this.mouseMoved = true;
      }
      onDocumentMouseMove(event) {
        this.queuePointer(event.clientX, event.clientY);
      }
      onDocumentTouchStart(event) {
        if (event.touches.length !== 1) return;
        const t = event.touches[0];
        if (!this.updateHoverState(t.clientX, t.clientY)) return;
        if (this.onInteract) this.onInteract();
        this.setCoords(t.clientX, t.clientY);
        this.hasUserControl = true;
      }
      onDocumentTouchMove(event) {
        if (event.touches.length !== 1) return;
        const t = event.touches[0];
        if (!this.updateHoverState(t.clientX, t.clientY)) return;
        if (this.onInteract) this.onInteract();
        this.setCoords(t.clientX, t.clientY);
      }
      onTouchEnd() {
        this.isHoverInside = false;
      }
      onDocumentLeave() {
        this.isHoverInside = false;
      }
      update() {
        if (this.takeoverActive) {
          const t = (performance.now() - this.takeoverStartTime) / (this.takeoverDuration * 1000);
          if (t >= 1) {
            this.takeoverActive = false;
            this.coords.copy(this.takeoverTo);
            this.coords_old.copy(this.coords);
            this.diff.set(0, 0);
          } else {
            const k = t * t * (3 - 2 * t);
            this.coords.copy(this.takeoverFrom).lerp(this.takeoverTo, k);
          }
        }
        this.diff.subVectors(this.coords, this.coords_old);
        this.coords_old.copy(this.coords);
        if (this.coords_old.x === 0 && this.coords_old.y === 0) this.diff.set(0, 0);
        if (this.isAutoActive && !this.takeoverActive) this.diff.multiplyScalar(this.autoIntensity);
      }
    }
    const Mouse = new MouseClass();

    class AutoDriver {
      constructor(mouse, manager, opts) {
        this.mouse = mouse;
        this.manager = manager;
        this.enabled = opts.enabled;
        this.speed = opts.speed; // normalized units/sec
        this.resumeDelay = opts.resumeDelay || 3000; // ms
        this.rampDurationMs = (opts.rampDuration || 0) * 1000;
        this.active = false;
        this.current = new THREE.Vector2(0, 0);
        this.target = new THREE.Vector2();
        this.lastTime = performance.now();
        this.activationTime = 0;
        this.margin = 0.2;
        this._tmpDir = new THREE.Vector2(); // reuse temp vector to avoid per-frame alloc
        this.pickNewTarget();
      }
      pickNewTarget() {
        const r = Math.random;
        this.target.set((r() * 2 - 1) * (1 - this.margin), (r() * 2 - 1) * (1 - this.margin));
      }
      forceStop() {
        this.active = false;
        this.mouse.isAutoActive = false;
      }
      update() {
        if (!this.enabled) return;
        const now = performance.now();
        const idle = now - this.manager.lastUserInteraction;
        if (idle < this.resumeDelay) {
          if (this.active) this.forceStop();
          return;
        }
        if (this.mouse.isHoverInside) {
          if (this.active) this.forceStop();
          return;
        }
        if (!this.active) {
          this.active = true;
          this.current.copy(this.mouse.coords);
          this.lastTime = now;
          this.activationTime = now;
        }
        if (!this.active) return;
        this.mouse.isAutoActive = true;
        let dtSec = (now - this.lastTime) / 1000;
        this.lastTime = now;
        if (dtSec > 0.2) dtSec = 0.016;
        const dir = this._tmpDir.subVectors(this.target, this.current);
        const dist = dir.length();
        if (dist < 0.01) {
          this.pickNewTarget();
          return;
        }
        dir.normalize();
        let ramp = 1;
        if (this.rampDurationMs > 0) {
          const t = Math.min(1, (now - this.activationTime) / this.rampDurationMs);
          ramp = t * t * (3 - 2 * t);
        }
        const step = this.speed * dtSec * ramp;
        const move = Math.min(step, dist);
        this.current.addScaledVector(dir, move);
        this.mouse.setNormalized(this.current.x, this.current.y);
      }
    }

    const face_vert = `
  attribute vec3 position;
  uniform vec2 px;
  uniform vec2 boundarySpace;
  varying vec2 uv;
  precision highp float;
  void main(){
  vec3 pos = position;
  vec2 scale = 1.0 - boundarySpace * 2.0;
  pos.xy = pos.xy * scale;
  uv = vec2(0.5)+(pos.xy)*0.5;
  gl_Position = vec4(pos, 1.0);
}
`;
    const line_vert = `
  attribute vec3 position;
  uniform vec2 px;
  precision highp float;
  varying vec2 uv;
  void main(){
  vec3 pos = position;
  uv = 0.5 + pos.xy * 0.5;
  vec2 n = sign(pos.xy);
  pos.xy = abs(pos.xy) - px * 1.0;
  pos.xy *= n;
  gl_Position = vec4(pos, 1.0);
}
`;
    const mouse_vert = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform vec2 center;
    uniform vec2 scale;
    uniform vec2 px;
    varying vec2 vUv;
    void main(){
    vec2 pos = position.xy * scale * 2.0 * px + center;
    vUv = uv;
    gl_Position = vec4(pos, 0.0, 1.0);
}
`;
    const noise_glsl = `
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float valueNoise(vec2 p){
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p){
      float sum = 0.0;
      float amp = 0.5;
      for (int i = 0; i < 4; i++) { sum += amp * valueNoise(p); p *= 2.03; amp *= 0.5; }
      return sum;
    }
    vec2 curlNoise(vec2 p){
      float e = 0.05;
      float dy = fbm(p + vec2(0.0, e)) - fbm(p - vec2(0.0, e));
      float dx = fbm(p + vec2(e, 0.0)) - fbm(p - vec2(e, 0.0));
      return vec2(dy, -dx) / (2.0 * e);
    }
`;
    const advection_frag = `
    precision highp float;
    uniform sampler2D velocity;
    uniform sampler2D dye;
    uniform float dt;
    uniform bool isBFECC;
    uniform vec2 fboSize;
    uniform vec2 px;
    uniform float time;
    uniform float buoyancy;
    uniform float turbulence;
    varying vec2 uv;
    ${noise_glsl}
    void main(){
    vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
    vec2 newVel;
    if(isBFECC == false){
        vec2 vel = texture2D(velocity, uv).xy;
        vec2 uv2 = uv - vel * dt * ratio;
        newVel = texture2D(velocity, uv2).xy;
    } else {
        vec2 spot_new = uv;
        vec2 vel_old = texture2D(velocity, uv).xy;
        vec2 spot_old = spot_new - vel_old * dt * ratio;
        vec2 vel_new1 = texture2D(velocity, spot_old).xy;
        vec2 spot_new2 = spot_old + vel_new1 * dt * ratio;
        vec2 error = spot_new2 - spot_new;
        vec2 spot_new3 = spot_new - error / 2.0;
        vec2 vel_2 = texture2D(velocity, spot_new3).xy;
        vec2 spot_old2 = spot_new3 - vel_2 * dt * ratio;
        newVel = texture2D(velocity, spot_old2).xy;
    }
    // Smoke physics: hot density rises, curl turbulence frays it into wisps
    float density = texture2D(dye, uv).r;
    vec2 aspectUv = uv / ratio;
    vec2 swirl = curlNoise(aspectUv * 2.2 + vec2(0.0, -time * 0.07));
    newVel += vec2(0.0, buoyancy * density) * dt;
    newVel += swirl * turbulence * (0.15 + density) * dt;    gl_FragColor = vec4(newVel, 0.0, 0.0);
}
`;
    const dye_frag = `
    precision highp float;
    uniform sampler2D velocity;
    uniform sampler2D dye;
    uniform float dt;
    uniform vec2 fboSize;
    uniform float dissipation;
    uniform vec2 splatCenter;
    uniform float splatRadius;
    uniform float splatAmount;
    uniform float time;
    uniform float ambientAmount;
    varying vec2 uv;
    ${noise_glsl}
    void main(){
    vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
    vec2 vel = texture2D(velocity, uv).xy;
    float density = texture2D(dye, uv - vel * dt * ratio).r * dissipation;
    vec2 delta = (uv - splatCenter) / ratio;
    float puff = exp(-dot(delta, delta) / (splatRadius * splatRadius));
    density += puff * splatAmount;
    // Rolling dawn band: denser at the floor, slow fbm breath
    float ground = 1.0 - smoothstep(0.0, 0.28, uv.y);
    vec2 mistUv = vec2(uv.x * 1.4, uv.y * 3.2) + vec2(time * 0.018, -time * 0.006);
    float mistNoise = fbm(mistUv);
    density += ambientAmount * ground * ground * mix(0.35, 1.0, mistNoise);
    gl_FragColor = vec4(min(density, 1.6), 0.0, 0.0, 1.0);
}
`;
    const color_frag = `
    precision highp float;
    uniform sampler2D dye;
    uniform sampler2D palette;
    uniform vec4 bgColor;
    uniform bool lightMode;
    uniform float time;
    uniform vec2 texelSize;
    uniform float hazeStrength;
    uniform vec2 resolution;
    uniform vec2 pointerUv;
    varying vec2 uv;
    ${noise_glsl}
    // Underdamped step toward 1. zeta < 1 overshoots, then settles.
    float springStep(float t, float zeta, float wn){
      float wd = wn * sqrt(max(1.0 - zeta * zeta, 0.0001));
      float decay = exp(-zeta * wn * t);
      return 1.0 - decay * (cos(wd * t) + (zeta * wn / wd) * sin(wd * t));
    }
    // One-shot glow: soft rise, then a slower settle. Never goes below rest.
    float springPop(float t){
      const float attackZeta = 0.7;
      const float attackWn = 7.5;
      const float attackEnd = 1.05;
      const float releaseZeta = 0.8;
      const float releaseWn = 3.2;
      if (t < 0.0) return 0.0;
      if (t < attackEnd) return springStep(t, attackZeta, attackWn);
      float releaseT = t - attackEnd;
      if (releaseT > 1.45) return 0.0;
      float atSeam = springStep(attackEnd, attackZeta, attackWn);
      float wd = releaseWn * sqrt(max(1.0 - releaseZeta * releaseZeta, 0.0001));
      float decay = exp(-releaseZeta * releaseWn * releaseT);
      float release = decay * (cos(wd * releaseT) + (releaseZeta * releaseWn / wd) * sin(wd * releaseT));
      return atSeam * max(release, 0.0);
    }
    // Cover dot is constant. A few cells per cycle add one spring glow.
    void coverGrid(vec2 pixel, inout vec3 premul, inout float outA){
      const float cellSize = 48.0;
      vec2 cell = floor(pixel / cellSize);
      vec2 cellCenter = (cell + 0.5) * cellSize;
      vec2 delta = pixel - cellCenter;
      float dist = length(delta);
      vec3 coral = vec3(0.886, 0.447, 0.498);

      float dotMask = 1.0 - smoothstep(1.5, 2.0, dist);
      premul = mix(premul, coral * 0.55, dotMask);
      outA = mix(outA, 0.55, dotMask);

      float period = mix(22.0, 34.0, hash(cell + 4.2));
      float shifted = time + hash(cell) * period;
      float cycle = floor(shifted / period);
      float localT = shifted - cycle * period;
      float roll = hash(cell + vec2(cycle, 7.7));
      float fires = step(roll, 0.58);
      float rollLeft = hash(cell + vec2(-1.0, 0.0) + vec2(cycle, 7.7));
      float rollDown = hash(cell + vec2(0.0, -1.0) + vec2(cycle, 7.7));
      float leftWins = step(rollLeft, 0.58) * step(rollLeft, roll);
      float downWins = step(rollDown, 0.58) * step(rollDown, roll);
      fires *= 1.0 - max(leftWins, downWins);
      float hot = springPop(localT) * fires;
      float core = exp(-dist * dist / 8.0) * hot;
      float bloom = 6.0 + 7.0 * min(hot, 1.1);
      float halo = exp(-dist * dist / (bloom * bloom)) * hot;
      vec3 hotColor = mix(coral, vec3(1.0, 0.86, 0.87), clamp(hot * 0.35, 0.0, 0.55));
      premul += hotColor * (core * 0.62 + halo * 0.28);
    }
    void main(){
    float aspect = texelSize.y / texelSize.x;
    vec2 aspectUv = vec2(uv.x * aspect, uv.y);
    vec2 tapOffset = texelSize * 4.0;
    float centerDensity = texture2D(dye, uv).r;
    float leftDensity = texture2D(dye, uv - vec2(tapOffset.x, 0.0)).r;
    float rightDensity = texture2D(dye, uv + vec2(tapOffset.x, 0.0)).r;
    float downDensity = texture2D(dye, uv - vec2(0.0, tapOffset.y)).r;
    float upDensity = texture2D(dye, uv + vec2(0.0, tapOffset.y)).r;
    float softDensity = centerDensity * 0.4 + (leftDensity + rightDensity + downDensity + upDensity) * 0.15;

    // Soft mid-frequency breakup — high-freq grain read as random sparkles under screen blend
    vec2 warpUv = uv * 1.3 + vec2(0.0, -time * 0.02);
    vec2 warp = vec2(fbm(warpUv), fbm(warpUv + vec2(5.2, 1.3))) - 0.5;
    float filaments = fbm(uv * vec2(2.2, 1.6) + warp * 0.7 + vec2(time * 0.008, -time * 0.02));
    float breakup = mix(0.9, 1.05, smoothstep(0.3, 0.75, filaments));
    // Dawn mist: ground-heavy, drifting, shoved aside by the pointer
    float groundFalloff = 1.0 - smoothstep(0.02, 0.5, uv.y);
    float heightFade = mix(0.06, 1.0, groundFalloff * groundFalloff);
    vec2 pointerDelta = aspectUv - vec2(pointerUv.x * aspect, pointerUv.y);
    float pointerFalloff = exp(-dot(pointerDelta, pointerDelta) / 0.07);
    vec2 pointerPush = pointerDelta * pointerFalloff * 0.11;
    vec2 hazeWarp = vec2(fbm(aspectUv * 0.55 + vec2(time * 0.012, 0.0)), fbm(aspectUv * 0.55 + vec2(3.1, time * 0.009))) - 0.5;
    float hazeNoise = fbm(aspectUv * 0.72 + hazeWarp * 0.9 + pointerPush + vec2(time * 0.014, time * 0.006));
    float linger = 0.88 + 0.12 * sin(time * 0.11);
    float haze = smoothstep(0.34, 0.86, hazeNoise) * hazeStrength * heightFade * linger;
    float density = 1.0 - exp(-(softDensity * breakup + haze) * 1.55);

    // Light from above: rims facing it glow, thick core falls into shadow
    vec2 densityGradient = vec2(rightDensity - leftDensity, upDensity - downDensity);
    vec2 lightDirection = normalize(vec2(-0.3, 1.0));
    float lightAmount = clamp(0.62 - dot(densityGradient, lightDirection) * 2.2, 0.0, 1.0);
    float coreShadow = smoothstep(0.62, 1.0, density) * 0.06;

    vec3 c = texture2D(palette, vec2(density, 0.5)).rgb;
    float peak = max(c.r, max(c.g, c.b));
    vec3 chroma = clamp(c / max(peak, 0.0001), 0.0, 1.0);
    vec3 shaded = c * (mix(0.9, 1.02, lightAmount) - coreShadow);
    // Cap white lift so haze peaks never read as sparkles
    vec3 smoke = mix(shaded, vec3(0.92, 0.97, 1.0), pow(density, 2.8) * 0.16 * lightAmount);
    vec3 ink = lightMode ? chroma : smoke;
    float alpha = density * 0.64;
    float outA = mix(bgColor.a, 1.0, alpha);
    // Premultiplied smoke (renderer + material use premultipliedAlpha)
    vec3 premul = mix(bgColor.rgb, ink, density) * outA;
    // Static cover dots, plus a rare spring glow. Halo does not change alpha.
    coverGrid(uv * resolution, premul, outA);
    gl_FragColor = vec4(premul, outA);
}
`;
    const divergence_frag = `
    precision highp float;
    uniform sampler2D velocity;
    uniform float dt;
    uniform vec2 px;
    varying vec2 uv;
    void main(){
    float x0 = texture2D(velocity, uv-vec2(px.x, 0.0)).x;
    float x1 = texture2D(velocity, uv+vec2(px.x, 0.0)).x;
    float y0 = texture2D(velocity, uv-vec2(0.0, px.y)).y;
    float y1 = texture2D(velocity, uv+vec2(0.0, px.y)).y;
    float divergence = (x1 - x0 + y1 - y0) / 2.0;
    gl_FragColor = vec4(divergence / dt);
}
`;
    const externalForce_frag = `
    precision highp float;
    uniform vec2 force;
    uniform vec2 center;
    uniform vec2 scale;
    uniform vec2 px;
    varying vec2 vUv;
    void main(){
    vec2 circle = (vUv - 0.5) * 2.0;
    // Soft Gaussian blob — billowy smoke plume instead of hard liquid disk
    float r = length(circle);
    float d = exp(-r * r * 2.8);
    gl_FragColor = vec4(force * d, 0.0, 1.0);
}
`;
    const poisson_frag = `
    precision highp float;
    uniform sampler2D pressure;
    uniform sampler2D divergence;
    uniform vec2 px;
    varying vec2 uv;
    void main(){
    float p0 = texture2D(pressure, uv + vec2(px.x * 2.0, 0.0)).r;
    float p1 = texture2D(pressure, uv - vec2(px.x * 2.0, 0.0)).r;
    float p2 = texture2D(pressure, uv + vec2(0.0, px.y * 2.0)).r;
    float p3 = texture2D(pressure, uv - vec2(0.0, px.y * 2.0)).r;
    float div = texture2D(divergence, uv).r;
    float newP = (p0 + p1 + p2 + p3) / 4.0 - div;
    gl_FragColor = vec4(newP);
}
`;
    const pressure_frag = `
    precision highp float;
    uniform sampler2D pressure;
    uniform sampler2D velocity;
    uniform vec2 px;
    uniform float dt;
    varying vec2 uv;
    void main(){
    float step = 1.0;
    float p0 = texture2D(pressure, uv + vec2(px.x * step, 0.0)).r;
    float p1 = texture2D(pressure, uv - vec2(px.x * step, 0.0)).r;
    float p2 = texture2D(pressure, uv + vec2(0.0, px.y * step)).r;
    float p3 = texture2D(pressure, uv - vec2(0.0, px.y * step)).r;
    vec2 v = texture2D(velocity, uv).xy;
    vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5;
    v = v - gradP * dt;
    gl_FragColor = vec4(v, 0.0, 1.0);
}
`;
    const viscous_frag = `
    precision highp float;
    uniform sampler2D velocity;
    uniform sampler2D velocity_new;
    uniform float v;
    uniform vec2 px;
    uniform float dt;
    varying vec2 uv;
    void main(){
    vec2 old = texture2D(velocity, uv).xy;
    vec2 new0 = texture2D(velocity_new, uv + vec2(px.x * 2.0, 0.0)).xy;
    vec2 new1 = texture2D(velocity_new, uv - vec2(px.x * 2.0, 0.0)).xy;
    vec2 new2 = texture2D(velocity_new, uv + vec2(0.0, px.y * 2.0)).xy;
    vec2 new3 = texture2D(velocity_new, uv - vec2(0.0, px.y * 2.0)).xy;
    vec2 newv = 4.0 * old + v * dt * (new0 + new1 + new2 + new3);
    newv /= 4.0 * (1.0 + v * dt);
    gl_FragColor = vec4(newv, 0.0, 0.0);
}
`;

    class ShaderPass {
      constructor(props) {
        this.props = props || {};
        this.uniforms = this.props.material?.uniforms;
        this.scene = null;
        this.camera = null;
        this.material = null;
        this.geometry = null;
        this.plane = null;
      }
      init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();
        if (this.uniforms) {
          this.material = new THREE.RawShaderMaterial(this.props.material);
          this.geometry = new THREE.PlaneGeometry(2.0, 2.0);
          this.plane = new THREE.Mesh(this.geometry, this.material);
          this.scene.add(this.plane);
        }
      }
      update() {
        Common.renderer.setRenderTarget(this.props.output || null);
        Common.renderer.render(this.scene, this.camera);
        Common.renderer.setRenderTarget(null);
      }
      dispose() {
        disposeObject3D(this.scene);
        this.scene = null;
        this.camera = null;
        this.material = null;
        this.geometry = null;
        this.plane = null;
      }
    }

    class Advection extends ShaderPass {
      constructor(simProps) {
        super({
          material: {
            vertexShader: face_vert,
            fragmentShader: advection_frag,
            uniforms: {
              boundarySpace: { value: simProps.cellScale },
              px: { value: simProps.cellScale },
              fboSize: { value: simProps.fboSize },
              velocity: { value: simProps.src.texture },
              dye: { value: simProps.dye.texture },
              dt: { value: simProps.dt },
              isBFECC: { value: true },
              time: { value: 0 },
              buoyancy: { value: 0 },
              turbulence: { value: 0 }
            }
          },
          output: simProps.dst
        });
        this.uniforms = this.props.material.uniforms;
        this.init();
      }
      init() {
        super.init();
        this.createBoundary();
      }
      createBoundary() {
        const boundaryG = new THREE.BufferGeometry();
        const vertices_boundary = new Float32Array([
          -1, -1, 0, -1, 1, 0, -1, 1, 0, 1, 1, 0, 1, 1, 0, 1, -1, 0, 1, -1, 0, -1, -1, 0
        ]);
        boundaryG.setAttribute('position', new THREE.BufferAttribute(vertices_boundary, 3));
        const boundaryM = new THREE.RawShaderMaterial({
          vertexShader: line_vert,
          fragmentShader: advection_frag,
          uniforms: this.uniforms
        });
        this.line = new THREE.LineSegments(boundaryG, boundaryM);
        this.scene.add(this.line);
      }
      update({ dt, isBounce, BFECC, dye, buoyancy, turbulence }) {
        this.uniforms.dt.value = dt;
        this.line.visible = isBounce;
        this.uniforms.isBFECC.value = BFECC;
        this.uniforms.dye.value = dye.texture;
        this.uniforms.time.value = Common.time;
        this.uniforms.buoyancy.value = buoyancy;
        this.uniforms.turbulence.value = turbulence;
        super.update();
      }
    }

    class DyeAdvection extends ShaderPass {
      constructor(simProps) {
        super({
          material: {
            vertexShader: face_vert,
            fragmentShader: dye_frag,
            uniforms: {
              boundarySpace: { value: new THREE.Vector2(0, 0) },
              px: { value: simProps.cellScale },
              fboSize: { value: simProps.fboSize },
              velocity: { value: simProps.velocity.texture },
              dye: { value: null },
              dt: { value: simProps.dt },
              dissipation: { value: 0.985 },
              splatCenter: { value: new THREE.Vector2(0.5, 0.5) },
              splatRadius: { value: 0.05 },
              splatAmount: { value: 0 },
              time: { value: 0 },
              ambientAmount: { value: 0 }
            }
          }
        });
        this.init();
      }
      update({ src, dst, dt, dissipation, smokeAmount, smokeRadius, ambientAmount }) {
        const mouseSpeed = Mouse.diff.length();
        const wake = mouseSpeed > 0.00035 ? 0.05 : 0.0;
        this.uniforms.dye.value = src.texture;
        this.uniforms.dt.value = dt;
        this.uniforms.dissipation.value = dissipation;
        this.uniforms.splatCenter.value.set(Mouse.coords.x * 0.5 + 0.5, Mouse.coords.y * 0.5 + 0.5);
        this.uniforms.splatRadius.value = smokeRadius;
        this.uniforms.splatAmount.value = Math.min(mouseSpeed * 28, 1) * smokeAmount + wake;
        this.uniforms.time.value = Common.time;
        this.uniforms.ambientAmount.value = ambientAmount;
        this.props.output = dst;
        super.update();
      }
    }

    class ExternalForce extends ShaderPass {
      constructor(simProps) {
        super({ output: simProps.dst });
        this.init(simProps);
      }
      init(simProps) {
        super.init();
        const mouseG = new THREE.PlaneGeometry(1, 1);
        const mouseM = new THREE.RawShaderMaterial({
          vertexShader: mouse_vert,
          fragmentShader: externalForce_frag,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          uniforms: {
            px: { value: simProps.cellScale },
            force: { value: new THREE.Vector2(0.0, 0.0) },
            center: { value: new THREE.Vector2(0.0, 0.0) },
            scale: { value: new THREE.Vector2(simProps.cursor_size, simProps.cursor_size) }
          }
        });
        this.mouse = new THREE.Mesh(mouseG, mouseM);
        this.scene.add(this.mouse);
      }
      update(props) {
        const forceX = (Mouse.diff.x / 2) * props.mouse_force;
        const forceY = (Mouse.diff.y / 2) * props.mouse_force;
        const cursorSizeX = props.cursor_size * props.cellScale.x;
        const cursorSizeY = props.cursor_size * props.cellScale.y;
        const centerX = Math.min(
          Math.max(Mouse.coords.x, -1 + cursorSizeX + props.cellScale.x * 2),
          1 - cursorSizeX - props.cellScale.x * 2
        );
        const centerY = Math.min(
          Math.max(Mouse.coords.y, -1 + cursorSizeY + props.cellScale.y * 2),
          1 - cursorSizeY - props.cellScale.y * 2
        );
        const uniforms = this.mouse.material.uniforms;
        uniforms.force.value.set(forceX, forceY);
        uniforms.center.value.set(centerX, centerY);
        uniforms.scale.value.set(props.cursor_size, props.cursor_size);
        super.update();
      }
    }

    class Viscous extends ShaderPass {
      constructor(simProps) {
        super({
          material: {
            vertexShader: face_vert,
            fragmentShader: viscous_frag,
            uniforms: {
              boundarySpace: { value: simProps.boundarySpace },
              velocity: { value: simProps.src.texture },
              velocity_new: { value: simProps.dst_.texture },
              v: { value: simProps.viscous },
              px: { value: simProps.cellScale },
              dt: { value: simProps.dt }
            }
          },
          output: simProps.dst,
          output0: simProps.dst_,
          output1: simProps.dst
        });
        this.init();
      }
      update({ viscous, iterations, dt }) {
        let fbo_in, fbo_out;
        this.uniforms.v.value = viscous;
        for (let i = 0; i < iterations; i++) {
          if (i % 2 === 0) {
            fbo_in = this.props.output0;
            fbo_out = this.props.output1;
          } else {
            fbo_in = this.props.output1;
            fbo_out = this.props.output0;
          }
          this.uniforms.velocity_new.value = fbo_in.texture;
          this.props.output = fbo_out;
          this.uniforms.dt.value = dt;
          super.update();
        }
        return fbo_out;
      }
    }

    class Divergence extends ShaderPass {
      constructor(simProps) {
        super({
          material: {
            vertexShader: face_vert,
            fragmentShader: divergence_frag,
            uniforms: {
              boundarySpace: { value: simProps.boundarySpace },
              velocity: { value: simProps.src.texture },
              px: { value: simProps.cellScale },
              dt: { value: simProps.dt }
            }
          },
          output: simProps.dst
        });
        this.init();
      }
      update({ vel }) {
        this.uniforms.velocity.value = vel.texture;
        super.update();
      }
    }

    class Poisson extends ShaderPass {
      constructor(simProps) {
        super({
          material: {
            vertexShader: face_vert,
            fragmentShader: poisson_frag,
            uniforms: {
              boundarySpace: { value: simProps.boundarySpace },
              pressure: { value: simProps.dst_.texture },
              divergence: { value: simProps.src.texture },
              px: { value: simProps.cellScale }
            }
          },
          output: simProps.dst,
          output0: simProps.dst_,
          output1: simProps.dst
        });
        this.init();
      }
      update({ iterations }) {
        let p_in, p_out;
        for (let i = 0; i < iterations; i++) {
          if (i % 2 === 0) {
            p_in = this.props.output0;
            p_out = this.props.output1;
          } else {
            p_in = this.props.output1;
            p_out = this.props.output0;
          }
          this.uniforms.pressure.value = p_in.texture;
          this.props.output = p_out;
          super.update();
        }
        return p_out;
      }
    }

    class Pressure extends ShaderPass {
      constructor(simProps) {
        super({
          material: {
            vertexShader: face_vert,
            fragmentShader: pressure_frag,
            uniforms: {
              boundarySpace: { value: simProps.boundarySpace },
              pressure: { value: simProps.src_p.texture },
              velocity: { value: simProps.src_v.texture },
              px: { value: simProps.cellScale },
              dt: { value: simProps.dt }
            }
          },
          output: simProps.dst
        });
        this.init();
      }
      update({ vel, pressure }) {
        this.uniforms.velocity.value = vel.texture;
        this.uniforms.pressure.value = pressure.texture;
        super.update();
      }
    }

    class Simulation {
      constructor(options) {
        this.options = {
          iterations_poisson: 32,
          iterations_viscous: 32,
          mouse_force: 20,
          resolution: 0.5,
          cursor_size: 100,
          viscous: 30,
          isBounce: false,
          dt: 0.014,
          isViscous: false,
          BFECC: true,
          buoyancy: 0.22,
          turbulence: 0.95,
          dissipation: 0.993,
          smoke_amount: 0.32,
          smoke_radius: 0.07,
          haze_strength: 0.48,
          ambient_amount: 0.007,
          ...options
        };
        this.fbos = {
          vel_0: null,
          vel_1: null,
          vel_viscous0: null,
          vel_viscous1: null,
          div: null,
          pressure_0: null,
          pressure_1: null,
          dye_0: null,
          dye_1: null
        };
        this.fboSize = new THREE.Vector2();
        this.cellScale = new THREE.Vector2();
        this.boundarySpace = new THREE.Vector2();
        this.init();
      }
      init() {
        this.calcSize();
        this.createAllFBO();
        this.createShaderPass();
      }
      getFloatType() {
        return THREE.HalfFloatType;
      }
      createAllFBO() {
        const type = this.getFloatType();
        const opts = {
          type,
          depthBuffer: false,
          stencilBuffer: false,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          wrapS: THREE.ClampToEdgeWrapping,
          wrapT: THREE.ClampToEdgeWrapping
        };
        for (let key in this.fbos) {
          this.fbos[key] = new THREE.WebGLRenderTarget(this.fboSize.x, this.fboSize.y, opts);
        }
      }
      createShaderPass() {
        this.advection = new Advection({
          cellScale: this.cellScale,
          fboSize: this.fboSize,
          dt: this.options.dt,
          src: this.fbos.vel_0,
          dst: this.fbos.vel_1,
          dye: this.fbos.dye_0
        });
        this.dyeAdvection = new DyeAdvection({
          cellScale: this.cellScale,
          fboSize: this.fboSize,
          dt: this.options.dt,
          velocity: this.fbos.vel_0
        });
        this.dyeRead = this.fbos.dye_0;
        this.dyeWrite = this.fbos.dye_1;
        this.externalForce = new ExternalForce({
          cellScale: this.cellScale,
          cursor_size: this.options.cursor_size,
          dst: this.fbos.vel_1
        });
        this.viscous = new Viscous({
          cellScale: this.cellScale,
          boundarySpace: this.boundarySpace,
          viscous: this.options.viscous,
          src: this.fbos.vel_1,
          dst: this.fbos.vel_viscous1,
          dst_: this.fbos.vel_viscous0,
          dt: this.options.dt
        });
        this.divergence = new Divergence({
          cellScale: this.cellScale,
          boundarySpace: this.boundarySpace,
          src: this.fbos.vel_viscous0,
          dst: this.fbos.div,
          dt: this.options.dt
        });
        this.poisson = new Poisson({
          cellScale: this.cellScale,
          boundarySpace: this.boundarySpace,
          src: this.fbos.div,
          dst: this.fbos.pressure_1,
          dst_: this.fbos.pressure_0
        });
        this.pressure = new Pressure({
          cellScale: this.cellScale,
          boundarySpace: this.boundarySpace,
          src_p: this.fbos.pressure_0,
          src_v: this.fbos.vel_viscous0,
          dst: this.fbos.vel_0,
          dt: this.options.dt
        });
      }
      calcSize() {
        const width = Math.max(1, Math.round(this.options.resolution * Common.width));
        const height = Math.max(1, Math.round(this.options.resolution * Common.height));
        const px_x = 1.0 / width;
        const px_y = 1.0 / height;
        this.cellScale.set(px_x, px_y);
        this.fboSize.set(width, height);
      }
      resize() {
        this.calcSize();
        for (let key in this.fbos) {
          this.fbos[key].setSize(this.fboSize.x, this.fboSize.y);
        }
      }
      update() {
        if (this.options.isBounce) {
          this.boundarySpace.set(0, 0);
        } else {
          this.boundarySpace.copy(this.cellScale);
        }
        this.advection.update({
          dt: this.options.dt,
          isBounce: this.options.isBounce,
          BFECC: this.options.BFECC,
          dye: this.dyeRead,
          buoyancy: this.options.buoyancy,
          turbulence: this.options.turbulence
        });
        this.externalForce.update({
          cursor_size: this.options.cursor_size,
          mouse_force: this.options.mouse_force,
          cellScale: this.cellScale
        });
        let vel = this.fbos.vel_1;
        if (this.options.isViscous) {
          vel = this.viscous.update({
            viscous: this.options.viscous,
            iterations: this.options.iterations_viscous,
            dt: this.options.dt
          });
        }
        this.divergence.update({ vel });
        const pressure = this.poisson.update({
          iterations: this.options.iterations_poisson
        });
        this.pressure.update({ vel, pressure });
        this.dyeAdvection.update({
          src: this.dyeRead,
          dst: this.dyeWrite,
          dt: this.options.dt,
          dissipation: this.options.dissipation,
          smokeAmount: this.options.smoke_amount,
          smokeRadius: this.options.smoke_radius,
          ambientAmount: this.options.ambient_amount
        });
        [this.dyeRead, this.dyeWrite] = [this.dyeWrite, this.dyeRead];
      }
      dispose() {
        // The 9 HalfFloat targets hold the whole GPU footprint of the field.
        for (const key in this.fbos) {
          const fbo = this.fbos[key];
          if (fbo) fbo.dispose();
          this.fbos[key] = null;
        }
        const passes = [
          this.advection,
          this.dyeAdvection,
          this.externalForce,
          this.viscous,
          this.divergence,
          this.poisson,
          this.pressure
        ];
        for (const pass of passes) {
          if (pass) pass.dispose();
        }
        this.dyeRead = null;
        this.dyeWrite = null;
      }
    }

    class Output {
      constructor() {
        this.init();
      }
      init() {
        this.simulation = new Simulation();
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();
        this.output = new THREE.Mesh(
          new THREE.PlaneGeometry(2, 2),
          new THREE.RawShaderMaterial({
            vertexShader: face_vert,
            fragmentShader: color_frag,
            transparent: true,
            depthWrite: false,
            premultipliedAlpha: true,
            uniforms: {
              dye: { value: this.simulation.dyeRead.texture },
              boundarySpace: { value: new THREE.Vector2() },
              palette: { value: paletteTex },
              bgColor: { value: bgVec4 },
              lightMode: { value: lightMode },
              time: { value: 0 },
              texelSize: { value: this.simulation.cellScale },
              hazeStrength: { value: this.simulation.options.haze_strength },
              resolution: { value: new THREE.Vector2(Common.width, Common.height) },
              pointerUv: { value: new THREE.Vector2(0.5, 0.5) }
            }
          })
        );
        this.scene.add(this.output);
      }
      addScene(mesh) {
        this.scene.add(mesh);
      }
      resize() {
        this.simulation.resize();
        this.output.material.uniforms.resolution.value.set(Common.width, Common.height);
      }
      render() {
        Common.renderer.setRenderTarget(null);
        Common.renderer.render(this.scene, this.camera);
      }
      update(shouldSimulate = true, shouldPresent = true) {
        if (shouldSimulate) this.simulation.update();
        if (!shouldPresent) return;
        const uniforms = this.output.material.uniforms;
        uniforms.dye.value = this.simulation.dyeRead.texture;
        uniforms.time.value = Common.time;
        uniforms.resolution.value.set(Common.width, Common.height);
        uniforms.pointerUv.value.set(Mouse.coords.x * 0.5 + 0.5, Mouse.coords.y * 0.5 + 0.5);
        this.render();
      }
      dispose() {
        if (this.simulation) {
          this.simulation.dispose();
          this.simulation = null;
        }
        disposeObject3D(this.scene);
        this.scene = null;
        this.camera = null;
        this.output = null;
      }
    }

    class WebGLManager {
      constructor(props) {
        this.props = props;
        Common.init(props.$wrapper);
        Mouse.init(props.$wrapper);
        Mouse.autoIntensity = props.autoIntensity;
        Mouse.takeoverDuration = props.takeoverDuration;
        this.lastUserInteraction = performance.now();
        this.frameIndex = 0;
        this.idleTimer = null;
        this.needsPresent = true;
        this.reallocTimer = null;
        Mouse.onInteract = () => {
          this.lastUserInteraction = performance.now();
          if (this.autoDriver) this.autoDriver.forceStop();
          if (!this.running && isVisibleRef.current && !document.hidden) {
            this.start();
          }
        };
        this.autoDriver = new AutoDriver(Mouse, this, {
          enabled: props.autoDemo,
          speed: props.autoSpeed,
          resumeDelay: props.autoResumeDelay,
          rampDuration: props.autoRampDuration
        });
        this.init();
        this._loop = this.loop.bind(this);
        this._resize = this.resize.bind(this);
        window.addEventListener('resize', this._resize);
        this._onVisibility = () => {
          const hidden = document.hidden;
          if (hidden) {
            this.pause();
          } else if (isVisibleRef.current) {
            this.start();
          }
        };
        document.addEventListener('visibilitychange', this._onVisibility);
        this.running = false;
      }
      init() {
        this.props.$wrapper.prepend(Common.renderer.domElement);
        this.output = new Output();
      }
      resize() {
        // Cheap half: adopt the container size for the drawing buffer. Returning
        // early when the pixel size did not change means a burst of observer
        // callbacks that lands on the same size does no work at all.
        if (!Common.resize()) return;
        this.needsPresent = true;
        // Expensive half: reallocating the 9 HalfFloat targets must happen once
        // per resize, not once per callback, so hold it until the size settles.
        if (this.reallocTimer) window.clearTimeout(this.reallocTimer);
        this.reallocTimer = window.setTimeout(() => {
          this.reallocTimer = null;
          if (!this.output) return;
          this.output.resize();
          // Freshly allocated targets are empty, so the canvas must be redrawn.
          this.needsPresent = true;
        }, 120);
      }
      render(shouldSimulate = true, shouldPresent = true) {
        if (this.autoDriver && this.autoDriver.enabled) this.autoDriver.update();
        Mouse.update();
        Common.update();
        this.output.update(shouldSimulate, shouldPresent);
      }
      loop() {
        if (!this.running) return;
        this.frameIndex += 1;
        const idleMs = performance.now() - this.lastUserInteraction;
        // One fixed simulation step per drawn frame (simProps.dt is a constant,
        // not a wall-clock delta), so the cadence changes how much the fluid
        // advances, never how a single frame looks.
        let advance = true;
        let present = true;
        if (idleMs > IDLE_BREATH_AFTER_MS) {
          // Slow breath: the timer in scheduleNext is the throttle here, and each
          // tick only re-composites the field against a fresh shader clock. The
          // fluid does not advance, so a tick costs one draw call (the previous
          // build did the same at 15/s), while the time-driven haze and lattice
          // flares keep drifting instead of freezing.
          advance = false;
        } else if (idleMs > IDLE_HALF_RATE_AFTER_MS) {
          advance = (this.frameIndex & 1) === 0;
          present = advance;
        }
        // Draw only when the presented frame is stale. A resize or reallocation
        // leaves empty render targets behind, so it always forces a full step.
        const mustPresent = this.needsPresent;
        if (mustPresent || present) {
          this.needsPresent = false;
          this.render(mustPresent ? true : advance, true);
        }
        this.scheduleNext(idleMs);
      }
      scheduleNext(idleMs) {
        if (!this.running) return;
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        if (this.idleTimer) {
          window.clearTimeout(this.idleTimer);
          this.idleTimer = null;
        }
        if (idleMs > IDLE_BREATH_AFTER_MS) {
          this.idleTimer = window.setTimeout(this._loop, IDLE_BREATH_INTERVAL_MS);
          return;
        }
        rafRef.current = requestAnimationFrame(this._loop);
      }
      start() {
        if (this.running) return;
        this.running = true;
        // A restart (re-entering the viewport, tab visible again) always redraws
        // once, so the canvas can never stay stale while the simulation idles.
        this.needsPresent = true;
        this._loop();
      }
      pause() {
        this.running = false;
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        if (this.idleTimer) {
          window.clearTimeout(this.idleTimer);
          this.idleTimer = null;
        }
      }
      dispose() {
        try {
          this.pause();
          window.removeEventListener('resize', this._resize);
          document.removeEventListener('visibilitychange', this._onVisibility);
          if (this.reallocTimer) {
            window.clearTimeout(this.reallocTimer);
            this.reallocTimer = null;
          }
          Mouse.dispose();
          if (this.output) {
            this.output.dispose();
            this.output = null;
          }
          paletteTex.dispose();
          if (Common.renderer) {
            const canvas = Common.renderer.domElement;
            if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
            Common.renderer.dispose();
            Common.renderer = null;
          }
        } catch (e) {
          void 0;
        }
      }
    }

    const container = mountRef.current;
    container.style.position = container.style.position || 'relative';
    container.style.overflow = container.style.overflow || 'hidden';

    const webgl = new WebGLManager({
      $wrapper: container,
      autoDemo,
      autoSpeed,
      autoIntensity,
      takeoverDuration,
      autoResumeDelay,
      autoRampDuration
    });
    webglRef.current = webgl;

    const applyOptionsFromProps = () => {
      if (!webglRef.current) return;
      const sim = webglRef.current.output?.simulation;
      if (!sim) return;
      const prevRes = sim.options.resolution;
      Object.assign(sim.options, {
        mouse_force: mouseForce,
        cursor_size: cursorSize,
        isViscous,
        viscous,
        iterations_viscous: iterationsViscous,
        iterations_poisson: iterationsPoisson,
        dt,
        BFECC,
        resolution,
        isBounce
      });
      if (resolution !== prevRes) {
        sim.resize();
      }
    };
    applyOptionsFromProps();

    webgl.start();

    // IntersectionObserver to pause rendering when not visible
    const io = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        const isVisible = entry.isIntersecting && entry.intersectionRatio > 0;
        isVisibleRef.current = isVisible;
        if (!webglRef.current) return;
        if (isVisible && !document.hidden) {
          webglRef.current.start();
        } else {
          webglRef.current.pause();
        }
      },
      { threshold: [0, 0.01, 0.1] }
    );
    io.observe(container);
    intersectionObserverRef.current = io;

    const ro = new ResizeObserver(() => {
      if (!webglRef.current) return;
      // One layout read per frame for the burst; the manager then coalesces the
      // expensive render-target reallocation behind a settle timer.
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = requestAnimationFrame(() => {
        resizeRafRef.current = null;
        if (!webglRef.current) return;
        webglRef.current.resize();
      });
    });
    ro.observe(container);
    resizeObserverRef.current = ro;

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = null;
      if (resizeObserverRef.current) {
        try {
          resizeObserverRef.current.disconnect();
        } catch (e) {
          void 0;
        }
      }
      if (intersectionObserverRef.current) {
        try {
          intersectionObserverRef.current.disconnect();
        } catch (e) {
          void 0;
        }
      }
      if (webglRef.current) {
        webglRef.current.dispose();
      }
      webglRef.current = null;
    };
  }, [
    BFECC,
    cursorSize,
    dt,
    isBounce,
    isViscous,
    iterationsPoisson,
    iterationsViscous,
    mouseForce,
    resolution,
    viscous,
    colors,
    autoDemo,
    autoSpeed,
    autoIntensity,
    takeoverDuration,
    autoResumeDelay,
    autoRampDuration,
    backgroundColor,
    lightMode
  ]);

  useEffect(() => {
    const webgl = webglRef.current;
    if (!webgl) return;
    const sim = webgl.output?.simulation;
    if (!sim) return;
    const prevRes = sim.options.resolution;
    Object.assign(sim.options, {
      mouse_force: mouseForce,
      cursor_size: cursorSize,
      isViscous,
      viscous,
      iterations_viscous: iterationsViscous,
      iterations_poisson: iterationsPoisson,
      dt,
      BFECC,
      resolution,
      isBounce
    });
    if (webgl.autoDriver) {
      webgl.autoDriver.enabled = autoDemo;
      webgl.autoDriver.speed = autoSpeed;
      webgl.autoDriver.resumeDelay = autoResumeDelay;
      webgl.autoDriver.rampDurationMs = autoRampDuration * 1000;
      if (webgl.autoDriver.mouse) {
        webgl.autoDriver.mouse.autoIntensity = autoIntensity;
        webgl.autoDriver.mouse.takeoverDuration = takeoverDuration;
      }
    }
    if (resolution !== prevRes) {
      sim.resize();
    }
  }, [
    mouseForce,
    cursorSize,
    isViscous,
    viscous,
    iterationsViscous,
    iterationsPoisson,
    dt,
    BFECC,
    resolution,
    isBounce,
    autoDemo,
    autoSpeed,
    autoIntensity,
    takeoverDuration,
    autoResumeDelay,
    autoRampDuration
  ]);

  return (
    <div
      ref={mountRef}
      className={`w-full h-full relative overflow-hidden pointer-events-none touch-none ${className || ''}`}
      style={style}
    />
  );
}
