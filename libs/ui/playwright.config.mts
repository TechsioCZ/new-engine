import os from "node:os"
import path from "node:path"

import { defineConfig, devices } from "@playwright/test"

const DEFAULT_STORYBOOK_PORT = "6006"
const MAX_WORKERS = 64
const { PLAYWRIGHT_WORKERS, TEST_BASE_URL } = process.env
const baseUrl = new URL(TEST_BASE_URL ?? "http://127.0.0.1:6006")
if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
  throw new Error("TEST_BASE_URL must use the http: or https: protocol.")
}
const storybookUrl = `${baseUrl.protocol}//${baseUrl.host}`
// All owning package/Nx commands execute this config with libs/ui as cwd.
const staticDir = path.resolve("storybook-static")
const workersEnv = PLAYWRIGHT_WORKERS
// Recommend using (CPU cores - 1) when PLAYWRIGHT_WORKERS is not specified.
// This provides concurrency while leaving one core free for system/background tasks.
const cpuCount = os.availableParallelism()
const recommendedWorkers = Math.min(MAX_WORKERS, Math.max(1, cpuCount - 1))
const parseWorkers = (value: string | undefined): number | undefined => {
  if (value === undefined || value === "") {
    return recommendedWorkers
  }
  if (!/^\d+$/u.test(value)) {
    return undefined
  }
  return Math.min(MAX_WORKERS, Math.max(1, Math.floor(Number(value))))
}
const workers = parseWorkers(workersEnv)
const workerConfig = workers === undefined ? {} : { workers }

// Increased timeouts for Docker (qemu emulation is slow)
const testTimeout = 120_000
const expectTimeout = 30_000

export default defineConfig({
  expect: {
    timeout: expectTimeout,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
  fullyParallel: true,
  globalSetup: "./test/docker-only.global-setup.js",
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 15"],
      },
    },
  ],
  reporter: "html",
  testDir: "./test",
  timeout: testTimeout,
  use: {
    baseURL: storybookUrl,
  },
  webServer: {
    command: `npx --no-install http-server -p ${
      baseUrl.port === "" ? DEFAULT_STORYBOOK_PORT : baseUrl.port
    }`,
    cwd: staticDir,
    reuseExistingServer: true,
    timeout: 120_000,
    url: storybookUrl,
  },
  ...workerConfig,
})
