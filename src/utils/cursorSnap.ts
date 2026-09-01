export type InterpolatedLinePoint = {
  coordinateX: number;
  coordinateY: number;
  rawX: number;
  rawY: number;
};

function toCoordinate(value: number, logarithmic: boolean) {
  if (!logarithmic) return Number.isFinite(value) ? value : null;
  return value > 0 && Number.isFinite(value) ? Math.log10(value) : null;
}

function fromCoordinate(value: number, logarithmic: boolean) {
  return logarithmic ? 10 ** value : value;
}

/**
 * Finds the point on a monotonic-X plotted line at the requested data-space X.
 * Interpolation happens in the same linear/log space used by the plot shader.
 */
export function interpolateLineAtX(
  points: Float32Array,
  targetCoordinateX: number,
  isLogX: boolean,
  isLogY: boolean,
): InterpolatedLinePoint | null {
  const count = points.length / 2;
  if (!count) return null;
  const xAt = (index: number) => toCoordinate(points[index * 2] ?? Number.NaN, isLogX);
  let firstIndex = 0;
  while (firstIndex < count && xAt(firstIndex) === null) firstIndex += 1;
  let lastIndex = count - 1;
  while (lastIndex >= firstIndex && xAt(lastIndex) === null) lastIndex -= 1;
  if (firstIndex > lastIndex) return null;

  const first = xAt(firstIndex);
  const last = xAt(lastIndex);
  if (first === null || last === null) return null;

  const ascending = first <= last;
  let lower = firstIndex;
  let upper = lastIndex;
  const beforeStart = ascending ? targetCoordinateX <= first : targetCoordinateX >= first;
  const afterEnd = ascending ? targetCoordinateX >= last : targetCoordinateX <= last;
  if (beforeStart) upper = 0;
  else if (afterEnd) lower = count - 1;
  else {
    while (lower + 1 < upper) {
      const middle = Math.floor((lower + upper) / 2);
      const value = xAt(middle);
      if (value === null) return null;
      if ((ascending && value <= targetCoordinateX) || (!ascending && value >= targetCoordinateX)) lower = middle;
      else upper = middle;
    }
  }

  let lowerX = xAt(lower);
  let upperX = xAt(upper);
  let lowerY = toCoordinate(points[lower * 2 + 1] ?? Number.NaN, isLogY);
  let upperY = toCoordinate(points[upper * 2 + 1] ?? Number.NaN, isLogY);

  // A log axis cannot display zero or negative samples. Skip invalid boundary
  // points without treating the whole otherwise-valid curve as unsnappable.
  while (lowerY === null && lower > firstIndex) {
    lower -= 1;
    lowerX = xAt(lower);
    lowerY = toCoordinate(points[lower * 2 + 1] ?? Number.NaN, isLogY);
  }
  while (upperY === null && upper < lastIndex) {
    upper += 1;
    upperX = xAt(upper);
    upperY = toCoordinate(points[upper * 2 + 1] ?? Number.NaN, isLogY);
  }
  if (lowerY === null && upperX !== null && upperY !== null) {
    lowerX = upperX;
    lowerY = upperY;
  }
  if (upperY === null && lowerX !== null && lowerY !== null) {
    upperX = lowerX;
    upperY = lowerY;
  }
  if (lowerX === null || upperX === null || lowerY === null || upperY === null) return null;

  const interval = upperX - lowerX;
  const ratio = interval === 0 ? 0 : Math.max(0, Math.min(1, (targetCoordinateX - lowerX) / interval));
  const coordinateX = lowerX + interval * ratio;
  const coordinateY = lowerY + (upperY - lowerY) * ratio;
  return {
    coordinateX,
    coordinateY,
    rawX: fromCoordinate(coordinateX, isLogX),
    rawY: fromCoordinate(coordinateY, isLogY),
  };
}
