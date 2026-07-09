import { Effect } from "postprocessing";
import { Uniform } from "three";
import { wrapEffect } from "@react-three/postprocessing";

/**
 * Soft print grain — Tank! fly-by cut is mostly flat color;
 * keep blend low so silhouette + trail stay sharp.
 */
const FRAGMENT_SHADER = `
  uniform float dotSize;
  uniform float blendAmount;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 fragCoord = uv * resolution.xy;
    vec2 cell     = floor(fragCoord / dotSize);
    vec2 center   = (cell + 0.5) * dotSize;
    float dist    = distance(fragCoord, center);
    vec4  samp    = texture2D(inputBuffer, center / resolution.xy);
    float luma    = dot(samp.rgb, vec3(0.299, 0.587, 0.114));
    float maxR    = dotSize * 0.42;
    float radius  = mix(maxR * 0.15, maxR, luma);
    float inDot   = step(dist, radius);
    vec3 between  = samp.rgb * 0.92;
    vec3 halftone = mix(between, samp.rgb, inDot);
    outputColor   = vec4(mix(inputColor.rgb, halftone, blendAmount), inputColor.a);
  }
`;

class HalftoneEffectImpl extends Effect {
  constructor({ dotSize = 3.0, blendAmount = 0.18 } = {}) {
    super("HalftoneEffect", FRAGMENT_SHADER, {
      uniforms: new Map([
        ["dotSize", new Uniform(dotSize)],
        ["blendAmount", new Uniform(blendAmount)],
      ]),
    });
  }
}

const HalftoneEffect = wrapEffect(HalftoneEffectImpl);
HalftoneEffect.displayName = "HalftoneEffect";

export { HalftoneEffectImpl };
export default HalftoneEffect;
