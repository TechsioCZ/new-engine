import { expect, test } from "@playwright/test"

test.describe("Menu focus restore", () => {
  test("keeps focus on the trigger when Escape follows a navigation key within one frame", async ({
    page,
  }) => {
    // With motion allowed, the closing panel stays rendered through its exit
    // transition, which is when WebKit accepts the late focus call.
    await page.emulateMedia({ reducedMotion: "no-preference" })
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
  test("opens without any transition under reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/iframe.html?id=molecules-menu--sizes&viewMode=story", {
      waitUntil: "domcontentloaded",
    })
    const trigger = page
      .getByRole("button", { name: "Project actions" })
      .first()
    // Read the panel in the same task it unhides: a starting-style
    // transition, if any, has just been created and cannot have finished.
    const panel = await trigger.evaluate(
      (button) =>
        new Promise<{ opacity: string; transitions: string[] }>((resolve) => {
          const content = document.getElementById(
            button.getAttribute("aria-controls") ?? ""
          )
          if (!content) {
            throw new Error("Menu content is missing")
          }
          const observer = new MutationObserver(() => {
            if (content.hidden) {
              return
            }
            observer.disconnect()
            resolve({
              transitions: content
                .getAnimations()
                .map((animation) =>
                  animation instanceof CSSTransition
                    ? animation.transitionProperty
                    : String(animation.id)
                ),
              opacity: getComputedStyle(content).opacity,
            })
          })
          observer.observe(content, { attributes: true })
          button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
        })
    )
    expect(panel).toEqual({ opacity: "1", transitions: [] })
  })
})
