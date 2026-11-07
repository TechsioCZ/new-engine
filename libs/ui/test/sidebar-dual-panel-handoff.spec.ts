import { expect, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"
import { assertWithinViewport } from "./visual-viewport.mjs"

for (const [id, dir] of [
  ["left-and-right-sidebar-15", "ltr"],
  ["logical-edges-rtl", "rtl"],
] as const) {
  test(`Sidebar ${dir} keeps both mobile launchers reachable after focus restoration`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 659 })
    await openContractStory(page, `organisms-sidebar--${id}`, {
      brand: "business",
    })
    await expect(page.getByRole("dialog")).toHaveCount(0)
    const root = page.locator(
      '#storybook-root [data-scope="sidebar"][data-part="root"]'
    )
    await expect(root).toHaveAttribute("dir", dir)
    await expect(root.locator('[data-part="breakpoint"]')).toHaveCSS(
      "display",
      "none"
    )
    const trigger = (side: "start" | "end") =>
      root.locator(`button[data-sidebar-trigger][data-side="${side}"]`)
    const hint = page.getByRole("tooltip")

    // Exercise ordinary pointer input with the restored launcher's hint still
    // open. Do not dismiss it or move focus to make the next button clickable.
    for (const [side, name, restoredHint] of [
      ["start", "Primary navigation", "Toggle primary navigation"],
      ["end", "Context navigation", "Toggle context navigation"],
      ["start", "Primary navigation", "Toggle primary navigation"],
    ] as const) {
      const launcher = trigger(side)
      await expect(launcher).toBeEnabled()
      await expect(launcher).toHaveAttribute("aria-haspopup", "dialog")
      await launcher.click()
      const dialog = page.getByRole("dialog", { name, exact: true })
      await expect(page.getByRole("dialog")).toHaveCount(1)
      await expect(dialog).toBeVisible()
      await expect(dialog).toHaveAttribute("data-state", "open")
      await expect(dialog).toHaveCSS("direction", dir)
      await assertWithinViewport(dialog)
      await expect(launcher).toHaveAttribute("aria-expanded", "true")
      const panel = dialog.locator('[data-scope="sidebar"][data-part="panel"]')
      await expect(panel).toHaveAttribute("data-side", side)
      await expect(dialog).toHaveAttribute(
        "data-swipe-direction",
        (side === "start") === (dir === "ltr") ? "left" : "right"
      )
      for (const label of [
        "Commerce workspace",
        "Overview",
        "Orders",
        "Catalog",
        "Account settings",
      ]) {
        const link = dialog.getByRole("link", { name: label, exact: true })
        await expect(link).toBeVisible()
        await assertWithinViewport(link)
      }
      await expect
        .poll(() =>
          dialog.evaluate((element) =>
            element.contains(element.ownerDocument.activeElement)
          )
        )
        .toBe(true)
      await page.keyboard.press("Escape")
      await expect(dialog).toBeHidden()
      await expect(page.getByRole("dialog")).toHaveCount(0)
      await expect(launcher).toHaveAttribute("aria-expanded", "false")
      await expect(launcher).toBeFocused()
      await expect(hint).toBeVisible()
      await expect(hint).toHaveText(restoredHint)
    }
  })
}
