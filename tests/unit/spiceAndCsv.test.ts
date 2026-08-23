import { describe, expect, it } from "vitest";
import { resultsToCSVString } from "../../src/utils/csvExport";
import { parseSpiceLine } from "../../src/utils/spiceLineParser";
import { detectSourcesFromNetlist } from "../../src/utils/sourceDetection";

describe("SPICE parsing and CSV export", () => {
  it("parses subcircuit parameters after PARAMS and trailing assignments", () => {
    expect(parseSpiceLine("X1 in out amp PARAMS: gain=10 bias=2")).toMatchObject({
      nodes: ["in", "out"],
      subcircuitName: "amp",
      parameters: ["gain=10", "bias=2"],
    });
  });

  it("ignores sources nested inside subcircuits", () => {
    expect(detectSourcesFromNetlist([
      "* comment",
      ".subckt amp in out",
      "Vin in 0 AC 1",
      ".ends amp",
      "Vtop in 0 DC 1",
      "Iload out 0 1m",
    ].join("\n"))).toEqual(["Vtop", "Iload"]);
  });

  it("quotes commas, quotes, and line breaks according to RFC 4180", () => {
    const csv = resultsToCSVString([{
      header: "test",
      numVariables: 2,
      variableNames: ["time", "I(V1,1) \"load\"\nphase"],
      numPoints: 1,
      dataType: "real",
      data: [
        { name: "time", values: [0] },
        { name: "I(V1,1) \"load\"\nphase", values: [1.5] },
      ],
    } as never]);
    expect(csv).toContain('time,"I(V1,1) ""load""\nphase"\r\n');
    expect(csv).toContain("0,1.5");
  });
});
