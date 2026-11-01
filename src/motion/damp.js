/**
 * Frame-rate independent exponential smoothing.
 *
 * Every smoothing layer in this repo used to advance by a constant fraction of
 * the remaining distance *per frame* (`value += (target - value) * 0.07`). That
 * fraction is a different real-world time constant on every device: the same
 * 0.07 trails twice as long at 30 fps and almost disappears at 120 fps, which
 * is why the field's lag changed with the hardware instead of with the scroll
 * (audit.md §10 P0-2).
 *
 * `damp` reads the same feel as a rate per second, so the settle is identical at
 * any refresh rate. `lambda` is that rate (1/s) and `dt` is the frame delta in
 * seconds. Converting a factor this repo already shipped: at 60 fps a factor
 * `f` is `lambda = -60 · ln(1 - f)` — 0.07 → 4.35, 0.14 → 9.05. Lenis smooths
 * its own scroll value with exactly this formula (`lerp * 60` as the rate),
 * which is what makes the scroll layer and the pointer layers agree.
 *
 * Large `dt` is safe by construction: the factor approaches 1, so a tab that
 * was in the background for a minute lands on the target instead of lurching
 * through it.
 */
export function damp(value, target, lambda, dt) {
  if (!Number.isFinite(dt) || dt <= 0) return value;
  if (!Number.isFinite(lambda) || lambda <= 0) return target;
  return value + (target - value) * (1 - Math.exp(-lambda * dt));
}

/**
 * The rate a per-frame factor stood for at `fps` frames per second. Kept
 * exported so the conversion is checkable instead of a magic number in a
 * comment.
 */
export function lambdaFromFrameFactor(factor, fps = 60) {
  if (!(factor > 0 && factor < 1) || !(fps > 0)) return 0;
  return -fps * Math.log(1 - factor);
}
