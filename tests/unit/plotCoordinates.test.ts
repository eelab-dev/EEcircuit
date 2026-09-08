import { describe, expect, it } from "vitest";
import { axisTransform, plotCoordinate, plotSegments } from "../../src/utils/plotCoordinates";
import { formatPlotValue, plotAxisLabel, plotUnit } from "../../src/utils/plotUnits";
import { createPlotSlice } from "../../src/store/plotStore";
import type { ResultType } from "eecircuit-engine";

describe("plot coordinate and unit contract", () => {
  it("centers constant linear phase and logarithmic magnitude", () => {
    for (const value of [-90, -3, 2, 0]) {
      const { scale, offset } = axisTransform(value, value);
      expect(value * scale + offset).toBe(0);
    }
    expect(axisTransform(Infinity, -Infinity)).toEqual({ scale: 1, offset: 0 });
    expect(plotCoordinate(0.001, true)).toBe(-3);
  });

  it("does not bridge nonpositive or nonfinite logarithmic samples", () => {
    const points = new Float32Array([1, 1, 2, 2, 3, 0, 4, -1, 5, 5, 6, 6, 7, NaN, 8, Infinity]);
    expect(plotSegments(points, true, true).map((part) => [...part])).toEqual([[1, 1, 2, 2], [5, 5, 6, 6]]);
    expect(plotSegments(new Float32Array([0, 1, 1, 2, 2, 3]), true, false).map((part) => [...part])).toEqual([[1, 2, 2, 3]]);
  });

  it("uses physical units without confusing degrees and electrical amplitudes", () => {
    expect(plotUnit("v(out)[phase]", "voltage")).toBe("°");
    expect(plotUnit("i(v1)[phase]", "current")).toBe("°");
    expect(plotUnit("i(v1)[mag]")).toBe("A");
    expect(plotUnit("v(out)[mag]")).toBe("V");
    expect(plotUnit("frequency")).toBe("Hz");
    expect(formatPlotValue(1e6, "Hz")).toBe("1.000 MHz");
    expect(formatPlotValue(0.001, "A")).toBe("1.000 mA");
    expect(formatPlotValue(-0.001, "°")).toBe("-0.001 °");
    expect(plotAxisLabel("Magnitude", ["V", "A", "V"])).toBe("Magnitude (V, A)");
  });
});

type State = ReturnType<Parameters<typeof createPlotSlice>[1]>;
function harness() {
  const state = {} as State;
  const set: Parameters<typeof createPlotSlice>[0] = (update) => Object.assign(state, typeof update === "function" ? update(state) : update);
  Object.assign(state, { results: [], selectedSimType: "AC", netList: ".ac dec 10 1 1000" }, createPlotSlice(set, () => state));
  return state;
}
const acResult: ResultType = {
  header: "AC", numVariables: 2, numPoints: 2, variableNames: ["frequency", "v(out)"], dataType: "complex",
  data: [
    { name: "frequency", type: "frequency", values: [{ real: 1, img: 0 }, { real: 1000, img: 0 }] },
    { name: "v(out)", type: "voltage", values: [{ real: 1, img: 0 }, { real: .5, img: -.5 }] },
  ],
};

describe("accepted plot simulation state", () => {
  it("applies AC defaults once and keeps manual scales across progressive publications", () => {
    const state = harness();
    state.clearResults();
    state.handleNewResults([acResult]);
    expect(state).toMatchObject({ plotGeneration: 1, plotAnalysis: "AC", isLogX: true, isLogY1: true, isLogY2: false });
    state.toggleLogX();
    state.toggleLogY1();
    state.selectedSimType = "Transient";
    state.handleNewResults([acResult], { switchToPlot: false });
    expect(state).toMatchObject({ plotGeneration: 1, plotAnalysis: "AC", isLogX: false, isLogY1: false });
    expect(state.results[0]?.variableNames).toContain("v(out)[phase]");
    state.clearResults();
    state.selectedSimType = "AC";
    state.handleNewResults([acResult]);
    expect(state).toMatchObject({ plotGeneration: 2, isLogX: true, isLogY1: true });
  });
});
