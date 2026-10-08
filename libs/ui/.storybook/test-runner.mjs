// @ts-check
// Jest cannot install Storybook's Node loader for TypeScript configuration.
// Keep this runtime hook directly executable and check its types with JSDoc.
/** @import { TestRunnerConfig } from "@storybook/test-runner" */
/** @import { Channel } from "storybook/internal/channels" */
import { createA11yReporter } from "@techsio/storybook-a11y-reporter"
import { checkChartPointerSelection } from "./chart-pointer-regression.mjs"

/**
 * @typedef {Window & {
 *   __STORYBOOK_ADDONS_CHANNEL__?: Channel,
 *   __STORYBOOK_PREVIEW__?: { ready: () => Promise<void> },
 * }} StorybookWindow
 */

// The reporter reads its documented A11Y_REPORT_* environment variables itself
// (A11Y_REPORT_FAIL_ON_VIOLATIONS, A11Y_REPORT_JUNIT, A11Y_REPORT_WAIT_MS,
// A11Y_REPORT_OUTPUT_DIR). Only "false" disables a boolean option.
const reporter = createA11yReporter({ waitForResultsMs: 30_000 })

const mode = process.env.A11Y_STORYBOOK_MODE
if (mode !== undefined && mode !== "light" && mode !== "dark") {
  throw new Error("A11Y_STORYBOOK_MODE must be light or dark")
}

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
    await page.evaluate(async (colorMode) => {
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
          globals: { brand: "base", mode: colorMode },
        })
      })
      await globalsUpdated
    }, mode)
  },
  async postVisit(page, context) {
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
