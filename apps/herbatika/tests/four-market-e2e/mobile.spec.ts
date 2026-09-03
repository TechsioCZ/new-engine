import { expect, test } from "@playwright/test"
import { expectMarketDocument, gotoMarketPage } from "./journey-helpers"
import { fixtureForProject } from "./market-fixtures"

test("mobile viewport keeps navigation, search and content usable", async ({
  page,
}, testInfo) => {
  const fixture = fixtureForProject(testInfo.project.name)
  await page.setViewportSize({ height: 812, width: 375 })
  await gotoMarketPage(page, "/")
  await expectMarketDocument(page, fixture)

  const hamburger = page.getByRole("button", { name: "Toggle mobile menu" })
  await expect(hamburger).toBeVisible()
  await hamburger.click()
  await expect(hamburger).toHaveAttribute("aria-expanded", "true")
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(hamburger).toHaveAttribute("aria-expanded", "false")

  await expect(
    page
      .getByRole("combobox", { name: fixture.searchInputLabel })
      .filter({ visible: true })
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1
    )
  ).toBe(true)
})
