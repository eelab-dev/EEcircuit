import { defineConfig, devices } from "@playwright/test";

const devOrigin = "http://127.0.0.1:5175";
const previewOrigin = "http://127.0.0.1:4176";
process.env.EECIRCUIT_TEST_ORIGIN = devOrigin;
process.env.EECIRCUIT_PREVIEW_ORIGIN = previewOrigin;

export default defineConfig({
  testDir: "./tests",
  testMatch: ["playwright/**/*.spec.ts", "preview/**/*.spec.ts"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: devOrigin,
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
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"], browserName: "webkit", headless: false },
    },
    {
      name: "ipad-webkit",
      use: { ...devices["iPad Pro 11"], browserName: "webkit", headless: false },
    },
  ],
  webServer: [
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5175 --strictPort",
      url: devOrigin,
      reuseExistingServer: false,
    },
    {
      command: "npm run preview -- --host 127.0.0.1 --port 4176 --strictPort",
      url: previewOrigin,
      reuseExistingServer: false,
    },
  ],
});
