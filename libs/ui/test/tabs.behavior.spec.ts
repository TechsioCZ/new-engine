import { expect, test } from "@playwright/test"

test.describe("Tabs indicator", () => {
  test("stays under the selected tab inside a scaled ancestor", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    // Playground has no play function, so nothing else drives the tabs.
    await page.goto(
      "/iframe.html?id=molecules-tabs--playground&viewMode=story",
      {
        waitUntil: "domcontentloaded",
      }
    )
    const list = page.getByRole("tablist", { name: "Project views" })
    await expect(list).toBeVisible()
    // A real CSS transform: viewport boxes shrink while layout lengths do not.
    await page.locator("#storybook-root").evaluate((root) => {
      root.style.transformOrigin = "0 0"
      root.style.transform = "scale(0.8)"
    })
    const indicator = list.locator('[data-part="indicator"]')
    for (const name of ["Details", "Settings", "Overview"]) {
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
            return "missing box"
          }
          const offset = Math.max(
            Math.abs(tabBox.x - indicatorBox.x),
            Math.abs(tabBox.width - indicatorBox.width),
            Math.abs(
              tabBox.y + tabBox.height - (indicatorBox.y + indicatorBox.height)
            )
          )
          return offset < 2
            ? "aligned"
            : JSON.stringify({ name, offset, tabBox, indicatorBox })
        })
        .toBe("aligned")
    }
  })
})
