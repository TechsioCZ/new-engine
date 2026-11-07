import { expect, test } from "@playwright/test"

// Zag focuses calendar days with preventScroll. When placement limits the
// popup height, the calendar scrolls, and the focused day must stay inside it.
test("a height-limited calendar keeps its focused day visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(
    "/iframe.html?id=molecules-datepicker--transactional-time-granularities&viewMode=story&globals=brand:business"
  )
  const trigger = page
    .locator('#storybook-root [data-scope="date-picker"][data-part="trigger"]')
    .nth(2)
  await trigger.click()
  await expect(trigger).toHaveAttribute("aria-expanded", "true")
  const content = page
    .locator('[data-scope="date-picker"][data-part="content"]')
    .visible()
  const calendar = content.locator('[data-part="calendar"]')
  await expect(calendar).toBeInViewport({ ratio: 1 })
  // Without a real scrollport this test would not exercise the regression.
  expect(
    await calendar.evaluate((node) => node.scrollHeight > node.clientHeight)
  ).toBe(true)

  const selected = calendar.locator(
    '[data-part="table-cell-trigger"][data-selected]'
  )
  await expect(selected).toHaveAttribute("data-value", "2026-08-31")
  await expect(selected).toBeFocused()
  await expect(selected).toBeInViewport({ ratio: 1 })

  // Keyboard navigation moves focus programmatically, also without scrolling.
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
      `[data-part="table-cell-trigger"][data-value="${value}"]`
    )
    await expect(focused).toBeFocused()
    await expect(focused).toBeInViewport({ ratio: 1 })
  }
})
