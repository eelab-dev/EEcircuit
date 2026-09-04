#!/usr/bin/env node
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const allowedLocalKeys = new Set([
  "SAFARI_DEVICE_UDID",
  "SAFARI_IPAD_BASE_URL",
  "APPIUM_XCODE_ORG_ID",
  "APPIUM_XCODE_SIGNING_ID",
  "APPIUM_XCODE_CONFIG_FILE",
  "APPIUM_WDA_BUNDLE_ID",
  "APPIUM_ALLOW_PROVISIONING_UPDATES",
  "APPIUM_USE_PREINSTALLED_WDA",
  "APPIUM_SHOW_XCODE_LOG",
]);

const unquote = (value) => {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'")))) return trimmed.slice(1, -1);
  return trimmed;
};

const loadLocalEnvironment = (path) => {
  if (!existsSync(path)) return;
  for (const [index, sourceLine] of readFileSync(path, "utf8").split(/\r?\n/u).entries()) {
    const line = sourceLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/u.exec(line);
    if (!match) throw new Error(`${path}:${index + 1}: expected NAME=value`);
    const [, key, rawValue] = match;
    if (!allowedLocalKeys.has(key)) throw new Error(`${path}:${index + 1}: unsupported iPad setting ${key}`);
    if (process.env[key] === undefined) process.env[key] = unquote(rawValue);
  }
};

const run = (command, args, environment) => {
  const result = spawnSync(command, args, { cwd: process.cwd(), env: environment, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

const target = process.argv[2] ?? "all";
const projects = target === "all"
  ? ["safari-ipad", "safari-ipad-xcuitest"]
  : target === "single-touch"
    ? ["safari-ipad"]
    : target === "xcuitest"
      ? ["safari-ipad-xcuitest"]
      : null;
if (!projects) throw new Error(`Unknown iPad test target: ${target}`);

const configPath = resolve(process.env.SAFARI_IPAD_CONFIG_FILE?.trim() || ".ipad-testing.env");
loadLocalEnvironment(configPath);
if (projects.includes("safari-ipad-xcuitest") && process.env.APPIUM_USE_PREINSTALLED_WDA !== "1" &&
  !process.env.APPIUM_XCODE_CONFIG_FILE && !process.env.APPIUM_XCODE_ORG_ID) {
  throw new Error(
    "XCUITest signing is not configured. Copy .ipad-testing.env.example to .ipad-testing.env and set your Apple Team ID, " +
    "or provide APPIUM_XCODE_CONFIG_FILE/APPIUM_USE_PREINSTALLED_WDA in the environment.",
  );
}

const environment = { ...process.env, SAFARI_IPAD_TEST: "1" };
run("npm", ["run", "build"], environment);
run("npm", ["run", "check:chunks"], environment);
copyFileSync(
  resolve("tests/ipad/fixtures/safari-coordinate-calibration.html"),
  resolve("dist/safari-coordinate-calibration.html"),
);
const playwrightCli = resolve("node_modules/@playwright/test/cli.js");
run(process.execPath, [playwrightCli, "test", "--config=playwright.ipad.config.ts",
  ...projects.flatMap((project) => ["--project", project])], environment);
