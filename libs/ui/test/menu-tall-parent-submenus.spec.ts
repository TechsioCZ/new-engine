import { expect, type Locator, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"
import { assertWithinViewport } from "./visual-viewport.mjs"

async function expectContained(panel: Locator) {
  await expect(panel).toBeVisible()
  await assertWithinViewport(panel)
}

async function expectLastCommandReachable(panel: Locator, last: Locator) {
  await expect(last).toHaveAttribute("data-highlighted", "")
  await expect
    .poll(() =>
      last.evaluate((element) => {
        const content = element.closest('[role="menu"]')
        if (!content) {
          return false
        }
        const row = element.getBoundingClientRect()
        const bounds = content.getBoundingClientRect()
        const hit = element.ownerDocument.elementFromPoint(
          row.left + row.width / 2,
          row.top + row.height / 2
        )
        return (
          row.width > 0 &&
          row.height > 0 &&
          row.top >= bounds.top &&
          row.bottom <= bounds.bottom &&
          (hit === element || element.contains(hit))
        )
      })
    )
    .toBe(true)
  await expectContained(panel)
  await assertWithinViewport(last)
}

for (const dir of ["ltr", "rtl"] as const) {
  test.describe(`viewport-tall Menu submenus (${dir})`, () => {
    test.use({ viewport: { width: 320, height: 568 }, reducedMotion: "reduce" })

    test.beforeEach(async ({ page }) => {
      await openContractStory(
        page,
        "molecules-menu--tall-scrollable-submenus",
        {
          brand: "business",
          args: `dir:${dir}`,
        }
      )
    })

    test("short child remains usable, returns by keyboard, and activates its last command", async ({
      page,
    }) => {
      const trigger = page.getByRole("button", {
        name: "Tall project commands",
      })
      await trigger.focus()
      await page.keyboard.press("ArrowDown")
      const parent = page.getByRole("menu", {
        name: "Tall project commands",
        exact: true,
      })
      await expect(parent).toBeFocused()
      await expect
        .poll(() =>
          parent.evaluate((element) => {
            const bounds = element.getBoundingClientRect()
            const viewport = element.ownerDocument.documentElement
            return (
              element.scrollHeight > element.clientHeight &&
              bounds.top <= 9 &&
              bounds.bottom >= viewport.clientHeight - 9
            )
          })
        )
        .toBe(true)
      const sharing = parent.getByRole("menuitem", {
        name: "Sharing commands",
        exact: true,
      })
      await page.keyboard.press("s")
      await expect(sharing).toHaveAttribute("data-highlighted", "")
      await page.keyboard.press(dir === "rtl" ? "ArrowLeft" : "ArrowRight")
      const last = page.getByRole("menuitem", {
        name: "Last sharing command",
        exact: true,
      })
      const child = page.getByRole("menu").filter({ has: last })
      await expect(child).toBeFocused()
      await expectContained(child)
      await page.keyboard.press("End")
      await expectLastCommandReachable(child, last)
      await page.keyboard.press(dir === "rtl" ? "ArrowRight" : "ArrowLeft")
      await expect(child).not.toBeVisible()
      await expect(parent).toBeFocused()
      await expect(sharing).toHaveAttribute("data-highlighted", "")
      await page.keyboard.press(dir === "rtl" ? "ArrowLeft" : "ArrowRight")
      await expect(child).toBeFocused()
      await page.keyboard.press("End")
      await expectLastCommandReachable(child, last)
      await page.keyboard.press("Enter")
      await expect(page.getByRole("status")).toHaveText("Selected last-sharing")
      await expect(trigger).toHaveAttribute("aria-expanded", "false")
    })

    test("scrolling child reveals its last command with End and accepts a real pointer click", async ({
      page,
    }) => {
      const trigger = page.getByRole("button", {
        name: "Tall project commands",
      })
      await trigger.focus()
      await page.keyboard.press("ArrowDown")
      const parent = page.getByRole("menu", {
        name: "Tall project commands",
        exact: true,
      })
      await expect(parent).toBeFocused()
      const all = parent.getByRole("menuitem", {
        name: "All project commands",
        exact: true,
      })
      await page.keyboard.press("a")
      await expect(all).toHaveAttribute("data-highlighted", "")
      await page.keyboard.press(dir === "rtl" ? "ArrowLeft" : "ArrowRight")
      const last = page.getByRole("menuitem", {
        name: "Nested project 24",
        exact: true,
      })
      const child = page.getByRole("menu").filter({ has: last })
      await expect(child).toBeFocused()
      await expect
        .poll(() =>
          child.evaluate(
            (element) => element.scrollHeight > element.clientHeight
          )
        )
        .toBe(true)
      await page.keyboard.press("End")
      await expectLastCommandReachable(child, last)
      await last.click()
      await expect(page.getByRole("status")).toHaveText("Selected nested-24")
      await expect(trigger).toHaveAttribute("aria-expanded", "false")
    })

    test("pointer transit from the parent reaches a short child without forced activation", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Tall project commands" }).click()
      const parent = page.getByRole("menu", {
        name: "Tall project commands",
        exact: true,
      })
      await expect(parent).toBeFocused()
      // Typeahead scrolls the submenu row into view; hover then uses the real
      // parent-to-child pointer route rather than opening with a synthetic click.
      await page.keyboard.press("s")
      const sharing = parent.getByRole("menuitem", {
        name: "Sharing commands",
        exact: true,
      })
      await expect(sharing).toHaveAttribute("data-highlighted", "")
      await sharing.hover()
      const first = page.getByRole("menuitem", {
        name: "Send summary",
        exact: true,
      })
      const child = page.getByRole("menu").filter({ has: first })
      await expectContained(child)
      const target = await first.boundingBox()
      if (!target) {
        throw new Error("Sharing command has no pointer target")
      }
      await page.mouse.move(
        target.x + target.width / 2,
        target.y + target.height / 2,
        { steps: 8 }
      )
      await expect(sharing).toHaveAttribute("aria-expanded", "true")
      await first.click()
      await expect(page.getByRole("status")).toHaveText("Selected summary")
    })
  })
}
