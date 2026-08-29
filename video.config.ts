import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/videos",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    headless: false,
  },
  projects: [
    {
      name: "videos",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        headless: false,
        colorScheme: "dark",
        viewport: { width: 1280, height: 720 },
        video: {
          mode: "on",
          size: { width: 1280, height: 720 },
        },
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
