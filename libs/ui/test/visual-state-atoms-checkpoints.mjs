import { expect } from "@playwright/test"

/** @import { Page } from "@playwright/test" */

export const stateCheckpointStories = [
  "atoms-hotkeys--playground",
  "atoms-hotkeys--form-fields-technical",
]

/** Exercise only confirmed missing appearances; the caller owns assets and framing.
 * @param {Page} page
 * @param {string} id
 * @param {(suffix: string, beforeCapture?: () => Promise<void>) => Promise<void>} capture
 * @returns {Promise<boolean>}
 */
export async function checkStateCheckpoints(page, id, capture) {
  if (!stateCheckpointStories.includes(id)) {
    return false
  }
  const canvas = page.locator("#storybook-root")
  if (id === "atoms-hotkeys--playground") {
    const trigger = canvas.getByRole("button", {
      name: "Open example",
      exact: true,
    })
    const dialog = page.getByRole("dialog", {
      name: "Hotkey activated",
      exact: true,
    })
    await expect(trigger).toHaveCount(1)
    await expect(trigger).toBeEnabled()
    await expect(dialog).not.toBeVisible()
    await trigger.click()
    const beforeCapture = async () => {
      await expect(dialog).toHaveCount(1)
      await expect(dialog).toBeVisible()
      await expect(dialog).toHaveAttribute("data-state", "open")
      await expect(dialog).toBeInViewport({ ratio: 1 })
      await expect
        .poll(() =>
          dialog.evaluate(
            (element) => !!element.closest('[inert], [aria-hidden="true"]')
          )
        )
        .toBe(false)
      await expect(dialog).toHaveAccessibleDescription(
        "Both the button and keyboard shortcut open this dialog. Press Escape to close it and try again."
      )
      const title = dialog.getByRole("heading", {
        name: "Hotkey activated",
        exact: true,
      })
      const description = dialog.locator(
        '[data-scope="dialog"][data-part="description"]'
      )
      const shortcut = dialog.getByText("Keyboard shortcut:", { exact: false })
      const keycap = dialog.locator('[data-scope="hotkeys"][data-part="key"]')
      await expect(keycap).toHaveCount(1)
      await expect(keycap).toContainText("A")
      for (const content of [title, description, shortcut, keycap]) {
        await expect(content).toBeVisible()
        await expect(content).toBeInViewport({ ratio: 1 })
      }
    }
    try {
      // Run now as well as through the callback after the parent's asset waits.
      await beforeCapture()
      await capture("--state-dialog-open", beforeCapture)
    } finally {
      await page.keyboard.press("Escape")
      await expect(dialog).not.toBeVisible()
    }
    return true
  }

  const details = canvas.locator("details").filter({
    has: page.getByText("Try rich-text editing too", { exact: true }),
  })
  const summary = details.locator("summary")
  await expect(details).toHaveCount(1)
  await expect(summary).toHaveText("Try rich-text editing too")
  await expect(details).toHaveJSProperty("open", false)
  await summary.click()
  const beforeCapture = async () => {
    await expect(details).toBeVisible()
    await expect(details).toHaveJSProperty("open", true)
    await expect(details).toBeInViewport({ ratio: 1 })
    await expect
      .poll(() =>
        details.evaluate(
          (element) => !!element.closest('[inert], [aria-hidden="true"]')
        )
      )
      .toBe(false)
    const explanation = details.getByText(
      "Rich-text shortcuts are separately disabled in this example.",
      { exact: true }
    )
    const richEditor = details.getByRole("textbox", {
      name: "Rich editor",
      exact: true,
    })
    const plainEditor = details.getByRole("textbox", {
      name: "Plain editor",
      exact: true,
    })
    await expect(richEditor).toHaveText("Editable text")
    await expect(plainEditor).toHaveText("Plain editable text")
    for (const content of [summary, explanation, richEditor, plainEditor]) {
      await expect(content).toBeVisible()
      await expect(content).toBeInViewport({ ratio: 1 })
    }
  }
  try {
    await beforeCapture()
    await capture("--state-rich-text-open", beforeCapture)
  } finally {
    await summary.click()
    await expect(details).toHaveJSProperty("open", false)
  }
  return true
}
