/**
 * Returns a cubic Bezier interpolation between three control points
 * at time t in [0, 1]. Used by the canvas to move particles along
 * curved trajectories between beat compositions.
 */
export function bezier3(
  out: [number, number, number],
  p0: [number, number, number],
  c: [number, number, number],
  p1: [number, number, number],
  t: number,
): [number, number, number] {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  for (let i = 0; i < 3; i++) {
    out[i] = uu * p0[i] + 2 * u * t * c[i] + tt * p1[i];
  }
  return out;
}

/** Linear interpolation, scalar. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smoothstep easing. */
export const smoothstep = (t: number) => t * t * (3 - 2 * t);
