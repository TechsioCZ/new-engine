import os from "node:os"
import { defineConfig, devices } from "@playwright/test"
import {
  createProjectNames,
  createVisualMatrix,
  MOBILE_VIEWPORT_SPECS,
} from "./test/visual-projects.mjs"

const baseUrl = new URL(process.env.TEST_BASE_URL ?? "http://127.0.0.1:6006")
const storybookUrl = `${baseUrl.protocol}//${baseUrl.host}`
const workersEnv = process.env.PLAYWRIGHT_WORKERS
const matrix = createVisualMatrix(process.env.VISUAL_BRANDS)
// Bound browser memory while leaving a core for the static server.
const cpuCount = typeof os.cpus === "function" ? os.cpus().length : 2
const recommendedWorkers = Math.min(4, Math.max(1, cpuCount - 1))
const workersValue = workersEnv ? Number(workersEnv) : recommendedWorkers
const workers = Number.isFinite(workersValue)
  ? Math.max(1, Math.floor(workersValue))
  : undefined

// Increased timeouts for Docker (qemu emulation is slow)
const testTimeout = 120_000
const expectTimeout = 30_000

const projects = [
  // Component behavior specs run on Desktop Chrome; screenshots run per brand
  // matrix. Mobile WebKit runs only the specs whose subject is touch input or
  // the device viewport (MOBILE_VIEWPORT_SPECS) — re-executing the rest on a
  // second device repeated identical assertions for 60.9 of 157.7 serial
  // minutes and never caught a defect the desktop run missed.
  {
    name: "desktop",
    testIgnore: "visual.spec.ts",
    use: { ...devices["Desktop Chrome"], browserName: "chromium" as const },
  },
  {
    name: "mobile",
    testMatch: MOBILE_VIEWPORT_SPECS,
    use: { ...devices["iPhone 15"], browserName: "webkit" as const },
  },
  ...matrix.map((project) => ({
    name: project.name,
    metadata: { brand: project.brand },
    testMatch: "visual.spec.ts",
    snapshotPathTemplate: process.env.VISUAL_SNAPSHOT_DIR
      ? `${process.env.VISUAL_SNAPSHOT_DIR}/{arg}-${project.name}-{platform}{ext}`
      : `{testDir}/{testFilePath}-snapshots/{arg}-${project.name}-{platform}{ext}`,
    use: {
      ...devices[project.isMobile ? "iPhone 15" : "Desktop Chrome"],
      browserName: project.isMobile
        ? ("webkit" as const)
        : ("chromium" as const),
      colorScheme: project.colorScheme,
    },
  })),
]

// CI runs one shard set per project group and asserts that the three groups
// cover this list. Keeping the list itself in visual-projects.mjs is what makes
// that assertion real: a project added or renamed here alone fails every run,
// instead of quietly dropping out of the group CI shards.
const declaredNames = createProjectNames(process.env.VISUAL_BRANDS).join(",")
const configuredNames = projects.map((project) => project.name).join(",")
if (configuredNames !== declaredNames) {
  throw new Error(
    `playwright.config.mts declares projects [${configuredNames}] but test/visual-projects.mjs declares [${declaredNames}]`
  )
}

export default defineConfig({
  testDir: "./test",
  testMatch: ["*.spec.ts", "visual-*.spec.mjs"],
  globalSetup: "./test/docker-only.global-setup.js",
  reporter: "html",
  updateSnapshots: "none",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  timeout: testTimeout,
  expect: { timeout: expectTimeout },
  workers,
  use: {
    baseURL: storybookUrl,
    locale: "en-US",
    timezoneId: "UTC",
    reducedMotion: "reduce",
    serviceWorkers: "block",
  },
  projects,
  webServer: {
    command: "node test/visual-static-server.mjs",
    url: storybookUrl,
    env: { VISUAL_STORYBOOK_PORT: baseUrl.port || "6006" },
    // An explicit TEST_BASE_URL may point at an already running Storybook.
    reuseExistingServer: process.env.TEST_BASE_URL !== undefined,
    timeout: 120_000,
  },
})
