import { expect, type Locator, type Page, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"
import { assertWithinViewport } from "./visual-viewport.mjs"

const story = "molecules-datepicker--transactional-time-granularities"

async function settle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )
}

async function assertPopupReady(page: Page, content: Locator, day: Locator) {
  await expect(content).toHaveCSS("opacity", "1")
  const targets = [
    content,
    content.locator('[data-part="calendar"]'),
    day,
    content.locator('[data-part="time-control"]'),
    content.locator('[data-part="footer"]'),
    content.getByRole("button", { name: "Cancel", exact: true }),
    content.getByRole("button", { name: "Confirm", exact: true }),
  ]
  await expect
    .poll(async () => {
      const before = await Promise.all(
        targets.map((item) => item.boundingBox())
      )
      await settle(page)
      const after = await Promise.all(targets.map((item) => item.boundingBox()))
      return (
        before.every(Boolean) &&
        JSON.stringify(before) === JSON.stringify(after)
      )
    })
    .toBe(true)
  for (const target of targets) {
    await expect(target).toBeVisible()
    // Unlike visibility or viewport intersection alone, the shared geometry
    // assertion requires full containment by every overflow ancestor as well.
    await assertWithinViewport(target)
  }
  for (const field of await content
    .locator('[data-part="time-control"] input')
    .all()) {
    await assertWithinViewport(field)
  }
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 393, height: 659 },
  { width: 320, height: 568 },
]) {
  for (const [precision, index] of [
    ["minute", 1],
    ["second", 2],
  ] as const) {
    for (const interaction of ["pointer", "keyboard"] as const) {
      test(`${precision} ${interaction} opening reveals selection at ${viewport.width}x${viewport.height}`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport)
        await openContractStory(page, story, { brand: "business" })
        await page.evaluate(() => document.fonts.ready.then(() => undefined))
        const trigger = page
          .locator(
            '#storybook-root [data-scope="date-picker"][data-part="trigger"]'
          )
          .nth(index)
        const open = async () => {
          if (interaction === "pointer") {
            await trigger.click()
          } else {
            await trigger.focus()
            await page.keyboard.press("Enter")
          }
          await expect(trigger).toHaveAttribute("aria-expanded", "true")
        }
        const pageScroll = () => page.evaluate(() => [scrollX, scrollY])
        const beforeScroll = await pageScroll()
        await open()
        const content = page
          .locator('[data-scope="date-picker"][data-part="content"]')
          .visible()
        const calendar = content.locator('[data-part="calendar"]')
        const selected = calendar.locator(
          '[data-part="table-cell-trigger"][data-selected]:not([data-outside-range])'
        )
        await expect(selected).toHaveAttribute("data-value", "2026-08-31")
        // No selected-day focus, scrollIntoView or scrollTop setup: initial
        // containment must be produced by DatePicker, not by the test harness.
        await assertPopupReady(page, content, selected)
        expect(await pageScroll()).toEqual(beforeScroll)
        const overflows = await calendar.evaluate(
          (node) => node.scrollHeight > node.clientHeight
        )
        // This fixture is constrained on both engines; narrower calendars may
        // legitimately fit after responsive placement and need no scrolling.
        if (viewport.width === 1280 && index === 2) {
          expect(
            overflows,
            "the constrained regression needs a real scrollport"
          ).toBe(true)
        }

        if (interaction === "keyboard") {
          await expect(selected).toBeFocused()
          for (const [key, value] of [
            ["ArrowUp", "2026-08-24"],
            ["ArrowUp", "2026-08-17"],
            ["ArrowUp", "2026-08-10"],
            ["ArrowUp", "2026-08-03"],
            ["ArrowDown", "2026-08-10"],
            ["ArrowDown", "2026-08-17"],
            ["ArrowDown", "2026-08-24"],
            ["ArrowDown", "2026-08-31"],
          ] as const) {
            await page.keyboard.press(key)
            const focused = calendar.locator(
              `[data-part="table-cell-trigger"][data-value="${value}"]:not([data-outside-range])`
            )
            await expect(focused).toBeFocused()
            await assertWithinViewport(focused)
          }
          expect(await pageScroll()).toEqual(beforeScroll)
        }

        if (overflows) {
          // Initial reveal was already checked without harness scrolling.
          // Exercise scroll persistence through the native scroll API on both
          // engines; mobile WebKit does not implement Playwright mouse.wheel.
          // This checks later scroll ownership, not a physical touch gesture.
          await calendar.evaluate((node) =>
            node.scrollTo({ top: 0, behavior: "instant" })
          )
          await expect
            .poll(() => calendar.evaluate((node) => node.scrollTop))
            .toBe(0)
          await settle(page)
          await settle(page)
          expect(await calendar.evaluate((node) => node.scrollTop)).toBe(0)
          expect(await pageScroll()).toEqual(beforeScroll)
        }

        await page.keyboard.press("Escape")
        await expect(content).toHaveCount(0)
        await open()
        await assertPopupReady(page, content, selected)
        expect(await pageScroll()).toEqual(beforeScroll)
      })
    }
  }
}
