import fs from "node:fs/promises"
import path from "node:path"

import { getStoryContext } from "@storybook/test-runner"
import type { TestRunnerConfig } from "@storybook/test-runner"
import { isRecord } from "@techsio/std/object"

const readBoolEnv = (name: string, defaultValue: boolean): boolean => {
  const raw = process.env[name]
  if (raw === undefined || raw.length === 0) {
    return defaultValue
  }
  const normalized = raw.trim().toLowerCase()
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false
  }
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true
  }
  return defaultValue
}

const readNumberEnv = (name: string, defaultValue: number): number => {
  const raw = process.env[name]
  if (raw === undefined || raw.length === 0) {
    return defaultValue
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : defaultValue
}

interface JestConfig {
  modulePathIgnorePatterns?: string[]
  testTimeout?: number
  [key: string]: unknown
}

type TestRunnerConfigWithJest = TestRunnerConfig & {
  getJestConfig: (config: JestConfig) => JestConfig
}

type StorybookMode = "light" | "dark"

interface A11yResults {
  storyId?: string
  results?: {
    violations?: unknown[]
  }
}

declare global {
  interface Window {
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
}

const readMode = (): StorybookMode => {
  const { A11Y_THEME: a11yTheme } = process.env
  return a11yTheme === "dark" ? "dark" : "light"
}

const waitForResultsMs = readNumberEnv("A11Y_REPORT_WAIT_MS", 30_000)
const testTimeoutMs = readNumberEnv(
  "A11Y_TEST_TIMEOUT",
  Math.max(60_000, waitForResultsMs + 15_000),
)
const mode = readMode()
const { A11Y_REPORT_OUTPUT_DIR: a11yReportOutputDir } = process.env
const outputDir = path.resolve(
  process.cwd(),
  a11yReportOutputDir ?? "a11y-report",
)
const failOnViolations = readBoolEnv("A11Y_REPORT_FAIL_ON_VIOLATIONS", true)

const readA11yParameters = (
  storyContext: unknown,
): Record<string, unknown> | undefined => {
  if (!isRecord(storyContext)) {
    return undefined
  }
  const { parameters } = storyContext
  if (!isRecord(parameters)) {
    return undefined
  }
  const { a11y } = parameters
  return isRecord(a11y) ? a11y : undefined
}

const testRunnerConfig: TestRunnerConfigWithJest = {
  getJestConfig(config) {
    return {
      ...config,
      modulePathIgnorePatterns: [
        ...(config.modulePathIgnorePatterns ?? []),
        "<rootDir>/.schaltwerk",
        "<rootDir>/.nx",
        "[/\\]\\.next[/\\]",
        "[/\\]\\.medusa[/\\]",
      ],
      testTimeout: testTimeoutMs,
    }
  },
  async postVisit(page, context) {
    let storyContext: unknown = null
    try {
      storyContext = await getStoryContext(page, context)
    } catch {
      storyContext = null
    }
    const a11yParams = readA11yParameters(storyContext)
    const { disable: a11yDisabled, test: a11yTest } = a11yParams ?? {}
    const shouldWaitForResults = a11yDisabled !== true && a11yTest !== "off"

    if (shouldWaitForResults) {
      await page.waitForFunction(
        (storyId) => window.__TECHSIO_A11Y_RESULTS__?.storyId === storyId,
        context.id,
        { timeout: waitForResultsMs },
      )
    }

    const pageResults = shouldWaitForResults
      ? await page.evaluate(() => window.__TECHSIO_A11Y_RESULTS__ ?? null)
      : null
    const entry = {
      name: context.name,
      parameters: a11yParams ?? null,
      results: pageResults?.results ?? null,
      storyId: context.id,
      title: context.title,
      url: page.url(),
    }

    const entriesDir = path.join(outputDir, "entries")
    const entryPath = path.join(entriesDir, `${context.id}.json`)
    const temporaryPath = `${entryPath}.${process.pid}.tmp`
    await fs.mkdir(entriesDir, { recursive: true })
    await fs.writeFile(temporaryPath, `${JSON.stringify(entry)}\n`, "utf-8")
    await fs.rename(temporaryPath, entryPath)

    const violationCount = Array.isArray(entry.results?.violations)
      ? entry.results.violations.length
      : 0
    if (failOnViolations && violationCount > 0) {
      throw new Error(
        `A11y violations detected in ${context.title} / ${context.name}`,
      )
    }
  },
  async preVisit(page, context) {
    await page.evaluate(
      async ({ expectedMode, storyId }) => {
        const channel = window.__STORYBOOK_ADDONS_CHANNEL__
        const preview = window.__STORYBOOK_PREVIEW__
        if (!channel || !preview) {
          throw new Error("Storybook globals are unavailable.")
        }

        const story = await preview.storyStore.loadStory({ storyId })
        const { a11y } = story.parameters
        if (a11y !== null && typeof a11y === "object") {
          Object.assign(story.parameters, { a11y: { ...a11y, test: "todo" } })
        }

        const { promise, reject, resolve } = Promise.withResolvers<null>()
        const timer = { id: 0 }
        const onGlobalsUpdated = (payload: unknown) => {
          if (
            !(
              payload !== null &&
              typeof payload === "object" &&
              "globals" in payload
            )
          ) {
            return
          }
          const { globals } = payload
          if (
            !(
              globals !== null &&
              typeof globals === "object" &&
              "brand" in globals &&
              "mode" in globals
            )
          ) {
            return
          }
          const { brand, mode: updatedMode } = globals
          if (brand === "base" && updatedMode === expectedMode) {
            window.clearTimeout(timer.id)
            channel.off("globalsUpdated", onGlobalsUpdated)
            resolve(null)
          }
        }
        timer.id = window.setTimeout(() => {
          channel.off("globalsUpdated", onGlobalsUpdated)
          reject(new Error("Timed out applying Storybook globals."))
        }, 5000)
        channel.on("globalsUpdated", onGlobalsUpdated)
        channel.emit("updateGlobals", {
          globals: { brand: "base", mode: expectedMode },
        })
        await promise

        const url = new URL(window.location.href)
        url.searchParams.set("globals", `brand:base;mode:${expectedMode}`)
        window.history.replaceState(null, "", url)
      },
      { expectedMode: mode, storyId: context.id },
    )
  },
}

export default testRunnerConfig
