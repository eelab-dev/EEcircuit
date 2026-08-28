import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/preview",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4174",
    headless: false,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "preview-chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        headless: false,
      },
    },
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4174 --strictPort",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
  },
});
