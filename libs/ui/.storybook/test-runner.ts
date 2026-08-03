import fs from "node:fs/promises"
import path from "node:path"

import { getStoryContext, type TestRunnerConfig } from "@storybook/test-runner"

function readBoolEnv(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name]
  if (!raw) return defaultValue
  const normalized = raw.trim().toLowerCase()
  if (["0", "false", "no", "off"].includes(normalized)) return false
  if (["1", "true", "yes", "on"].includes(normalized)) return true
  return defaultValue
}

function readNumberEnv(name: string, defaultValue: number): number {
  const raw = process.env[name]
  if (!raw) return defaultValue
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : defaultValue
}

type JestConfig = {
  modulePathIgnorePatterns?: string[]
  testTimeout?: number
  [key: string]: unknown
}

type TestRunnerConfigWithJest = TestRunnerConfig & {
  getJestConfig: (config: JestConfig) => JestConfig
}

type StorybookMode = "light" | "dark"

type A11yResults = {
  storyId?: string
  results?: {
    violations?: unknown[]
  }
}

type StorybookRuntime = typeof window & {
  __STORYBOOK_ADDONS_CHANNEL__?: {
    emit: (event: string, payload: unknown) => void
    off: (event: string, listener: (payload: unknown) => void) => void
    on: (event: string, listener: (payload: unknown) => void) => void
  }
  __STORYBOOK_PREVIEW__?: {
    storyStore: {
      loadStory: (input: { storyId: string }) => Promise<{
        parameters: Record<string, unknown>
      }>
    }
  }
  __TECHSIO_A11Y_RESULTS__?: A11yResults
}

function readMode(): StorybookMode {
  return process.env["A11Y_THEME"] === "dark" ? "dark" : "light"
}

const waitForResultsMs = readNumberEnv("A11Y_REPORT_WAIT_MS", 30000)
const testTimeoutMs = readNumberEnv(
  "A11Y_TEST_TIMEOUT",
  Math.max(60000, waitForResultsMs + 15000)
)
const mode = readMode()
const outputDir = path.resolve(
  process.cwd(),
  process.env["A11Y_REPORT_OUTPUT_DIR"] ?? "a11y-report"
)
const failOnViolations = readBoolEnv("A11Y_REPORT_FAIL_ON_VIOLATIONS", true)

const testRunnerConfig: TestRunnerConfigWithJest = {
  async preVisit(page, context) {
    await page.evaluate(
      async ({ expectedMode, storyId }) => {
        const runtime = window as StorybookRuntime
        const channel = runtime.__STORYBOOK_ADDONS_CHANNEL__
        const preview = runtime.__STORYBOOK_PREVIEW__
        if (!channel || !preview) {
          throw new Error("Storybook globals are unavailable.")
        }

        const story = await preview.storyStore.loadStory({ storyId })
        const a11y = story.parameters["a11y"]
        if (a11y && typeof a11y === "object") {
          story.parameters["a11y"] = { ...a11y, test: "todo" }
        }

        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => {
            channel.off("globalsUpdated", onGlobalsUpdated)
            reject(new Error("Timed out applying Storybook globals."))
          }, 5000)
          const onGlobalsUpdated = (payload: unknown) => {
            const globals =
              payload && typeof payload === "object" && "globals" in payload
                ? (payload.globals as Record<string, unknown>)
                : null
            if (
              globals?.["brand"] === "base" &&
              globals["mode"] === expectedMode
            ) {
              window.clearTimeout(timeout)
              channel.off("globalsUpdated", onGlobalsUpdated)
              resolve()
            }
          }
          channel.on("globalsUpdated", onGlobalsUpdated)
          channel.emit("updateGlobals", {
            globals: { brand: "base", mode: expectedMode },
          })
        })

        const url = new URL(window.location.href)
        url.searchParams.set("globals", `brand:base;mode:${expectedMode}`)
        window.history.replaceState(null, "", url)
      },
      { expectedMode: mode, storyId: context.id }
    )
  },
  async postVisit(page, context) {
    const storyContext = await getStoryContext(page, context).catch(() => null)
    const a11yParams = storyContext?.parameters?.["a11y"] as
      | { disable?: boolean; test?: string }
      | undefined
    const shouldWaitForResults =
      a11yParams?.disable !== true && a11yParams?.test !== "off"

    if (shouldWaitForResults) {
      await page.waitForFunction(
        (storyId) =>
          (window as StorybookRuntime).__TECHSIO_A11Y_RESULTS__?.storyId ===
          storyId,
        context.id,
        { timeout: waitForResultsMs }
      )
    }

    const pageResults = shouldWaitForResults
      ? await page.evaluate(
          () => (window as StorybookRuntime).__TECHSIO_A11Y_RESULTS__ ?? null
        )
      : null
    const entry = {
      storyId: context.id,
      title: context.title,
      name: context.name,
      url: page.url(),
      parameters: storyContext?.parameters?.["a11y"] ?? null,
      results: pageResults?.results ?? null,
    }

    const entriesDir = path.join(outputDir, "entries")
    const entryPath = path.join(entriesDir, `${context.id}.json`)
    const temporaryPath = `${entryPath}.${process.pid}.tmp`
    await fs.mkdir(entriesDir, { recursive: true })
    await fs.writeFile(temporaryPath, `${JSON.stringify(entry)}\n`, "utf8")
    await fs.rename(temporaryPath, entryPath)

    const violationCount = Array.isArray(entry.results?.violations)
      ? entry.results.violations.length
      : 0
    if (failOnViolations && violationCount > 0) {
      throw new Error(
        `A11y violations detected in ${context.title} / ${context.name}`
      )
    }
  },
  getJestConfig(config) {
    return {
      ...config,
      testTimeout: testTimeoutMs,
      modulePathIgnorePatterns: [
        ...(config.modulePathIgnorePatterns ?? []),
        "<rootDir>/.schaltwerk",
        "<rootDir>/.nx",
        "[/\\]\\.next[/\\]",
        "[/\\]\\.medusa[/\\]",
      ],
    }
  },
}

export default testRunnerConfig
