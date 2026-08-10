import { defineConfig, devices } from "@playwright/test"

const { CI } = process.env
const isCi = CI !== undefined

/** Playwright configuration for Payload browser tests. */
export default defineConfig({
  forbidOnly: isCi,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
  ],
  reporter: "html",
  retries: isCi ? 2 : 0,
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev",
    reuseExistingServer: true,
    timeout: 120_000,
    url: "http://localhost:3000",
  },
  ...(isCi ? { workers: 1 } : {}),
})
