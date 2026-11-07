import { expect, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"

const editableHeading = /^Košík:/
const recapHeading = /^Rekapitulace:/

for (const width of [393, 1280]) {
  test(`cart comparison uses readable responsive columns at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await openContractStory(
      page,
      "templates-cartpresentation--cart-and-recap",
      {
        brand: "business",
      }
    )
    const cart = page
      .getByRole("heading", { name: editableHeading })
      .locator("..")
    const recap = page
      .getByRole("heading", { name: recapHeading })
      .locator("..")
    const first = await cart.boundingBox()
    const second = await recap.boundingBox()
    if (!(first && second)) {
      throw new Error("Missing cart comparison geometry")
    }
    if (width >= 1024) {
      expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(1)
      expect(second.x).toBeGreaterThan(first.x + first.width)
    } else {
      expect(Math.abs(first.x - second.x)).toBeLessThanOrEqual(1)
      expect(second.y).toBeGreaterThanOrEqual(first.y + first.height - 1)
    }
    for (const bounds of [first, second]) {
      expect(bounds.x).toBeGreaterThanOrEqual(-1)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1)
    }
    await expect(cart.getByRole("spinbutton")).toBeVisible()
    await expect(recap.locator("input, button")).toHaveCount(0)
    await expect(recap.getByText("2 balení", { exact: true })).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth
      )
    ).toBeLessThanOrEqual(1)
  })

  for (const story of ["playground", "multiple-items"]) {
    test(`compact ${story} cart stays centered at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 })
      await openContractStory(page, `templates-cartpresentation--${story}`, {
        brand: "business",
      })
      const example = page.locator("#storybook-root > div > div").first()
      // The reset reserves a stable scrollbar gutter even without overflow.
      // Measure the actual padded host, not the layout viewport/clientWidth.
      const geometry = await example.evaluate((element) => {
        const host = element.parentElement
        if (!host) {
          throw new Error("Missing compact cart host")
        }
        const bounds = element.getBoundingClientRect()
        const parent = host.getBoundingClientRect()
        const style = getComputedStyle(host)
        const paddingStart = Number.parseFloat(style.paddingLeft)
        const paddingEnd = Number.parseFloat(style.paddingRight)
        const start = parent.left + host.clientLeft + paddingStart
        const end =
          parent.left + host.clientLeft + host.clientWidth - paddingEnd
        return {
          center: bounds.left + bounds.width / 2,
          left: bounds.left,
          right: bounds.right,
          start,
          end,
        }
      })
      expect(
        Math.abs(geometry.center - (geometry.start + geometry.end) / 2),
        JSON.stringify(geometry)
      ).toBeLessThanOrEqual(1)
      expect(geometry.left).toBeGreaterThanOrEqual(geometry.start - 1)
      expect(geometry.right).toBeLessThanOrEqual(geometry.end + 1)
      const remove = example.locator('[data-part="remove"]')
      await expect(remove).toHaveCount(1)
      if (story === "multiple-items") {
        await expect(remove).toBeFocused()
        const focus = await remove.evaluate((element) => {
          const root = element.closest("#storybook-root")
          if (!root) {
            throw new Error("Missing cart capture boundary")
          }
          const bounds = element.getBoundingClientRect()
          const frame = root.getBoundingClientRect()
          const style = getComputedStyle(element)
          const clearance = Math.max(
            0,
            Number.parseFloat(style.outlineWidth) * 2 +
              Number.parseFloat(style.outlineOffset)
          )
          return {
            left: bounds.left - clearance,
            right: bounds.right + clearance,
            top: bounds.top - clearance,
            bottom: bounds.bottom + clearance,
            frame: frame.toJSON(),
          }
        })
        expect(focus.left, JSON.stringify(focus)).toBeGreaterThanOrEqual(
          focus.frame.left - 1
        )
        expect(focus.right).toBeLessThanOrEqual(focus.frame.right + 1)
        expect(focus.top).toBeGreaterThanOrEqual(focus.frame.top - 1)
        expect(focus.bottom).toBeLessThanOrEqual(focus.frame.bottom + 1)
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth
        )
      ).toBeLessThanOrEqual(1)
    })
  }
}
