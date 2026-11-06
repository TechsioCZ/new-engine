import { expect, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"

for (const [brand, mode] of [
  ["business", "light"],
  ["akros", "light"],
  ["base", "light"],
  ["base", "dark"],
  ["neo", "light"],
  ["neo", "dark"],
]) {
  test(`${brand}/${mode}: non-clickable row hover matches frozen cells`, async ({
    page,
  }) => {
    await openContractStory(
      page,
      "pages-e-commerce-orders-dashboard--default",
      { brand, mode }
    )
    const row = page.locator('#storybook-root tbody tr[data-index="0"]').first()
    await row.scrollIntoViewIfNeeded()
    await page.mouse.move(0, 0)
    const before = await row.evaluate((element) => ({
      background: getComputedStyle(element).backgroundColor,
      frozen: getComputedStyle(element.querySelector("td")).backgroundImage,
    }))
    const hasHover = await page.evaluate(
      () => matchMedia("(hover: hover)").matches
    )
    await row.locator("td").first().hover()
    if (hasHover) {
      await expect
        .poll(() =>
          row.evaluate((element) => getComputedStyle(element).backgroundColor)
        )
        .not.toBe(before.background)
      await expect
        .poll(() =>
          row.evaluate(
            (element) =>
              getComputedStyle(element.querySelector("td")).backgroundImage
          )
        )
        .not.toBe(before.frozen)
    } else {
      await expect
        .poll(() =>
          row.evaluate((element) => getComputedStyle(element).backgroundColor)
        )
        .toBe(before.background)
      await expect
        .poll(() =>
          row.evaluate(
            (element) =>
              getComputedStyle(element.querySelector("td")).backgroundImage
          )
        )
        .toBe(before.frozen)
    }
  })
}
