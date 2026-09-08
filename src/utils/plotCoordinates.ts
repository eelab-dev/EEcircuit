/** All bounds and transforms use the same coordinates as the WebGL log shader. */
export function plotCoordinate(value: number, logarithmic: boolean): number | null {
  if (!Number.isFinite(value) || (logarithmic && value <= 0)) return null;
  return logarithmic ? Math.log10(value) : value;
}

export function axisTransform(min: number, max: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { scale: 1, offset: 0 };
  const range = max - min;
  // A constant signal needs an offset too (e.g. -90 degrees or log10(1 mA)).
  const scale = range > 0 ? 2 / range : 1;
  return { scale, offset: -(min + range / 2) * scale };
}

/** Split at invalid samples so neither rendering nor snapping bridges a log-domain gap. */
export function plotSegments(points: Float32Array, logX: boolean, logY: boolean): Float32Array[] {
  const segments: Float32Array[] = [];
  let start = 0;
  for (let index = 0; index <= points.length; index += 2) {
    if (index < points.length && plotCoordinate(points[index]!, logX) !== null && plotCoordinate(points[index + 1]!, logY) !== null) continue;
    if (index - start >= 4) segments.push(points.subarray(start, index));
    start = index + 2;
  }
  return segments;
}

export interface SharedPlotTransform {
  scaleX: number;
  offsetX: number;
  generation: number;
  logX: boolean;
  revision: number;
}
