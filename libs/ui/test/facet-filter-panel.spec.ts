import { expect, type Page, test } from "@playwright/test"

async function openStory(page: Page, story: string) {
  await page.goto(`/iframe.html?id=${story}&viewMode=story`)
}

test("Playground waits for user input", async ({ page }) => {
  await openStory(page, "templates-facetfilterpanel--playground")
  await expect(
    page.getByRole("complementary", { name: "Filters" })
  ).toBeVisible()
  const cotton = page.getByRole("checkbox", { name: /Cotton/ })
  await expect(cotton).not.toBeChecked()
  await page.waitForTimeout(700)
  await expect(cotton).not.toBeChecked()
})

test("option selection, active removal and reset stay controlled", async ({
  page,
}) => {
  await openStory(page, "templates-facetfilterpanel--selected")
  const linen = page.getByRole("checkbox", { name: /Linen/ })
  const stock = page.getByRole("checkbox", { name: /In stock/ })

  await expect(linen).toBeChecked()
  await expect(stock).toBeChecked()
  await page.getByRole("button", { name: "Remove Linen" }).click()
  await expect(linen).not.toBeChecked()
  await expect(page.getByRole("button", { name: "Remove Linen" })).toHaveCount(
    0
  )

  await page.getByRole("button", { name: "Clear filters" }).click()
  await expect(stock).not.toBeChecked()
  await expect(page.getByRole("slider").first()).toHaveAttribute(
    "aria-valuenow",
    "0"
  )
  await expect(page.getByRole("slider").last()).toHaveAttribute(
    "aria-valuenow",
    "200"
  )
  await expect(
    page.getByRole("heading", { name: "Active filters" })
  ).toHaveCount(0)
})

test("ActiveFilters compound story removes and resets items", async ({
  page,
}) => {
  await openStory(page, "templates-facetfilterpanel--active-filters")

  await page.getByRole("button", { name: "Remove Linen" }).click()
  await expect(page.getByRole("button", { name: "Remove Linen" })).toHaveCount(
    0
  )
  await expect(
    page.getByRole("button", { name: "Remove In stock" })
  ).toBeVisible()

  await page.getByRole("button", { name: "Clear filters" }).click()
  await expect(
    page.getByRole("heading", { name: "Active filters" })
  ).toHaveCount(0)
})

test("zero count and disabled are independent states", async ({ page }) => {
  await openStory(
    page,
    "templates-facetfilterpanel--empty-and-option-availability"
  )
  const zeroCount = page.getByRole("checkbox", { name: /Matte/ })
  const disabled = page.getByRole("checkbox", { name: /Gloss/ })

  await expect(page.getByText("No patterns available")).toBeVisible()
  await expect(zeroCount).toBeEnabled()
  await zeroCount.focus()
  await zeroCount.press("Space")
  await expect(zeroCount).toBeChecked()
  await expect(disabled).toBeDisabled()
})

test("overflow is keyboard reachable and reversible", async ({ page }) => {
  await openStory(page, "templates-facetfilterpanel--overflow")
  const showMore = page.getByRole("button", { name: "Show 2 more" })

  await expect(page.getByRole("checkbox", { name: /Hemp/ })).toHaveCount(0)
  await showMore.focus()
  await showMore.press("Enter")
  await expect(page.getByRole("checkbox", { name: /Hemp/ })).toBeVisible()
  await page.getByRole("button", { name: "Show less" }).click()
  await expect(page.getByRole("checkbox", { name: /Hemp/ })).toHaveCount(0)
})

test("pending preserves selection and disables mutations", async ({ page }) => {
  await openStory(page, "templates-facetfilterpanel--pending")

  await expect(
    page.getByText("Updating results", { exact: true })
  ).toBeVisible()
  await expect(page.getByRole("checkbox", { name: /Wool/ })).toBeChecked()
  await expect(page.getByRole("checkbox", { name: /Wool/ })).toBeDisabled()
  await expect(page.getByRole("button", { name: "Remove Wool" })).toBeDisabled()
  await expect(
    page.getByRole("button", { name: "Clear filters" })
  ).toBeDisabled()
  await expect(page.getByRole("slider").first()).toBeDisabled()
})

test("range responds to keyboard and keeps consumer formatting", async ({
  page,
}) => {
  await openStory(page, "templates-facetfilterpanel--playground")
  const lowerThumb = page.getByRole("slider").first()

  await expect(lowerThumb).toHaveAttribute("aria-valuenow", "0")
  await lowerThumb.focus()
  await lowerThumb.press("ArrowRight")
  await expect(lowerThumb).toHaveAttribute("aria-valuenow", "5")
  const removePrice = page.getByRole("button", { name: "Remove Price filter" })
  await expect(removePrice).toContainText("Price: $5 - $200")
  await removePrice.click()
  await expect(lowerThumb).toHaveAttribute("aria-valuenow", "0")
})

test("narrow inline composition fits without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 420, height: 760 })
  await openStory(page, "templates-facetfilterpanel--narrow-layout")
  const viewport = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))

  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width)
  await expect(page.getByRole("heading", { name: "Filters" })).toBeVisible()
  const narrowWidth = await page
    .getByRole("complementary", { name: "Filters" })
    .evaluate((element) => element.getBoundingClientRect().width)
  await openStory(page, "templates-facetfilterpanel--playground")
  const playgroundWidth = await page
    .getByRole("complementary", { name: "Filters" })
    .evaluate((element) => element.getBoundingClientRect().width)
  expect(playgroundWidth - narrowWidth).toBeGreaterThanOrEqual(32)
})

test("option groups loaded after mount open by default", async ({ page }) => {
  await openStory(page, "templates-facetfilterpanel--async-groups")
  await expect(page.getByRole("checkbox", { name: /Cotton/ })).toHaveCount(0)
  await page.getByRole("button", { name: "Load groups" }).click()
  await expect(page.getByRole("checkbox", { name: /Cotton/ })).toBeVisible()
})

test("rejected controlled drawer close keeps focus inside", async ({
  page,
}) => {
  await openStory(page, "templates-facetfilterpanel--rejected-drawer-close")
  await page.getByRole("button", { name: "Filters" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Close dialog" }).focus()
  await dialog.getByRole("button", { name: "Close dialog" }).click()
  await expect(page.getByText("Close requests: 1")).toBeVisible()
  await expect(dialog).toBeVisible()
  await page.waitForTimeout(50)
  await expect
    .poll(() =>
      dialog.evaluate((element) => element.contains(document.activeElement))
    )
    .toBe(true)
})

test("drawer closes with Escape, restores focus and retains values", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 740 })
  await openStory(page, "templates-facetfilterpanel--drawer-open")
  const dialog = page.getByRole("dialog")
  const trigger = page.getByRole("button", { name: /^Filters/ })

  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole("checkbox", { name: /Linen/ })).toBeChecked()
  await dialog.getByRole("button", { name: "Close dialog" }).focus()
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()

  await trigger.click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole("checkbox", { name: /Linen/ })).toBeChecked()
})
