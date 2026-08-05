import os from "node:os"
import path from "node:path"

import { defineConfig, devices } from "@playwright/test"

const baseUrl = new URL(process.env.TEST_BASE_URL ?? "http://127.0.0.1:6006")
const storybookUrl = `${baseUrl.protocol}//${baseUrl.host}`
const staticDir = path.join(__dirname, "storybook-static")
const workersEnv = process.env.PLAYWRIGHT_WORKERS
// Recommend using (CPU cores - 1) when PLAYWRIGHT_WORKERS is not specified.
// This provides concurrency while leaving one core free for system/background tasks.
const cpuCount = typeof os.cpus === "function" ? os.cpus().length : 2
const recommendedWorkers = Math.max(1, cpuCount - 1)
const workersValue = workersEnv ? Number(workersEnv) : recommendedWorkers
const workers = Number.isFinite(workersValue)
  ? Math.max(1, Math.floor(workersValue))
  : undefined

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
    command: `npx --no-install http-server -p ${baseUrl.port || 6006}`,
    cwd: staticDir,
    reuseExistingServer: true,
    timeout: 120_000,
    url: storybookUrl,
  },
  workers,
})
