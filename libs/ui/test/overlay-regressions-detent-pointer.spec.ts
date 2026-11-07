import { expect, type Locator, type Page, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"
import { assertWithinViewport } from "./visual-viewport.mjs"

const storyId = "molecules-overlay-regressions--detent-notifications"
// Fail fast on an obstructed control instead of waiting for the test timeout.
const clickTimeout = 5000

async function openStory(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" })
  // The story's own play opens and closes this drawer. Do not race its
  // interactions; require its closed postcondition before testing pointers.
  await openContractStory(page, storyId, { brand: "business" })
  await expect(
    page.getByRole("dialog", { name: "Catalog updates" })
  ).toBeHidden()
}

/** The control itself, not an overlapping layer, receives a pointer at its center. */
async function expectHitTarget(control: Locator) {
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

test.describe("Overlay regressions: detent notifications", () => {
  test("notification leaves drawer footer detents and its own actions pointer-reachable", async ({
    page,
  }) => {
    await openStory(page)
    await page
      .getByRole("button", { name: "Open notification drawer" })
      .click({ timeout: clickTimeout })
    const dialog = page.getByRole("dialog", { name: "Catalog updates" })
    await expect(dialog).toBeVisible()
    await dialog
      .getByRole("button", { name: "Notify", exact: true })
      .click({ timeout: clickTimeout })
    const undo = dialog.getByRole("button", { name: "Undo", exact: true })
    await expect(undo).toBeVisible()

    for (const [label, fraction] of [
      ["25%", 0.25],
      ["50%", 0.5],
      ["100%", 1],
    ] as const) {
      const detent = dialog.getByRole("button", { name: label, exact: true })
      await expectHitTarget(detent)
      await detent.click({ timeout: clickTimeout })
      await expect
        .poll(() =>
          dialog.evaluate((element, point) => {
            const box = element.getBoundingClientRect()
            return Math.abs(box.top - (window.innerHeight - box.height * point))
          }, fraction)
        )
        .toBeLessThanOrEqual(1)
      for (const name of ["25%", "50%", "100%", "Close drawer"]) {
        await expectHitTarget(dialog.getByRole("button", { name, exact: true }))
      }
      await expectHitTarget(undo)
      await expectHitTarget(
        dialog.getByRole("button", { name: "Close notification", exact: true })
      )
    }

    await undo.click({ timeout: clickTimeout })
    await expect(dialog.getByText("Catalog update undone.")).toBeVisible()
    await expect(undo).toHaveCount(0)

    await dialog
      .getByRole("button", { name: "Notify", exact: true })
      .click({ timeout: clickTimeout })
    const closeNotification = dialog.getByRole("button", {
      name: "Close notification",
      exact: true,
    })
    await expectHitTarget(closeNotification)
    await closeNotification.click({ timeout: clickTimeout })
    await expect(closeNotification).toHaveCount(0)

    const closeDrawer = dialog.getByRole("button", {
      name: "Close drawer",
      exact: true,
    })
    await expectHitTarget(closeDrawer)
    await closeDrawer.click({ timeout: clickTimeout })
    await expect(dialog).toBeHidden()
  })
})
