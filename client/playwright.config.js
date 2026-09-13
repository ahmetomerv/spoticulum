import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  use: {
    ...devices["Desktop Chrome"],
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "production", use: { baseURL: "http://127.0.0.1:3101" } },
    { name: "development", use: { baseURL: "http://127.0.0.1:3100" } },
  ],
  webServer: [
    {
      command: "node ../server/app.js",
      env: { NODE_ENV: "production", PORT: "3101" },
      url: "http://127.0.0.1:3101/health",
    },
    {
      command:
        "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 3100 --strictPort",
      url: "http://127.0.0.1:3100",
    },
  ],
});
