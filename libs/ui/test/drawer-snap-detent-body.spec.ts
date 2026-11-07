import { expect, type Locator, type Page, test } from "@playwright/test"
import { assertWithinViewport } from "./visual-viewport.mjs"

const storyId = "molecules-drawer--snap-points-and-swipe"
// Fail fast on an obstructed control instead of waiting for the test timeout.
const clickTimeout = 5000

async function openStory(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(
    `/iframe.html?id=${storyId}&viewMode=story&globals=brand:business;mode:light`,
    { waitUntil: "domcontentloaded" }
  )
  await page.locator("#storybook-root").waitFor()
}

/** Real scrolling (including retried alignments past the sticky footer) must
 * bring the control fully into view with the control itself under a pointer. */
async function expectReachable(control: Locator) {
  await control.click({ trial: true, timeout: clickTimeout })
  await expect(control).toBeVisible()
  await assertWithinViewport(control)
  await expect
    .poll(() =>
      control.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        const hit = element.ownerDocument.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        )
        return !!hit && element.contains(hit)
      })
    )
    .toBe(true)
}

test.describe("Drawer snap detent body", () => {
  test("a detent shorter than header + footer scrolls the visible viewport, not a collapsed body", async ({
    page,
  }) => {
    await openStory(page)
    await page
      .getByRole("button", { name: "Open snap drawer", exact: true })
      .click({ timeout: clickTimeout })
    const dialog = page.getByRole("dialog", {
      name: "Product filters",
      exact: true,
    })
    await expect(dialog).toBeVisible()
    await dialog
      .getByRole("button", { name: "25%", exact: true })
      .click({ timeout: clickTimeout })
    await expect(
      dialog.getByText("Active height: 0.25", { exact: true })
    ).toBeVisible()

    const visible = dialog.locator(".drawer-visible-viewport")
    await expect(visible).toBeVisible()
    await assertWithinViewport(visible)
    const status = dialog.getByText("Active height: 0.25", { exact: true })
    // Body keeps its content box: its own scrollport does not clip the controls.
    await expect
      .poll(() =>
        status.evaluate((element) => {
          const body = element.closest(".overflow-y-auto")
          if (!(body instanceof HTMLElement)) {
            return -1
          }
          const style = getComputedStyle(body)
          return (
            body.clientHeight -
            Number.parseFloat(style.paddingTop) -
            Number.parseFloat(style.paddingBottom)
          )
        })
      )
      .toBeGreaterThan(0)
    // The authored outer scrollport carries the overflow instead.
    await expect
      .poll(() =>
        visible.evaluate(
          (element) => element.scrollHeight > element.clientHeight
        )
      )
      .toBe(true)

    for (const name of ["25%", "50%", "100%", "Close"]) {
      await expectReachable(dialog.getByRole("button", { name, exact: true }))
    }
    await visible.evaluate((element) => element.scrollTo({ top: 0 }))
    const heading = dialog.getByRole("heading", {
      name: "Product filters",
      exact: true,
    })
    await expect(heading).toBeVisible()
    await assertWithinViewport(heading)
  })
})
