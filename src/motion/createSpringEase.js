/**
 * Sample a damped harmonic oscillator into a GSAP CustomEase coordinate string.
 * Displacement starts at 1 and settles at 0; the ease maps that to 0 → 1.
 *
 * @param {{ stiffness?: number, damping?: number, mass?: number, restDelta?: number, sampleCount?: number }} params
 * @returns {string} `"0,0, … ,1,1"` for `CustomEase.create`
 */
export function createSpringEase({
  stiffness = 120,
  damping = 20,
  mass = 1,
  restDelta = 0.0008,
  sampleCount = 48,
} = {}) {
  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const decay = Math.max(zeta * omega0, 0.0001);
  const duration = Math.min(Math.log(1 / restDelta) / decay, 2.4);

  const points = [];

  for (let i = 0; i <= sampleCount; i += 1) {
    const timeNorm = i / sampleCount;
    const time = timeNorm * duration;
    const remaining = sampleDisplacement(time, omega0, zeta);
    const progress = 1 - remaining;
    points.push(timeNorm.toFixed(4), progress.toFixed(4));
  }

  points[points.length - 2] = "1";
  points[points.length - 1] = "1";
  points[0] = "0";
  points[1] = "0";

  return points.join(",");
}

function sampleDisplacement(time, omega0, zeta) {
  if (zeta < 1) {
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    return (
      Math.exp(-zeta * omega0 * time) *
      (Math.cos(omegaD * time) + ((zeta * omega0) / omegaD) * Math.sin(omegaD * time))
    );
  }

  if (zeta === 1) {
    return Math.exp(-omega0 * time) * (1 + omega0 * time);
  }

  const omegaD = omega0 * Math.sqrt(zeta * zeta - 1);
  const root1 = -omega0 * zeta + omegaD;
  const root2 = -omega0 * zeta - omegaD;
  const coeffA = root2 / (root2 - root1);
  const coeffB = 1 - coeffA;
  return coeffA * Math.exp(root1 * time) + coeffB * Math.exp(root2 * time);
}
