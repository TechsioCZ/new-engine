import { expect, test } from "@playwright/test"

test.describe("Menu focus restore", () => {
  test("keeps focus on the trigger when Escape follows a navigation key within one frame", async ({
    page,
  }) => {
    // Sizes has no play function, so nothing else drives these menus.
    await page.goto("/iframe.html?id=molecules-menu--sizes&viewMode=story", {
      waitUntil: "domcontentloaded",
    })
    const trigger = page
      .getByRole("button", { name: "Project actions" })
      .first()
    await trigger.focus()
    await page.keyboard.press("ArrowDown")
    const menu = page.getByRole("menu")
    await expect(menu).toBeFocused()

    // Both keys go out in one task, so Escape closes the menu before the
    // focus frame that Zag schedules for End has run.
    const focusedAfterFrames = await menu.evaluate(async (content) => {
      for (const key of ["End", "Escape"]) {
        content.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
        )
      }
      // Let the deferred focus frame run, then read where focus ended up.
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
      return document.activeElement?.id ?? null
    })

    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(focusedAfterFrames).toBe(await trigger.getAttribute("id"))
    await expect(trigger).toBeFocused()
  })
})
