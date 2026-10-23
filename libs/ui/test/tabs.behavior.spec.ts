import { expect, test } from "@playwright/test"

test.describe("Tabs indicator", () => {
  test("stays under the selected tab inside a scaled ancestor", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto(
      "/iframe.html?id=molecules-tabs--scrollable-alignment&viewMode=story",
      { waitUntil: "domcontentloaded" }
    )
    const list = page.getByRole("tablist", { name: "ltr center project views" })
    await expect(list).toBeVisible()
    // A real CSS transform: viewport boxes shrink while layout lengths do not.
    await page.locator("#storybook-root").evaluate((root) => {
      root.style.transformOrigin = "0 0"
      root.style.transform = "scale(0.8)"
    })
    const indicator = list.locator('[data-part="indicator"]')
    for (const name of [
      "Technical details",
      "Recent activity",
      "Project overview",
    ]) {
      const tab = list.getByRole("tab", { name })
      await tab.click()
      await expect(tab).toHaveAttribute("aria-selected", "true")
      await expect
        .poll(async () => {
          const [tabBox, indicatorBox] = await Promise.all([
            tab.boundingBox(),
            indicator.boundingBox(),
          ])
          if (!(tabBox && indicatorBox)) {
            return Number.POSITIVE_INFINITY
          }
          return Math.max(
            Math.abs(tabBox.x - indicatorBox.x),
            Math.abs(tabBox.width - indicatorBox.width),
            Math.abs(
              tabBox.y + tabBox.height - (indicatorBox.y + indicatorBox.height)
            )
          )
        })
        .toBeLessThan(2)
    }
  })
})
