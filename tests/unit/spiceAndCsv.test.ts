import { describe, expect, it } from "vitest";
import { resultsToCSVString } from "../../src/utils/csvExport";
import { parseSpiceLine } from "../../src/utils/spiceLineParser";
import { detectSourcesFromNetlist } from "../../src/utils/sourceDetection";
import {
  getSpiceCompletionContext,
  SPICE_COMMENT_PATTERN,
  SPICE_COMPONENT_COMPLETIONS,
  SPICE_DIRECTIVE_COMPLETIONS,
  SPICE_DIRECTIVE_PATTERN,
  SPICE_NUMBER_PATTERN,
  SPICE_SWEEP_PATTERN,
  spiceLanguageConfiguration,
  spiceMonarchLanguage,
} from "../../src/editor/spiceLanguage";

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

describe("SPICE editor language support", () => {
  it("recognizes ngspice numbers and EEcircuit engineering suffixes", () => {
    for (const value of [
      "1",
      "-0.25",
      ".5",
      "1e9",
      "2.5E-3",
      "1k",
      "100Meg",
      "100MEG",
      "1G",
      "1T",
      "1M",
      "1m",
      "1u",
      "1n",
      "1p",
      "1f",
      "1a",
    ]) {
      expect(SPICE_NUMBER_PATTERN.test(value), value).toBe(true);
    }

    for (const value of ["1e", "Meg", "1unknown"]) {
      expect(SPICE_NUMBER_PATTERN.test(value), value).toBe(false);
    }
  });

  it("recognizes exactly the bracket sweep forms accepted by EEcircuit", () => {
    for (const sweep of [
      "[0:2:10]u",
      "[0u:2u:10u]",
      "[-1.5:0.5:2]Meg",
      "[1M:1M:10M]",
    ]) {
      expect(SPICE_SWEEP_PATTERN.test(sweep), sweep).toBe(true);
    }

    expect(SPICE_SWEEP_PATTERN.test("[0:1e-3:1]")).toBe(false);
    expect(SPICE_SWEEP_PATTERN.test("[0:2]")).toBe(false);
  });

  it("anchors directives and full-line comments as SPICE syntax", () => {
    expect(SPICE_COMMENT_PATTERN.test("   * amplifier stage")).toBe(true);
    expect(SPICE_COMMENT_PATTERN.test("R1 in out 1k * not a full-line comment")).toBe(false);
    expect(SPICE_DIRECTIVE_PATTERN.test("  .param gain=1e9")).toBe(true);
    expect(SPICE_DIRECTIVE_PATTERN.test("R1 .param 1k")).toBe(false);
    expect(spiceMonarchLanguage).not.toHaveProperty("escapes");
    expect(spiceMonarchLanguage.tokenizer).not.toHaveProperty("string");
  });

  it("defines SPICE word, comment, bracket, and quote behavior", () => {
    expect(spiceLanguageConfiguration.comments?.lineComment).toBe("*");
    expect(spiceLanguageConfiguration.brackets).toEqual([
      ["(", ")"],
      ["[", "]"],
    ]);
    expect(spiceLanguageConfiguration.autoClosingPairs).toContainEqual({
      open: '"',
      close: '"',
    });
    expect(spiceLanguageConfiguration.wordPattern?.test(".param")).toBe(true);
  });

  it("offers valid and accurately documented SPICE snippets", () => {
    expect(SPICE_DIRECTIVE_COMPLETIONS.map(({ label }) => label)).toEqual([
      ".include",
      ".tran",
      ".dc",
      ".ac",
      ".save",
      ".param",
    ]);
    expect(SPICE_DIRECTIVE_COMPLETIONS.some(({ label }) => label === ".parameter")).toBe(false);
    expect(SPICE_DIRECTIVE_COMPLETIONS.find(({ label }) => label === ".ac")).toMatchObject({
      documentation: expect.stringContaining("AC analysis"),
      insertText: expect.stringContaining("${1|dec,oct,lin|}"),
    });
    expect(SPICE_DIRECTIVE_COMPLETIONS.find(({ label }) => label === ".save")?.documentation)
      .toContain("vectors to save");
    expect(SPICE_COMPONENT_COMPLETIONS.find(({ label }) => label === "R (resistor)")?.insertText)
      .toBe("R${1:number} ${2:node1} ${3:node2} ${4:value}");
  });

  it("completes only a component or directive prefix while preserving indentation", () => {
    expect(getSpiceCompletionContext("   R", 5)).toEqual({
      type: "component",
      startColumn: 4,
      endColumn: 5,
    });
    expect(getSpiceCompletionContext("  .pa", 6)).toEqual({
      type: "directive",
      startColumn: 3,
      endColumn: 6,
    });
    expect(getSpiceCompletionContext("R1 in", 6)).toBeNull();
  });
});
