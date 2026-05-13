import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { defineConfig, devices } from "@playwright/test"

const useBuiltAdmin = process.env.MEDUSA_ADMIN_E2E_USE_BUILT_ADMIN === "1"
const builtAdminBaseURL = "http://127.0.0.1:9180"

const baseURL =
  process.env.MEDUSA_ADMIN_E2E_BASE_URL ??
  process.env.TEST_BASE_URL ??
  (useBuiltAdmin ? builtAdminBaseURL : "http://127.0.0.1:9000")

const webServerCommand =
  process.env.MEDUSA_ADMIN_E2E_WEB_SERVER_COMMAND ??
  (useBuiltAdmin
    ? "node ./scripts/serve-built-admin.mjs --host 127.0.0.1 --port 9180"
    : undefined)
const homeDirectory = process.env.HOME

const findFirstExistingPath = (paths: string[]) =>
  paths.find((path) => existsSync(path))

const findBundledChromeForTesting = (root: string, prefix: string) => {
  if (!existsSync(root)) {
    return
  }

  const browserDirectories = readdirSync(root)
    .filter((entry) => entry.startsWith(prefix))
    .sort()
    .reverse()

  for (const browserDirectory of browserDirectories) {
    const executablePath = findFirstExistingPath([
      join(
        root,
        browserDirectory,
        "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
      ),
      join(root, browserDirectory, "Chromium.app/Contents/MacOS/Chromium"),
      join(
        root,
        browserDirectory,
        "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
      ),
      join(root, browserDirectory, "chrome-linux/chrome"),
      join(root, browserDirectory, "chrome-win/chrome.exe"),
    ])

    if (executablePath) {
      return executablePath
    }
  }

  return
}

const chromiumExecutablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
  (homeDirectory
    ? findBundledChromeForTesting(
        join(homeDirectory, ".agent-browser/browsers"),
        "chrome-"
      )
    : undefined) ??
  (homeDirectory
    ? findBundledChromeForTesting(
        join(homeDirectory, "Library/Caches/ms-playwright"),
        "chromium-"
      )
    : undefined) ??
  (homeDirectory
    ? findBundledChromeForTesting(
        join(homeDirectory, ".cache/ms-playwright"),
        "chromium-"
      )
    : undefined) ??
  undefined

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: chromiumExecutablePath
          ? { executablePath: chromiumExecutablePath }
          : undefined,
      },
    },
  ],
  webServer: webServerCommand
    ? {
        command: webServerCommand,
        reuseExistingServer: true,
        timeout: 120_000,
        url: baseURL,
      }
    : undefined,
})
