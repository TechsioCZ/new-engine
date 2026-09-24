import { defineConfig } from "@playwright/test"

/** Focused behavior checks against an already running Storybook. */
export default defineConfig({
  testDir: ".",
  testMatch: "vertical-navigation.behavior.spec.ts",
  outputDir: "../.scratch/vertical-navigation-test-results",
  fullyParallel: true,
  timeout: 30_000,
  workers: 2,
  reporter: "list",
  use: {
    baseURL: process.env.STORYBOOK_URL ?? "http://127.0.0.1:6006",
    channel: process.env.PLAYWRIGHT_CHANNEL,
    viewport: { width: 1280, height: 900 },
    screenshot: "only-on-failure",
    trace: "off",
  },
})
