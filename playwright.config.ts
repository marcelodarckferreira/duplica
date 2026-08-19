import { defineConfig, devices } from "@playwright/test";

// Suíte E2E roda contra um banco Postgres isolado (duplica_test, recriado do
// zero a cada execução por backend/scripts/e2e_bootstrap.sh) e portas
// dedicadas (backend 8011, frontend 5174) — nunca o backend/banco reais de
// dev (8010/5435), pra não arriscar os dados de uso real do sistema.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      command: "./backend/scripts/e2e_bootstrap.sh",
      url: "http://127.0.0.1:8011/api/v1/health",
      timeout: 120_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "./node_modules/.bin/vite --host 127.0.0.1 --port 5174",
      url: "http://127.0.0.1:5174",
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        VITE_API_URL: "http://127.0.0.1:8011",
      },
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
