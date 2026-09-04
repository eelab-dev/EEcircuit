import { defineConfig } from "@playwright/test";

const localOrigin = "http://127.0.0.1:4177";

export default defineConfig({
  testDir: "./tests/ipad",
  testMatch: ["*.spec.ts"],
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  reporter: "list",
  use: {
    baseURL: localOrigin,
    headless: false,
    screenshot: "off",
    trace: "off",
    video: "off",
  },
  projects: [
    {
      name: "safari-ipad",
      testMatch: ["safaridriver.spec.ts"],
    },
    {
      name: "safari-ipad-xcuitest",
      testMatch: ["xcuitest.spec.ts"],
      timeout: 180_000,
    },
  ],
  webServer: {
    command: "npm run preview -- --host 0.0.0.0 --port 4177 --strictPort",
    url: localOrigin,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
