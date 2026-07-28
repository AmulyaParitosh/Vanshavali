import { defineConfig, devices } from "@playwright/test";
import { AUTH_FILE } from "./tests/e2e/fixtures";

/**
 * E2E / acceptance tests for the spec-driven redesign (see IMPLEMENTATION.md).
 * One spec file per page spec under tests/e2e/, plus tests/e2e/integration.spec.ts for the
 * twelve cross-spec contracts (INTEGRATION.md). Runs against the local dev server + local
 * Supabase stack; reuses an already-running dev server when there is one.
 *
 * Vitest (tests/**\/*.test.ts) owns permission / merge / logic unit tests and is NOT picked up
 * here — Playwright's testDir is tests/e2e only.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? "line" : [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Authenticate once; writes AUTH_FILE. Everything else depends on it.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        // Signed in as the seeded tree keeper by default. Public specs
        // (landing, sign-in) opt out with test.use({ storageState: undefined }).
        storageState: AUTH_FILE,
      },
    },
  ],
  webServer: {
    command: "NEXT_PUBLIC_ENV=local npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
