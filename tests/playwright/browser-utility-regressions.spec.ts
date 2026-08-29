import { expect, test } from "./fixtures";

test.describe("browser-loaded utility regressions", () => {
  test("validates bounded bracket expansion and mixed units", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const result = await page.evaluate(async () => {
      const load = (path: string) => import(/* @vite-ignore */ path);
      const { parseBracketOperation, validateBracketOperation } = await load("/src/utils/bracketParser.ts");
      const mixed = parseBracketOperation("R1 1 0 [0u:1m:2m]");
      const boundary = parseBracketOperation("R1 1 0 [0:1:999]");
      const oversized = validateBracketOperation("R1 1 0 [0:0.000001:1000]");
      const wrongDirection = validateBracketOperation("R1 1 0 [1:1:0]");
      return { mixed: mixed.values, boundaryCount: boundary.values?.length, oversized, wrongDirection };
    });

    expect(result.mixed).toEqual(["0", "0.001", "0.002"]);
    expect(result.boundaryCount).toBe(1000);
    expect(result.oversized.isValid).toBe(false);
    expect(result.wrongDirection.isValid).toBe(false);
  });

  test("parses parameterized subcircuits and ignores internal sources", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const load = (path: string) => import(/* @vite-ignore */ path);
      const { parseSpiceLine } = await load("/src/utils/spiceLineParser.ts");
      const { detectSourcesFromNetlist } = await load("/src/utils/sourceDetection.ts");
      const parsed = parseSpiceLine("X1 in out amp gain=10");
      const sources = detectSourcesFromNetlist([
        ".subckt amp in out",
        "Vin in 0 AC 1",
        ".ends amp",
        "Vtop in 0 DC 1",
      ].join("\n"));
      return { parsed, sources };
    });

    expect(result.parsed?.nodes).toEqual(["in", "out"]);
    expect(result.parsed?.subcircuitName).toBe("amp");
    expect(result.parsed?.parameters).toEqual(["gain=10"]);
    expect(result.sources).toEqual(["Vtop"]);
  });

  test("escapes CSV headers containing commas and quotes", async ({ page }) => {
    await page.goto("/");
    const csv = await page.evaluate(async () => {
      const load = (path: string) => import(/* @vite-ignore */ path);
      const { resultsToCSVString } = await load("/src/utils/csvExport.ts");
      return resultsToCSVString([{
        header: "test",
        numVariables: 2,
        variableNames: ["time", "I(V1,1) \"load\""],
        numPoints: 1,
        dataType: "real",
        data: [{ name: "time", values: [0] }, { name: "I(V1,1) \"load\"", values: [1.5] }],
      } as never]);
    });
    expect(csv).toContain('time,"I(V1,1) ""load"""');
    expect(csv).toContain("0,1.5");
  });
});
