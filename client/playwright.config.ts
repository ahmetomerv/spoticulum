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
      command:
        "npm --prefix ../server run build:server && node ../server/dist/app.js",
      env: {
        NODE_ENV: "production",
        PORT: "3101",
        CLIENT_ID: "playwright-client",
        CLIENT_SECRET: "playwright-client-secret",
        SESSION_SECRET: "playwright-session-secret-with-at-least-32-characters",
        REDIRECTURI: "https://spoticulum.ahmeto.com/api/logged",
        CLIENT_REDIRECTURI: "https://spoticulum.ahmeto.com",
      },
      url: "http://127.0.0.1:3101/health",
    },
    {
      command:
        "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 3100 --strictPort",
      env: { VITE_API_PROXY: "http://127.0.0.1:3101" },
      url: "http://127.0.0.1:3100",
    },
  ],
});
