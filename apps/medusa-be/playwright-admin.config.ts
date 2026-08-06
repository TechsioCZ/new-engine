import { existsSync, readdirSync } from "node:fs"
import path from "node:path"

import { defineConfig, devices } from "@playwright/test"

const MAX_BROWSER_DIRECTORIES = 100

const useBuiltAdmin = process.env["MEDUSA_ADMIN_E2E_USE_BUILT_ADMIN"] === "1"
const builtAdminBaseURL = "http://127.0.0.1:9180"
const builtAdminRoot =
  process.env["MEDUSA_ADMIN_E2E_BUILT_ADMIN_ROOT"] ??
  ".medusa/server/public/admin"

const baseURL =
  process.env["MEDUSA_ADMIN_E2E_BASE_URL"] ??
  process.env["TEST_BASE_URL"] ??
  (useBuiltAdmin ? builtAdminBaseURL : "http://127.0.0.1:9000")

const webServerCommand =
  process.env["MEDUSA_ADMIN_E2E_WEB_SERVER_COMMAND"] ??
  (useBuiltAdmin
    ? `node ./scripts/serve-built-admin.mjs --host 127.0.0.1 --port 9180 --root ${builtAdminRoot}`
    : undefined)
const homeDirectory = process.env["HOME"]

const findFirstExistingPath = (paths: string[]) =>
  paths.find((candidatePath) => existsSync(candidatePath))

const findBundledChromeForTesting = (root: string, prefix: string) => {
  if (!existsSync(root)) {
    return null
  }

  const browserDirectories = readdirSync(root)
    .filter((entry) => entry.startsWith(prefix))
    .toSorted()
    .toReversed()
    .slice(0, MAX_BROWSER_DIRECTORIES)

  for (const browserDirectory of browserDirectories) {
    const executablePath = findFirstExistingPath([
      path.join(
        root,
        browserDirectory,
        "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
      ),
      path.join(root, browserDirectory, "Chromium.app/Contents/MacOS/Chromium"),
      path.join(
        root,
        browserDirectory,
        "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
      ),
      path.join(root, browserDirectory, "chrome-linux/chrome"),
      path.join(root, browserDirectory, "chrome-win/chrome.exe"),
    ])

    if (executablePath !== undefined) {
      return executablePath
    }
  }

  return null
}

const browserSearchRoots =
  homeDirectory === undefined || homeDirectory.length === 0
    ? []
    : ([
        [path.join(homeDirectory, ".agent-browser/browsers"), "chrome-"],
        [path.join(homeDirectory, "Library/Caches/ms-playwright"), "chromium-"],
        [path.join(homeDirectory, ".cache/ms-playwright"), "chromium-"],
      ] as const)
const chromiumExecutablePath =
  process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"] ??
  browserSearchRoots
    .map(([root, prefix]) => findBundledChromeForTesting(root, prefix))
    .find((executablePath): executablePath is string => executablePath !== null)
const ciValue = process.env["CI"]
const isCI = ciValue !== undefined && ciValue.length > 0

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  forbidOnly: isCI,
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(chromiumExecutablePath === undefined
          ? {}
          : { launchOptions: { executablePath: chromiumExecutablePath } }),
      },
    },
  ],
  reporter: isCI ? [["github"], ["list"]] : "list",
  retries: isCI ? 2 : 0,
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  workers: 1,
  ...(webServerCommand === undefined
    ? {}
    : {
        webServer: {
          command: webServerCommand,
          reuseExistingServer: true,
          timeout: 120_000,
          url: baseURL,
        },
      }),
})
