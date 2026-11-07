import { expect, type Locator, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"

async function expectDigitsFit(field: Locator) {
  const geometry = await field.evaluate((element) => {
    if (!(element instanceof HTMLInputElement)) {
      throw new Error("Expected native time input")
    }
    const style = getComputedStyle(element)
    const canvas = element.ownerDocument.createElement("canvas")
    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("Missing native text measurement context")
    }
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    const textWidth = context.measureText(element.value).width
    const usableWidth =
      element.clientWidth -
      Number.parseFloat(style.paddingLeft) -
      Number.parseFloat(style.paddingRight)
    return {
      value: element.value,
      textWidth,
      usableWidth,
      font: context.font,
      padding: [style.paddingLeft, style.paddingRight],
    }
  })
  expect(geometry.usableWidth, JSON.stringify(geometry)).toBeGreaterThan(0)
  expect(
    geometry.textWidth - geometry.usableWidth,
    JSON.stringify(geometry)
  ).toBeLessThanOrEqual(1)
}

for (const [brand, mode] of [
  ["base", "light"],
  ["base", "dark"],
  ["neo", "light"],
  ["neo", "dark"],
  ["business", "light"],
  ["akros", "light"],
]) {
  test(`${brand} ${mode} transactional hour minute and second precision keeps edited digits readable`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 844 })
    await openContractStory(
      page,
      "molecules-datepicker--transactional-time-granularities",
      { brand, mode }
    )
    const triggers = page.locator(
      '[data-scope="date-picker"][data-part="trigger"]'
    )
    await expect(triggers).toHaveCount(3)
    const popup = page
      .locator('[data-scope="date-picker"][data-part="content"]')
      .filter({ visible: true })
    for (const [index, count] of [1, 2, 3].entries()) {
      const trigger = triggers.nth(index)
      const control = trigger.locator(
        'xpath=ancestor::*[@data-scope="date-picker"][@data-part="control"]'
      )
      const accepted = await control.textContent()
      await trigger.click()
      const fields = popup.locator('input[type="number"]')
      await expect(fields).toHaveCount(count)
      const values = await fields.evaluateAll((elements) =>
        elements.map((element) => (element as HTMLInputElement).value)
      )
      const hourMax = index === 0 ? 12 : 23
      for (const [fieldIndex, field] of (await fields.all()).entries()) {
        await expect(field).toBeVisible()
        await expectDigitsFit(field)
        const max = fieldIndex === 0 ? hourMax : 59
        await expect(field).toHaveAttribute("max", String(max))
        await field.press("End")
        await expect(field).toHaveValue(String(max))
        await expectDigitsFit(field)
        await field.press("ArrowDown")
        await expect(field).toHaveValue(String(max - 1))
        await expectDigitsFit(field)
      }
      await popup.getByRole("button", { name: "Cancel", exact: true }).click()
      await expect(popup).toHaveCount(0)
      await expect(control).toHaveText(accepted ?? "")
      await trigger.click()
      await expect(fields).toHaveCount(count)
      expect(
        await fields.evaluateAll((elements) =>
          elements.map((element) => (element as HTMLInputElement).value)
        )
      ).toEqual(values)
      await page.keyboard.press("Escape")
      await expect(popup).toHaveCount(0)
    }
  })

  for (const [story, count] of [
    ["initially-open-timed-draft", 2],
    ["initially-open-date-time-range", 4],
  ] as const) {
    test(`${brand} ${mode} ${story} preserves full time digits and native draft controls`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 393, height: 844 })
      await openContractStory(page, `molecules-datepicker--${story}`, {
        brand,
        mode,
      })
      const trigger = page.locator(
        '[data-scope="date-picker"][data-part="trigger"]'
      )
      const popup = page
        .locator('[data-scope="date-picker"][data-part="content"]')
        .filter({ visible: true })
      const segments = trigger.locator(
        'xpath=ancestor::*[@data-scope="date-picker"][@data-part="control"]'
      )
      const accepted = await segments.textContent()
      await trigger.click()
      await expect(popup).toHaveCount(1)
      const fields = popup.locator('input[type="number"]')
      await expect(fields).toHaveCount(count)
      const values = await fields.evaluateAll((elements) =>
        elements.map((element) => (element as HTMLInputElement).value)
      )
      for (const field of await fields.all()) {
        await expect(field).toBeVisible()
        await expectDigitsFit(field)
      }
      const hours = fields.nth(0)
      const minutes = fields.nth(1)
      await expect(hours).toHaveAttribute("min", "0")
      await expect(hours).toHaveAttribute("max", "23")
      await expect(minutes).toHaveAttribute("max", "59")
      await hours.evaluate((element) =>
        element.setAttribute("data-identity-probe", "original")
      )
      await hours.press("End")
      await expect(hours).toHaveValue("23")
      await minutes.press("End")
      await expect(minutes).toHaveValue("59")
      await minutes.press("ArrowDown")
      await expect(minutes).toHaveValue("58")
      await expect(hours).toHaveAttribute("data-identity-probe", "original")
      await expectDigitsFit(hours)
      await expectDigitsFit(minutes)
      await popup.getByRole("button", { name: "Cancel", exact: true }).click()
      await expect(popup).toHaveCount(0)
      await expect(segments).toHaveText(accepted ?? "")
      await trigger.click()
      await expect(fields).toHaveCount(count)
      expect(
        await fields.evaluateAll((elements) =>
          elements.map((element) => (element as HTMLInputElement).value)
        )
      ).toEqual(values)
      await page.keyboard.press("Escape")
      await expect(popup).toHaveCount(0)
    })
  }
}
