// @ts-check
// Jest cannot install Storybook's Node loader for TypeScript configuration.
// Keep this runtime hook directly executable and check its types with JSDoc.
/** @import { TestRunnerConfig } from "@storybook/test-runner" */
/** @import { Channel } from "storybook/internal/channels" */
import { appendFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import { getStoryContext } from "@storybook/test-runner"
import { createA11yReporter } from "@techsio/storybook-a11y-reporter"
import {
  assertCalibration,
  assertSupportedTheme,
  calibrationIds,
} from "./a11y-policy.mjs"
import { checkChartPointerSelection } from "./chart-pointer-regression.mjs"

/**
 * @typedef {Window & {
 *   __TECHSIO_A11Y_RESULTS__?: {storyId: string, results: {violations: {id: string, nodes: {html: string}[]}[]}},
 *   __STORYBOOK_ADDONS_CHANNEL__?: Channel,
 *   __STORYBOOK_PREVIEW__?: { ready: () => Promise<void> },
 * }} StorybookWindow
 */

// The reporter reads its documented A11Y_REPORT_* environment variables itself
// (A11Y_REPORT_FAIL_ON_VIOLATIONS, A11Y_REPORT_JUNIT, A11Y_REPORT_WAIT_MS,
// A11Y_REPORT_OUTPUT_DIR). Only "false" disables a boolean option.
const reporter = createA11yReporter({ waitForResultsMs: 30_000 })

const mode = process.env.A11Y_STORYBOOK_MODE ?? "light"
const brand = process.env.A11Y_STORYBOOK_BRAND ?? "base"
assertSupportedTheme(brand, mode)

/** @type {TestRunnerConfig} */
const testRunnerConfig = {
  async prepare({
    page,
    browserContext,
    testRunnerConfig: activeRunnerConfig,
  }) {
    const iframeUrl = new URL(
      "iframe.html",
      process.env.TARGET_URL ?? "http://127.0.0.1:6006"
    )
    if (activeRunnerConfig.getHttpHeaders) {
      await browserContext.setExtraHTTPHeaders(
        await activeRunnerConfig.getHttpHeaders(iframeUrl.toString())
      )
    }
    await page.goto(iframeUrl.toString(), { waitUntil: "domcontentloaded" })
    await page.waitForFunction(
      () =>
        "__STORYBOOK_ADDONS_CHANNEL__" in window &&
        "__STORYBOOK_PREVIEW__" in window
    )
    await page.evaluate(
      async ({ colorMode, colorBrand }) => {
        const storybookWindow = /** @type {StorybookWindow} */ (window)
        const preview = storybookWindow.__STORYBOOK_PREVIEW__
        const channel = storybookWindow.__STORYBOOK_ADDONS_CHANNEL__
        if (!(preview && channel)) {
          throw new Error("Storybook did not initialize its preview channel")
        }
        await preview.ready()
        if (!colorMode) {
          return
        }
        /** @type {Promise<void>} */
        const globalsUpdated = new Promise((resolve) => {
          channel.once("globalsUpdated", () => resolve())
          channel.emit("updateGlobals", {
            globals: { brand: colorBrand, mode: colorMode },
          })
        })
        await globalsUpdated
      },
      { colorMode: mode, colorBrand: brand }
    )
  },
  async postVisit(page, context) {
    const story =
      /** @type {Awaited<ReturnType<typeof getStoryContext>> & {globals?: {brand?: string, mode?: string, a11y?: {manual?: boolean}}}} */ (
        await getStoryContext(page, context)
      )
    const effectiveBrand =
      story.parameters.brandLock ?? story.globals?.brand ?? brand
    const effectiveMode =
      effectiveBrand === "akros" || effectiveBrand === "business"
        ? "light"
        : (story.globals?.mode ?? mode)
    // Pinned examples belong only to their actual matrix cell.
    if (effectiveBrand !== brand || effectiveMode !== mode) {
      return
    }
    await page.waitForFunction(
      ({ brand: expectedBrand, mode: expectedMode }) => {
        const root = document.documentElement
        return (
          root.getAttribute("data-theme") ===
            (expectedBrand === "base" ? null : expectedBrand) &&
          root.classList.contains(expectedMode)
        )
      },
      { brand, mode }
    )
    if (
      story.parameters.a11y?.disable ||
      story.parameters.a11y?.test === "off" ||
      story.globals?.a11y?.manual
    ) {
      throw new Error(`Missing enforced accessibility scan: ${context.id}`)
    }
    await page.waitForFunction(
      (id) =>
        /** @type {StorybookWindow} */ (window).__TECHSIO_A11Y_RESULTS__
          ?.storyId === id,
      context.id,
      { timeout: 30_000 }
    )
    const result = await page.evaluate(
      () => /** @type {StorybookWindow} */ (window).__TECHSIO_A11Y_RESULTS__
    )
    if (!Array.isArray(result?.results?.violations)) {
      throw new Error(`Missing accessibility results: ${context.id}`)
    }
    if (calibrationIds.includes(context.id)) {
      assertCalibration(
        context.id,
        await page.locator("#apca-test-root p").allTextContents(),
        result.results
      )
      const output = process.env.A11Y_REPORT_OUTPUT_DIR ?? "a11y-report"
      mkdirSync(output, { recursive: true })
      appendFileSync(
        path.join(output, "calibration.ndjson"),
        `${JSON.stringify({ storyId: context.id, brand, mode, status: "passed" })}\n`
      )
      return
    }
    const checks = [() => reporter.postVisit?.(page, context)]
    if (context.id === "molecules-chart--pointer-selection") {
      checks.push(() => checkChartPointerSelection(page))
    }
    // Run every check in order and report all failures together.
    /** @type {unknown[]} */
    const errors = []
    for (const check of checks) {
      try {
        await check()
      } catch (error) {
        errors.push(error)
      }
    }
    if (errors.length > 1) {
      throw new AggregateError(
        errors,
        "Chart accessibility and native pointer checks failed"
      )
    }
    if (errors.length === 1) {
      throw errors[0]
    }
  },
}

export default testRunnerConfig
