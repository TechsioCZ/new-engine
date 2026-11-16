import { setupPage } from "@storybook/test-runner"
import PlaywrightEnvironment from "@storybook/test-runner/dist/jest-playwright-entries/test-environment.js"

/** @import { BrowserContext, Page } from "@playwright/test" */
/**
 * @typedef {{
 *   global: { page?: Page, context?: BrowserContext },
 *   setup: () => Promise<void>,
 *   handleTestEvent: (event: { name: string }, state?: unknown) => Promise<void>,
 * }} BrowserEnvironment
 */
const BaseEnvironment =
  /** @type {new (...args: unknown[]) => BrowserEnvironment} */ (
    PlaywrightEnvironment
  )

// Upstream's playwright/custom-environment.js calls setupPage() only in setup().
// When Jest filters by test name (e.g. the `t` key in --watch), the runner sets
// skipInitialization, so setup() has no page and the base environment creates
// one at run_start instead. Prepare whichever page actually exists.
export default class StorybookEnvironment extends BaseEnvironment {
  async setup() {
    await super.setup()
    await this.#setupNewPage(undefined)
  }

  /**
   * @param {{ name: string }} event
   * @param {unknown} [state]
   */
  async handleTestEvent(event, state) {
    const previousPage = this.global.page
    await super.handleTestEvent(event, state)
    if (event.name === "run_start") {
      await this.#setupNewPage(previousPage)
    }
  }

  /** @param {Page | undefined} previousPage */
  async #setupNewPage(previousPage) {
    const { page, context } = this.global
    if (page && context && page !== previousPage) {
      await setupPage(page, context)
    }
  }
}
