import os from "node:os"
import { defineConfig, devices } from "@playwright/test"
import { createVisualMatrix } from "./test/visual-projects.mjs"

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

export default defineConfig({
  testDir: "./test",
  testMatch: "*.spec.ts",
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
  projects: [
    // Component behavior specs run once per device; screenshots run per brand matrix.
    ...(["desktop", "mobile"] as const).map((name) => ({
      name,
      testIgnore: "visual.spec.ts",
      use: {
        ...devices[name === "mobile" ? "iPhone 15" : "Desktop Chrome"],
        browserName:
          name === "mobile" ? ("webkit" as const) : ("chromium" as const),
      },
    })),
    ...matrix.map((project) => {
      const device = project.isMobile ? "mobile" : "desktop"
      const snapshotName =
        project.brand === "base"
          ? `${device}${project.colorScheme === "dark" ? "-dark" : ""}`
          : project.name
      return {
        name: project.name,
        metadata: { brand: project.brand },
        testMatch: "visual.spec.ts",
        snapshotPathTemplate: `{testDir}/{testFilePath}-snapshots/{arg}-${snapshotName}-{platform}{ext}`,
        use: {
          ...devices[project.isMobile ? "iPhone 15" : "Desktop Chrome"],
          browserName: project.isMobile ? "webkit" : "chromium",
          colorScheme: project.colorScheme,
        },
      }
    }),
  ],
  webServer: {
    command: "node test/visual-static-server.mjs",
    url: storybookUrl,
    env: { VISUAL_STORYBOOK_PORT: baseUrl.port || "6006" },
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
