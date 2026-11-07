import { expect, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"
import { checkStateCheckpoints } from "./visual-state-organisms-checkpoints.mjs"

for (const [brand, mode] of [
  ["base", "light"],
  ["base", "dark"],
  ["neo", "light"],
  ["neo", "dark"],
  ["business", "light"],
  ["akros", "light"],
]) {
  test(`${brand} ${mode} pressed combobox trigger stays stationary until activation`, async ({
    page,
  }) => {
    await openContractStory(page, "organisms-datatable--typed-column-filters", {
      brand,
      mode,
    })
    const field = page.getByPlaceholder("Filter Skills", { exact: true })
    const trigger = field
      .locator('xpath=ancestor::*[@data-scope="combobox"][@data-part="root"]')
      .locator('[data-part="trigger"]')
    await trigger.scrollIntoViewIfNeeded()
    const box = await trigger.boundingBox()
    if (!box) {
      throw new Error("Missing combobox trigger")
    }
    const value = await field.inputValue()
    const position = await field.evaluate(
      (element) => element.closest("table")?.parentElement?.scrollLeft
    )
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    try {
      await expect(field).toBeFocused()
      expect(
        await field.evaluate(
          (element) => element.closest("table")?.parentElement?.scrollLeft
        )
      ).toBe(position)
      const pressed = await trigger.boundingBox()
      if (!pressed) {
        throw new Error("Missing pressed trigger")
      }
      expect(Math.abs(pressed.x - box.x)).toBeLessThanOrEqual(1)
      expect(Math.abs(pressed.y - box.y)).toBeLessThanOrEqual(1)
    } finally {
      await page.mouse.up()
    }
    await expect(field).toHaveAttribute("aria-expanded", "true")
    await expect(page.getByRole("listbox")).toBeVisible()
    await expect(field).toHaveValue(value)
    await expect
      .poll(() =>
        field.evaluate((element) => {
          const viewport = element.closest("table")?.parentElement
          if (!viewport) {
            throw new Error("Missing table scrollport")
          }
          const bounds = viewport.getBoundingClientRect()
          const rect = element.getBoundingClientRect()
          return Math.max(
            bounds.left + viewport.clientLeft - rect.left,
            rect.right -
              bounds.left -
              viewport.clientLeft -
              viewport.clientWidth
          )
        })
      )
      .toBeLessThanOrEqual(1)
    await field.press("Escape")
    await expect(field).toHaveAttribute("aria-expanded", "false")
    await expect(field).toBeFocused()
  })

  for (const [story, expectedState] of [
    ["typed-column-filters", "--state-skills-filter-open"],
    ["large-field-alignment", "--state-skills-editor-open"],
    ["column-filters-with-conditions", "--state-number-condition-open"],
  ] as const) {
    test(`${brand} ${mode} ${story} popup activation survives owning-table focus reveal`, async ({
      page,
    }) => {
      const id = `organisms-datatable--${story}`
      await openContractStory(page, id, { brand, mode })
      const states: string[] = []
      const handled = await checkStateCheckpoints(
        page,
        id,
        async (suffix, ready) => {
          await ready?.()
          states.push(suffix)
        }
      )
      expect(handled).toBe(true)
      expect(states).toContain(expectedState)
    })
  }
}
