import { expect, type Locator, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"
import { assertWithinViewport } from "./visual-viewport.mjs"

const trails = [
  {
    id: "molecules-breadcrumb--playground",
    label: "Molecule",
    first: "Docs",
    firstHref: "/docs",
    second: "Components",
    secondHref: "/docs/components",
    current: "Breadcrumb",
    count: 3,
    requiresWrap: false,
  },
  {
    id: "templates-breadcrumbtemplate--playground",
    label: "Template",
    first: "Home",
    firstHref: "/",
    second: "Products",
    secondHref: "/products",
    current: "Smartphones",
    count: 4,
    requiresWrap: true,
  },
]
const cases = ["base", "business"].flatMap((theme) =>
  trails.flatMap((trail) =>
    Array.from({ length: 5 }, (_, round) => ({
      brand: theme,
      trail,
      repetition: round,
    }))
  )
)

async function assertRows(nav: Locator, firstName: string, direction: string) {
  const first = await nav
    .getByRole("link", { name: firstName, exact: true })
    .boundingBox()
  if (!first) {
    throw new Error("The first Breadcrumb destination must be measurable")
  }
  let previousCenter = first.y + first.height / 2
  let wrapped = false
  for (const segment of await nav.locator(".breadcrumb-segment").all()) {
    const children = segment.locator("ol > li")
    await expect(children).toHaveCount(2)
    const separator = children.nth(0)
    const destination = children.nth(1)
    await expect(separator).toHaveAttribute("aria-hidden", "true")
    await expect(destination).toHaveAttribute("role", "listitem")
    await assertWithinViewport(segment)
    const a = await separator.evaluate((element) => {
      const { x, y, width, height } = element.getBoundingClientRect()
      return { x, y, width, height }
    })
    const b = await destination.boundingBox()
    if (!b) {
      throw new Error("Breadcrumb destinations must remain visible")
    }
    expect(a.width).toBeGreaterThan(0)
    expect(a.height).toBeGreaterThan(0)
    expect(Math.abs(a.y + a.height / 2 - b.y - b.height / 2)).toBeLessThan(1)
    const center = b.y + b.height / 2
    const beginsRow = Math.abs(center - previousCenter) > 1
    if (beginsRow) {
      wrapped = true
      await expect(segment).toHaveAttribute("data-wrap-start", "")
    } else {
      await expect(segment).not.toHaveAttribute("data-wrap-start")
    }
    await expect(separator).toHaveCSS(
      "visibility",
      beginsRow ? "hidden" : "visible"
    )
    previousCenter = center
    if (direction === "rtl") {
      expect(a.x).toBeGreaterThanOrEqual(b.x + b.width - 1)
    } else {
      expect(a.x + a.width).toBeLessThanOrEqual(b.x + 1)
    }
  }
  return wrapped
}

for (const { brand, trail, repetition } of cases) {
  test(`${brand}: ${trail.label} keeps row-boundary decoration clear (round ${repetition + 1})`, async ({
    page,
  }) => {
    await openContractStory(page, trail.id, { brand })
    const nav = page.getByRole("navigation", {
      name: "breadcrumb",
      exact: true,
    })
    await expect(nav.getByRole("list")).toHaveCount(1)
    await expect(nav.getByRole("listitem")).toHaveCount(trail.count)
    await expect(nav.locator(".breadcrumb-segment")).toHaveCount(
      trail.count - 1
    )
    const height = page.viewportSize()?.height ?? 720
    let sawWrappedRow = false
    for (const width of [320, 393, 768]) {
      await page.setViewportSize({ width, height })
      for (const direction of ["ltr", "rtl"]) {
        await nav.evaluate((element, dir) => {
          element.setAttribute("dir", dir)
        }, direction)
        await assertWithinViewport(nav)
        sawWrappedRow =
          (await assertRows(nav, trail.first, direction)) || sawWrappedRow
      }
    }
    if (trail.requiresWrap) {
      expect(sawWrappedRow).toBe(true)
    }
    await expect(
      nav.getByRole("link", { name: trail.first, exact: true })
    ).toHaveAttribute("href", trail.firstHref)
    await expect(
      nav.getByRole("link", { name: trail.second, exact: true })
    ).toHaveAttribute("href", trail.secondHref)
    await expect(nav.locator('[aria-current="page"]')).toHaveText(trail.current)
  })
}
