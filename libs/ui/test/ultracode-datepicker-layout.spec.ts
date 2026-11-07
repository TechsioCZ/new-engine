import { expect, type Locator, type Page, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"
import { assertWithinViewport } from "./visual-viewport.mjs"

const rootSelector = '[data-scope="date-picker"][data-part="root"]'
const contentSelector = '[data-scope="date-picker"][data-part="content"]'
const controlSelector = '[data-scope="date-input"][data-part="control"]'

async function expectReachable(target: Locator) {
  await expect(target).toBeVisible()
  await assertWithinViewport(target)
  await expect
    .poll(() =>
      target.evaluate((element) => {
        const box = element.getBoundingClientRect()
        const hit = element.ownerDocument.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2
        )
        return !!hit && element.contains(hit)
      })
    )
    .toBe(true)
}

async function expectIndicatorsInsideBorder(root: Locator) {
  const control = root.locator(controlSelector)
  const actions = control.locator(
    '[data-part="clear-trigger"], [data-part="trigger"]'
  )
  await expect(actions).toHaveCount(2)
  await expect
    .poll(() =>
      control.evaluate((element) => {
        const style = getComputedStyle(element)
        return Math.min(
          ...[
            style.borderTopWidth,
            style.borderBottomWidth,
            style.borderLeftWidth,
            style.borderRightWidth,
          ].map(Number.parseFloat)
        )
      })
    )
    .toBeGreaterThan(0)
  for (const action of await actions.all()) {
    await expectReachable(action)
  }
  await expect
    .poll(() =>
      control.evaluate((element) => {
        const outer = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        const top = Number.parseFloat(style.borderTopWidth)
        const bottom = Number.parseFloat(style.borderBottomWidth)
        const left = Number.parseFloat(style.borderLeftWidth)
        const right = Number.parseFloat(style.borderRightWidth)
        const buttons = Array.from(
          element.querySelectorAll(
            '[data-part="clear-trigger"], [data-part="trigger"]'
          ),
          (button) => button.getBoundingClientRect()
        )
        const [firstButton, secondButton] = buttons
        if (!(firstButton && secondButton) || buttons.length !== 2) {
          throw new Error("Expected both calendar indicator bounds")
        }
        return Math.max(
          ...buttons.flatMap((box) => [
            outer.left + left - box.left,
            outer.top + top - box.top,
            box.right - (outer.right - right),
            box.bottom - (outer.bottom - bottom),
            // Measuring each edge alone would forgive a missing 1px border on
            // BOTH sides. The complete target plus both borders must fit too.
            box.height + top + bottom - outer.height,
          ]),
          Math.min(firstButton.right, secondButton.right) -
            Math.max(firstButton.left, secondButton.left)
        )
      })
    )
    .toBeLessThanOrEqual(1)
}

async function expectCompleteCaption(
  page: Page,
  panel: Locator,
  locale: string,
  month: number
) {
  // The component deliberately displays the short month form. "Complete"
  // means every glyph of that localized month AND year, not just its tooltip.
  const labels = await page.evaluate(
    ({ locale: captionLocale, month: captionMonth }) => {
      const date = new Date(Date.UTC(2026, captionMonth - 1, 1))
      const format = (monthFormat: "short" | "long") =>
        new Intl.DateTimeFormat(captionLocale, {
          calendar: "gregory",
          month: monthFormat,
          year: "numeric",
          timeZone: "UTC",
        }).format(date)
      return { short: format("short"), long: format("long") }
    },
    { locale, month }
  )
  const caption = panel.locator('[data-part="view-trigger"]')
  await expect(caption).toHaveText(labels.short)
  await expect(caption).toHaveAttribute("title", labels.long)
  await expect(caption).toHaveAccessibleName(new RegExp(labels.long))
  const header = caption.locator("..")
  await expect(header.getByRole("button")).toHaveCount(5)
  for (const button of await header.getByRole("button").all()) {
    await expectReachable(button)
  }
  await expect
    .poll(() =>
      caption.evaluate((element) => {
        const box = element.getBoundingClientRect()
        const range = element.ownerDocument.createRange()
        range.selectNodeContents(element)
        const lines = Array.from(range.getClientRects()).filter(
          (line) => line.width > 0 && line.height > 0
        )
        if (!(lines.length && element.parentElement)) {
          throw new Error("Expected a rendered calendar caption and header")
        }
        const arrows = Array.from(
          element.parentElement.querySelectorAll("button")
        )
          .filter((button) => button !== element)
          .map((button) => button.getBoundingClientRect())
        return Math.max(
          ...lines.flatMap((line) => [
            box.left - line.left,
            box.top - line.top,
            line.right - box.right,
            line.bottom - box.bottom,
            ...arrows.map((arrow) =>
              Math.min(
                Math.min(line.right, arrow.right) -
                  Math.max(line.left, arrow.left),
                Math.min(line.bottom, arrow.bottom) -
                  Math.max(line.top, arrow.top)
              )
            ),
          ])
        )
      })
    )
    .toBeLessThanOrEqual(1)
}

test.beforeEach(async ({ page }) => {
  // Both native projects exercise this width: fine-pointer Chromium and
  // coarse-pointer WebKit must keep their different calendar headers usable.
  await page.setViewportSize({ width: 320, height: 720 })
  await page.clock.setFixedTime(new Date("2026-09-01T12:00:00Z"))
})

for (const size of ["sm", "md", "lg"] as const) {
  for (const invalid of [false, true]) {
    test(`${size} ${invalid ? "invalid" : "normal"} DatePicker reserves both borders around usable indicators`, async ({
      page,
    }) => {
      await openContractStory(page, "molecules-datepicker--playground", {
        brand: "business",
        args: `size:${size};invalid:${invalid};locale:en-US`,
      })
      const root = page.locator(rootSelector)
      const control = root.locator(controlSelector)
      await expect(control).toHaveAttribute("data-size", size)
      if (invalid) {
        await expect(control).toHaveAttribute("data-validation", "error")
      }
      await expectIndicatorsInsideBorder(root)
      const trigger = root.locator('[data-part="trigger"]')
      await expect(trigger).toHaveAccessibleName("Open calendar")
      await trigger.click()
      await expect(trigger).toHaveAttribute("aria-expanded", "true")
      await expect(page.locator(contentSelector)).toBeVisible()
      await page.keyboard.press("Escape")
      await expect(page.locator(contentSelector)).toHaveCount(0)
      await expect(trigger).toBeFocused()
      await expectIndicatorsInsideBorder(root)
      await root.locator('[data-part="clear-trigger"]').click()
      await expect(
        root.locator(
          '[data-scope="date-input"][data-part="segment"][data-type="day"]'
        )
      ).toHaveAttribute("data-placeholder-shown")
      await expect(
        page.getByTestId("date-picker-playground-committed-value")
      ).toHaveText("Last committed value: empty")
      await expectReachable(trigger)
    })
  }
}

for (const locale of ["cs-CZ", "en-US", "de-DE"]) {
  test(`${locale} caption remains fully painted between all four arrows after month navigation`, async ({
    page,
  }) => {
    await openContractStory(page, "molecules-datepicker--playground", {
      brand: "business",
      args: `locale:${locale}`,
    })
    await page.getByRole("button", { name: "Open calendar" }).click()
    const panel = page.locator(
      `${contentSelector} [data-part="calendar"] > [data-index]`
    )
    await expect(panel).toHaveCount(1)
    await page.evaluate(() => document.fonts.ready.then(() => undefined))
    await expectCompleteCaption(page, panel, locale, 8)
    await panel
      .getByRole("button", { name: "Switch to next month", exact: true })
      .click()
    await expectCompleteCaption(page, panel, locale, 9)
  })
}

test("narrow range preserves both complete captions when the second panel navigates independently", async ({
  page,
}) => {
  await openContractStory(page, "molecules-datepicker--date-range-calendar", {
    brand: "business",
  })
  await page.getByRole("button", { name: "Open calendar" }).click()
  const panels = page.locator(
    `${contentSelector} [data-part="calendar"] > [data-index]`
  )
  await expect(panels).toHaveCount(2)
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await expectCompleteCaption(page, panels.nth(0), "en-US", 9)
  // Bringing a lower range header into view is an ordinary user scroll, not a
  // repair of layout or a programmatic change to the selected date.
  await panels
    .nth(1)
    .locator('[data-part="view-trigger"]')
    .scrollIntoViewIfNeeded()
  await expectCompleteCaption(page, panels.nth(1), "en-US", 10)
  await panels
    .nth(1)
    .getByRole("button", { name: "Switch to next month", exact: true })
    .click()
  await expectCompleteCaption(page, panels.nth(1), "en-US", 11)
  await panels
    .nth(0)
    .locator('[data-part="view-trigger"]')
    .scrollIntoViewIfNeeded()
  await expectCompleteCaption(page, panels.nth(0), "en-US", 9)
})

test("RTL Arabic indicators stay within their border and retain a complete navigable caption", async ({
  page,
}) => {
  // This existing story supplies an actual dir="rtl" root, not a test-only DOM
  // mutation. openContractStory waits for its own interaction checks to finish.
  await openContractStory(page, "molecules-datepicker--field-regressions", {
    brand: "business",
  })
  const root = page.locator(rootSelector).filter({ hasText: "Arabic delivery" })
  await expect(root).toHaveAttribute("dir", "rtl")
  await root.locator(controlSelector).scrollIntoViewIfNeeded()
  await expectIndicatorsInsideBorder(root)
  const trigger = root.locator('[data-part="trigger"]')
  await expect(trigger).toHaveAccessibleName("Open calendar")
  await trigger.click()
  const content = page.locator(contentSelector)
  await expect(content).toHaveAttribute("dir", "rtl")
  const panel = content.locator('[data-part="calendar"] > [data-index]')
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await expectCompleteCaption(page, panel, "ar-EG", 8)
  await panel
    .getByRole("button", { name: "Switch to next month", exact: true })
    .click()
  await expectCompleteCaption(page, panel, "ar-EG", 9)
  await page.keyboard.press("Escape")
  await expect(content).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await expectIndicatorsInsideBorder(root)
})
