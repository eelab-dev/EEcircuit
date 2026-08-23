import { describe, expect, it } from "vitest";
import {
  MAX_BRACKET_VALUES,
  parseBracketOperation,
  validateBracketOperation,
} from "../../src/utils/bracketParser";
import { expandNetlist } from "../../src/utils/netlistExpander";

describe("bracket operations", () => {
  it("normalizes mixed units independently", () => {
    expect(parseBracketOperation("R1 1 0 [0u:1m:2m]").values).toEqual([
      "0", "0.001", "0.002",
    ]);
  });

  it("rejects invalid directions and zero steps", () => {
    expect(validateBracketOperation("R1 1 0 [1:1:0]").isValid).toBe(false);
    expect(validateBracketOperation("R1 1 0 [0:0:1]").isValid).toBe(false);
  });

  it("accepts exactly the configured maximum and rejects larger ranges", () => {
    expect(parseBracketOperation(`R1 1 0 [0:1:${MAX_BRACKET_VALUES - 1}]`).values).toHaveLength(MAX_BRACKET_VALUES);
    expect(validateBracketOperation("R1 1 0 [0:0.1:100]").isValid).toBe(false);
  });

  it("expands only the first bracket lazily", () => {
    const expansion = expandNetlist("R1 1 0 [1:1:2]k\nC1 2 0 [1:1:2]u");
    expect(expansion.parameterValues).toEqual(["1k", "2k"]);
    expect(expansion.expandAt?.(1).netlist).toContain("2k");
    expect(expansion.expandAt?.(1).netlist).toContain("[1:1:2]u");
  });
});
