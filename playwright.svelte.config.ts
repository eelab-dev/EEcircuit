import { defineConfig, devices } from "@playwright/test";

/** Headed migration harness kept separate while the legacy preview remains available. */
export default defineConfig({
  testDir: "./tests",
  testMatch: ["playwright/**/*.spec.ts", "preview/**/*.spec.ts"],
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5175",
    trace: "retain-on-failure",
    headless: false,
  },
  projects: [
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        headless: false,
        launchOptions: {
          args: [
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding",
          ],
        },
      },
    },
  ],
  webServer: {
    command: "VITE_UI_RUNTIME=svelte npm run dev -- --host 127.0.0.1 --port 5175 --strictPort",
    url: "http://127.0.0.1:5175",
    reuseExistingServer: false,
  },
});
