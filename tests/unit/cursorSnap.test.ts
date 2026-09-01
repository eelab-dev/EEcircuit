import { describe, expect, it } from "vitest";
import { interpolateLineAtX } from "../../src/utils/cursorSnap";

describe("plot cursor snapping", () => {
  it("tracks the requested data X instead of clamping screen coordinates to the final sample", () => {
    const points = new Float32Array([0, 0, 0.005, 5, 0.01, 10]);

    const left = interpolateLineAtX(points, 0.003, false, false);
    const right = interpolateLineAtX(points, 0.007, false, false);

    expect(left).toMatchObject({ rawX: expect.closeTo(0.003, 6), rawY: expect.closeTo(3, 5) });
    expect(right).toMatchObject({ rawX: expect.closeTo(0.007, 6), rawY: expect.closeTo(7, 5) });
    expect(right?.rawX).not.toBe(0.01);
  });

  it("interpolates with logarithmic X and linear Y", () => {
    const point = interpolateLineAtX(new Float32Array([1, 10, 10, 20]), 0.5, true, false);
    expect(point?.rawX).toBeCloseTo(Math.sqrt(10), 5);
    expect(point?.rawY).toBeCloseTo(15, 5);
  });

  it("interpolates with linear X and logarithmic Y", () => {
    const point = interpolateLineAtX(new Float32Array([0, 10, 10, 1_000]), 5, false, true);
    expect(point?.rawX).toBeCloseTo(5, 5);
    expect(point?.rawY).toBeCloseTo(100, 5);
  });

  it("interpolates with logarithmic X and Y", () => {
    const point = interpolateLineAtX(new Float32Array([1, 10, 10, 1_000]), 0.5, true, true);
    expect(point?.rawX).toBeCloseTo(Math.sqrt(10), 5);
    expect(point?.rawY).toBeCloseTo(100, 5);
  });

  it("ignores a zero transient-time sample when Log X is enabled", () => {
    const point = interpolateLineAtX(new Float32Array([0, 0, 0.001, 1, 0.01, 2]), -2.5, true, false);
    expect(point?.rawX).toBeCloseTo(10 ** -2.5, 7);
    expect(point?.rawY).toBeCloseTo(1.5, 5);
  });

  it("uses the first positive curve point when Log Y excludes an initial zero", () => {
    const point = interpolateLineAtX(new Float32Array([0, 0, 1, 10, 2, 100]), 0.5, false, true);
    expect(point?.rawX).toBe(1);
    expect(point?.rawY).toBeCloseTo(10, 5);
  });

  it("supports descending X values", () => {
    const point = interpolateLineAtX(new Float32Array([10, 20, 0, 0]), 2, false, false);
    expect(point).toMatchObject({ rawX: 2, rawY: 4 });
  });

  it("clamps only when the requested data X is outside the curve", () => {
    const points = new Float32Array([2, 4, 8, 16]);
    expect(interpolateLineAtX(points, -1, false, false)).toMatchObject({ rawX: 2, rawY: 4 });
    expect(interpolateLineAtX(points, 12, false, false)).toMatchObject({ rawX: 8, rawY: 16 });
  });
});
