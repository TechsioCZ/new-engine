import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "../libs/ui/test",
  testMatch: "cascade-select.behavior.spec.ts",
  outputDir: "./cascade-status-test-results",
  reporter: "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:6017",
    browserName: "chromium",
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      executablePath: "C:/Users/pisez/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe",
    },
  },
  projects: [{ name: "desktop" }],
})
