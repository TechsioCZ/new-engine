import { expect, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"
import { assertWithinViewport } from "./visual-viewport.mjs"

const cases = ["base", "business"].flatMap((theme) =>
  Array.from({ length: 5 }, (_, round) => ({ brand: theme, repetition: round }))
)

for (const { brand, repetition } of cases) {
  test(`${brand}: Breadcrumb keeps wrapped separators with their destinations (round ${repetition + 1})`, async ({
    page,
  }) => {
    await openContractStory(page, "molecules-breadcrumb--playground", { brand })
    const nav = page.getByRole("navigation", {
      name: "breadcrumb",
      exact: true,
    })
    await expect(nav.getByRole("list")).toHaveCount(1)
    await expect(nav.getByRole("listitem")).toHaveCount(3)
    const height = page.viewportSize()?.height ?? 720

    for (const width of [320, 393, 768]) {
      await page.setViewportSize({ width, height })
      for (const direction of ["ltr", "rtl"]) {
        await nav.evaluate((element, dir) => {
          element.setAttribute("dir", dir)
        }, direction)
        await assertWithinViewport(nav)
        const segments = nav.locator(".breadcrumb-segment")
        await expect(segments).toHaveCount(2)
        for (const segment of await segments.all()) {
          const children = segment.locator("ol > li")
          await expect(children).toHaveCount(2)
          const separator = children.nth(0)
          const destination = children.nth(1)
          await expect(separator).toHaveAttribute("aria-hidden", "true")
          await expect(destination).toHaveAttribute("role", "listitem")
          await assertWithinViewport(segment)
          const a = await separator.boundingBox()
          const b = await destination.boundingBox()
          if (!(a && b)) {
            throw new Error("Breadcrumb segment must have real geometry")
          }
          expect(
            Math.abs(a.y + a.height / 2 - b.y - b.height / 2)
          ).toBeLessThan(1)
          if (direction === "rtl") {
            expect(a.x).toBeGreaterThanOrEqual(b.x + b.width - 1)
          } else {
            expect(a.x + a.width).toBeLessThanOrEqual(b.x + 1)
          }
        }
      }
    }
    await expect(
      nav.getByRole("link", { name: "Docs", exact: true })
    ).toHaveAttribute("href", "/docs")
    await expect(
      nav.getByRole("link", { name: "Components", exact: true })
    ).toHaveAttribute("href", "/docs/components")
    await expect(nav.locator('[aria-current="page"]')).toHaveText("Breadcrumb")
  })
}
