/** @import { Page } from "@playwright/test" */

/**
 * Zag starts listening for outside presses one frame and one task after the
 * popup mounts. On touch devices it also ignores them for two frames after the
 * previous popup closed. `page.mouse` does not wait, so let those frames pass.
 * Call it once the popup is visible, right before the outside press.
 * @param {Page} page
 */
export async function outsideDismissalReady(page) {
  await page.evaluate(
    () =>
      /** @type {Promise<void>} */ (
        new Promise((resolve) => {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => setTimeout(resolve, 0))
          )
        })
      )
  )
}
