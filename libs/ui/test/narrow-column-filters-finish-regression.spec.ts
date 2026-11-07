import { expect, type Locator, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"

async function expectReadableStart(region: Locator) {
  await expect
    .poll(() =>
      region.evaluate((element) => {
        const caption = element.querySelector("caption")
        const sort = element.querySelector('th[data-leaf-column="age"] button')
        const label = sort?.querySelector("span")
        const indicator = sort?.querySelector('[aria-hidden="true"]')
        if (!(caption && label && indicator)) {
          throw new Error("Expected the complete caption and Age sort control")
        }
        const viewport = element.getBoundingClientRect()
        const left = Math.max(0, viewport.left + element.clientLeft)
        const right = Math.min(
          viewport.left + element.clientLeft + element.clientWidth,
          element.ownerDocument.documentElement.clientWidth
        )
        const bounds = [indicator.getBoundingClientRect()]
        for (const content of [caption, label]) {
          const text = element.ownerDocument.createRange()
          text.selectNodeContents(content)
          const fragments = Array.from(text.getClientRects())
          if (!fragments.length) {
            throw new Error("Expected visible caption and Age label text")
          }
          bounds.push(...fragments)
        }
        const first = element.querySelector(
          'input[aria-label="Filter value for Age"]'
        )
        if (first) {
          bounds.push(first.getBoundingClientRect())
        }
        return Math.max(
          Math.abs(element.scrollLeft),
          ...bounds.map((rect) => {
            if (rect.width <= 0) {
              throw new Error(
                "Expected nonempty caption, header and field bounds"
              )
            }
            return Math.max(left - rect.left, rect.right - right)
          })
        )
      })
    )
    .toBeLessThanOrEqual(1)
}

for (const width of [361, 1280]) {
  test(`NarrowColumnFilters finishes readable with real focus and native scrolling at ${width}px`, async ({
    page,
    isMobile,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await openContractStory(
      page,
      "organisms-datatable--narrow-column-filters",
      {
        brand: "business",
      }
    )
    const fixed = page.getByRole("region", {
      name: "fixed layout filters",
      exact: true,
    })
    const auto = page.getByRole("region", {
      name: "auto layout filters",
      exact: true,
    })
    const first = auto.getByLabel("Filter value for Age", { exact: true })
    const upper = auto.getByLabel("Filter upper bound for Age", { exact: true })
    const visits = auto.getByLabel("Filter value for Visits", { exact: true })
    const expectRetainedState = async () => {
      await expect(first).toBeFocused()
      await expect(first).toHaveValue("36")
      await expect(upper).toHaveValue("40")
      await expect(visits).toHaveValue("812")
      for (const region of [fixed, auto]) {
        await expect(region.locator("tbody tr")).toHaveCount(1)
        await expect(region.getByText("Ada", { exact: true })).toBeVisible()
      }
    }

    // Inspect the completed play before any test interaction can repair its scroll.
    await expectRetainedState()
    for (const region of [fixed, auto]) {
      expect(
        await region
          .locator("colgroup col")
          .evaluateAll((columns) =>
            columns.map((column) => (column as HTMLElement).style.width)
          )
      ).toEqual(["80px", "80px", "240px"])
      await expectReadableStart(region)
    }

    const overflow = await auto.evaluate(
      (element) => element.scrollWidth - element.clientWidth
    )
    expect(overflow).toBeGreaterThan(1)
    await expect(auto).toHaveCSS("overflow-x", "auto")
    const age = auto
      .getByRole("button", { name: "Age", exact: true })
      .locator("span")
      .first()
    const initialLeft = await age.evaluate(
      (element) => element.getBoundingClientRect().left
    )
    const scroll = async (left: number) => {
      if (isMobile) {
        // Playwright cannot send wheel input to mobile WebKit. Exercise its
        // native scroll API, not a synthetic event or an app state update.
        await auto.evaluate(
          (element, amount) =>
            element.scrollBy({ left: amount, behavior: "instant" }),
          left
        )
      } else {
        await auto.hover()
        await page.mouse.wheel(left, 0)
      }
    }
    await scroll(120)
    await expect
      .poll(() => auto.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(1)
    await expect
      .poll(() =>
        age.evaluate((element) => element.getBoundingClientRect().left)
      )
      .toBeLessThan(initialLeft - 1)
    await expectRetainedState()

    await scroll(-overflow)
    await expectReadableStart(auto)
    await expectRetainedState()
  })
}
