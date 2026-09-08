import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);

test("all supported PDK models pass the engine smoke gate", async () => {
  test.setTimeout(60_000);
  const { stdout } = await execFileAsync(
    process.execPath,
    ["--experimental-strip-types", "scripts/verify-pdk-engine.ts"],
    { cwd: process.cwd(), maxBuffer: 2 * 1024 * 1024 },
  );

  for (const expected of [
    "PASS GF180 MCU",
    "PASS FreePDK45",
    "PASS FreePDK15",
    "PASS CMOS90 benchmark",
    "PASS PTM 90 nm",
    "PASS PTM LP 16 nm",
    "PASS PTM HP 45 nm",
    "PASS GF180 statistical",
    "PASS GF180 nmos_6p0_nat",
    "PASS GF180 pmos_6p0_sab",
    "PASS GF180 opamp typical operating point",
    "PASS GF180 opamp sf transient",
    "PASS GF180 opamp shifted VSS and instance isolation",
    "PASS GF180 opamp statistical convergence",
  ]) {
    expect(stdout).toContain(expected);
  }
});
