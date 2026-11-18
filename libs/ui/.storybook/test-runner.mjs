// @ts-check
// Jest cannot install Storybook's Node loader for TypeScript configuration.
// Keep this runtime hook directly executable and check its types with JSDoc.
/** @import { TestRunnerConfig } from "@storybook/test-runner" */
/** @import { Channel } from "storybook/internal/channels" */
import { appendFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import { getStoryContext } from "@storybook/test-runner"
import { installPlayerMediaFixture } from "../test/player-media-fixture.mjs"
import {
  assertCalibration,
  assertA11yBrand,
  assertSupportedTheme,
  blockingViolations,
  calibrationIds,
} from "./a11y-policy.mjs"
import { checkChartPointerSelection } from "./chart-pointer-regression.mjs"
import { recordA11yResult } from "./a11y-report.mjs"

/**
 * @typedef {Window & {
 *   __TECHSIO_A11Y_RESULTS__?: {storyId: string, results: {violations: {id: string, nodes: {html: string}[]}[]}},
 *   __STORYBOOK_ADDONS_CHANNEL__?: Channel,
 *   __STORYBOOK_PREVIEW__?: { ready: () => Promise<void> },
 * }} StorybookWindow
 */

// Scan each story once; append its result once. The summary is generated after
// the workers exit. Re-reading and rewriting the accumulated JSON/Markdown/JUnit
// after every story was quadratic work and raced between Jest workers.
const enforceViolations = process.env.A11Y_REPORT_FAIL_ON_VIOLATIONS !== "false"

const mode = process.env.A11Y_STORYBOOK_MODE ?? "light"
const brand = process.env.A11Y_STORYBOOK_BRAND ?? "business"
assertSupportedTheme(brand, mode)

/** @type {TestRunnerConfig} */
const testRunnerConfig = {
  async prepare({
    page,
    browserContext,
    testRunnerConfig: activeRunnerConfig,
  }) {
    // Player stories reference sample media on a third-party CDN. Their play
    // functions wait for it to become playable, so serve the same local media
    // as the visual and behaviour suites instead of depending on the network.
    await installPlayerMediaFixture(page)
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
      /** @type {Awaited<ReturnType<typeof getStoryContext>> & {tags?: string[], globals?: {brand?: string, mode?: string, a11y?: {manual?: boolean}}}} */ (
        await getStoryContext(page, context)
      )
    assertA11yBrand(story.tags ?? [], story.parameters.brandLock)
    const effectiveBrand =
      story.parameters.brandLock ?? story.globals?.brand ?? brand
    const effectiveMode =
      effectiveBrand === "akros" || effectiveBrand === "business"
        ? "light"
        : (story.globals?.mode ?? mode)
    // The planner excludes other brands' locked examples. A mismatch is a
    // broken plan, never a passing test with no accessibility scan.
    if (effectiveBrand !== brand || effectiveMode !== mode) {
      throw new Error(`Story ${context.id} rendered ${effectiveBrand}/${effectiveMode} in the ${brand}/${mode} scan`)
    }
    await page.waitForFunction(
      ({ brand: expectedBrand, mode: expectedMode }) => {
        const root = document.documentElement
        return (
          root.getAttribute("data-theme") === expectedBrand &&
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
    const checks = [
      () => {
        const output = process.env.A11Y_REPORT_OUTPUT_DIR ?? "a11y-report"
        recordA11yResult(output, {
          storyId: context.id,
          title: context.title,
          name: context.name,
          url: page.url(),
          parameters: story.parameters.a11y ?? null,
          results: result.results,
        })
      },
      () => {
        const blocking = blockingViolations(result.results.violations)
        if (enforceViolations && blocking.length) {
          throw new Error(
            `A11y violations detected in ${context.title} / ${context.name}: ${blocking.join(", ")}`
          )
        }
      },
    ]
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
