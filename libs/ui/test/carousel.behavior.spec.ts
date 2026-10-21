import { expect, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"

const stories = [
  "molecules-carousel--playground",
  "templates-carouseltemplate--playground",
] as const

for (const story of stories) {
  for (const [slidesPerPage, slidesPerMove] of [
    [1, 1],
    [2, 1],
    [2, 2],
    [3, 2],
  ]) {
    test(`${story}: finite boundaries with ${slidesPerPage} visible and ${slidesPerMove} per move`, async ({
      page,
    }) => {
      await openContractStory(page, story, {
        args: `loop:!false;slidesPerPage:${slidesPerPage};slidesPerMove:${slidesPerMove}`,
      })
      const indicators = page.locator('[data-part="indicator"]')
      const previous = page.getByRole("button", { name: "Previous slide" })
      const next = page.getByRole("button", { name: "Next slide" })
      await expect(previous).toBeDisabled()
      await expect(previous).toHaveAttribute("aria-disabled", "true")
      await expect(indicators.first()).toHaveAttribute("aria-current", "true")
      // Include a partial final page, not only evenly divisible page counts.
      const count = await indicators.count()
      if (count > 1) {
        await expect(next).toBeEnabled()
        for (let index = 1; index < count; index++) {
          await next.click()
          await expect(indicators.nth(index)).toHaveAttribute(
            "aria-current",
            "true"
          )
        }
      }
      await expect(next).toBeDisabled()
      await expect(next).toHaveAttribute("aria-disabled", "true")
      // Native disabled activation and direct DOM clicks must both be inert.
      await next.evaluate((button: HTMLButtonElement) => button.click())
      await expect(indicators.last()).toHaveAttribute("aria-current", "true")
      await expect
        .poll(() =>
          page
            .locator('[data-part="item-group"]')
            .evaluate(
              (group) =>
                Math.abs(group.scrollLeft) -
                (group.scrollWidth - group.clientWidth)
            )
        )
        .toBeCloseTo(0, 0)
      if (count > 1) {
        await previous.click()
        await expect(indicators.nth(count - 2)).toHaveAttribute(
          "aria-current",
          "true"
        )
        await indicators.first().click()
      }
      await expect(previous).toBeDisabled()
      await previous.evaluate((button: HTMLButtonElement) => button.click())
      await expect(indicators.first()).toHaveAttribute("aria-current", "true")
    })
  }

  for (const theme of [
    { brand: "base", mode: "light" },
    { brand: "base", mode: "dark" },
    { brand: "akros", mode: "light" },
  ]) {
    test(`${story}: vertical indicator keys and stable focus in ${theme.brand}/${theme.mode}`, async ({
      page,
    }) => {
      await openContractStory(page, story, {
        ...theme,
        args: "orientation:vertical;aspectRatio:square;loop:!false",
      })
      const indicators = page.locator('[data-part="indicator"]')
      await indicators.first().focus()
      await page.keyboard.press("ArrowDown")
      await expect(indicators.nth(1)).toHaveAttribute("aria-current", "true")
      await expect(indicators.nth(1)).toBeFocused()
      await page.keyboard.press("ArrowRight")
      await expect(indicators.nth(1)).toHaveAttribute("aria-current", "true")
      await page.keyboard.press("End")
      await expect(indicators.last()).toHaveAttribute("aria-current", "true")
      await expect(indicators.last()).toBeFocused()
      await expect(
        page.getByRole("button", { name: "Next slide" })
      ).toBeDisabled()
      // Resizing changes pixel snap offsets, not the page/control identity.
      await page.setViewportSize({ width: 390, height: 844 })
      await expect(indicators.last()).toBeFocused()
      await page.keyboard.press("ArrowUp")
      await expect(
        indicators.nth((await indicators.count()) - 2)
      ).toHaveAttribute("aria-current", "true")
      await page.keyboard.press("Home")
      await expect(indicators.first()).toHaveAttribute("aria-current", "true")
      await expect(indicators.first()).toBeFocused()
      await expect(
        page.getByRole("button", { name: "Previous slide" })
      ).toBeDisabled()
    })
  }

  test(`${story}: horizontal RTL indicators follow logical direction`, async ({
    page,
  }) => {
    await openContractStory(page, story, { args: "dir:rtl;loop:!false" })
    const indicators = page.locator('[data-part="indicator"]')
    await indicators.first().focus()
    await page.keyboard.press("ArrowLeft")
    await expect(indicators.nth(1)).toHaveAttribute("aria-current", "true")
    await expect(indicators.nth(1)).toBeFocused()
    await page.keyboard.press("ArrowRight")
    await expect(indicators.first()).toHaveAttribute("aria-current", "true")
    await expect(indicators.first()).toBeFocused()
  })
}
