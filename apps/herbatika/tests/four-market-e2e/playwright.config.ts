import { defineConfig } from "@playwright/test"
import { MARKET_CODES, resolveMarketOrigin } from "./market-fixtures"

export default defineConfig({
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  outputDir: ".qa/four-market-e2e",
  projects: MARKET_CODES.map((market) => ({
    name: market,
    use: { baseURL: resolveMarketOrigin(market) },
  })),
  reporter: process.env.CI ? "github" : "line",
  retries: 0,
  testDir: ".",
  testIgnore: ["market-fixtures.ts", "journey-helpers.ts"],
  timeout: 90_000,
  use: {
    actionTimeout: 15_000,
    headless: true,
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  workers: 1,
})
