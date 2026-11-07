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
  const inlineStart = (box: { x: number; width: number }) =>
    direction === "rtl" ? box.x + box.width : box.x
  let previous = first
  let wrapped = false
  for (const segment of await nav.locator(".breadcrumb-segment").all()) {
    const children = segment.locator("ol > li")
    await expect(children).toHaveCount(2)
    const separator = children.nth(0)
    const destination = children.nth(1)
    await expect(separator).toHaveAttribute("aria-hidden", "true")
    await expect(separator).toHaveCSS("position", "absolute")
    await expect(segment).toHaveRole("listitem")
    await expect(destination).toHaveAttribute("role", "presentation")
    await expect(destination).toBeVisible()
    await assertWithinViewport(segment)
    await assertWithinViewport(destination)
    const a = await separator.evaluate((element) => {
      const { x, y, width, height } = element.getBoundingClientRect()
      return { x, y, width, height }
    })
    const b = await destination.boundingBox()
    const host = await segment.boundingBox()
    if (!(b && host)) {
      throw new Error("Breadcrumb destinations must remain visible")
    }
    // A hidden separator must not leave an in-flow spacer beside its destination.
    expect(Math.abs(host.x - b.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(host.width - b.width)).toBeLessThanOrEqual(1)
    expect(a.width).toBeGreaterThan(0)
    expect(a.height).toBeGreaterThan(0)
    expect(Math.abs(a.y + a.height / 2 - b.y - b.height / 2)).toBeLessThan(1)
    const beginsRow =
      Math.abs(b.y + b.height / 2 - previous.y - previous.height / 2) > 1
    if (beginsRow) {
      wrapped = true
      await expect(segment).toHaveAttribute("data-wrap-start", "")
      expect(Math.abs(inlineStart(b) - inlineStart(first))).toBeLessThanOrEqual(
        1
      )
    } else {
      await expect(segment).not.toHaveAttribute("data-wrap-start")
      await assertWithinViewport(separator)
      const icon = await separator.locator(":scope > *").first().boundingBox()
      if (!icon) {
        throw new Error("Same-row separator artwork must remain visible")
      }
      await assertWithinViewport(separator.locator(":scope > *").first())
      const gapStart =
        direction === "rtl" ? b.x + b.width : previous.x + previous.width
      const gapEnd = direction === "rtl" ? previous.x : b.x
      expect(icon.x).toBeGreaterThanOrEqual(gapStart - 1)
      expect(icon.x + icon.width).toBeLessThanOrEqual(gapEnd + 1)
      expect(
        Math.abs(icon.x + icon.width / 2 - (gapStart + gapEnd) / 2)
      ).toBeLessThanOrEqual(1)
      expect(
        Math.abs(icon.y + icon.height / 2 - b.y - b.height / 2)
      ).toBeLessThanOrEqual(1)
    }
    await expect(separator).toHaveCSS(
      "visibility",
      beginsRow ? "hidden" : "visible"
    )
    previous = b
  }
  return wrapped
}

for (const brand of ["base", "business"]) {
  for (const content of ["large icon", "wide custom content"]) {
    test(`${brand}: intrinsic ${content} stays between destinations and releases its gap`, async ({
      page,
    }) => {
      await openContractStory(page, "molecules-breadcrumb--playground", {
        brand,
      })
      const nav = page.getByRole("navigation", {
        name: "breadcrumb",
        exact: true,
      })
      const list = nav.getByRole("list")
      const separator = nav
        .locator(".breadcrumb-segment > ol > li:first-child")
        .first()
      const originalContent = await separator.innerHTML()
      const ordinaryGap = await list.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).columnGap)
      )

      // Exercise the existing story's real separator host and observer. The unit
      // test separately verifies iconSize="2xl" selects this same Icon class.
      await separator.evaluate((element, kind) => {
        if (kind === "large icon") {
          const icon = element.firstElementChild
          if (!icon) {
            throw new Error("Missing separator icon")
          }
          for (const name of [...icon.classList]) {
            if (name.startsWith("text-breadcrumb-separator-icon-")) {
              icon.classList.remove(name)
            }
          }
          icon.classList.add("text-icon-2xl")
        } else {
          const marker = document.createElement("span")
          marker.textContent = "Section divider"
          marker.style.cssText =
            "display: inline-block; width: 96.25px; white-space: nowrap"
          element.replaceChildren(marker)
        }
      }, content)
      await expect
        .poll(() =>
          list.evaluate((element) =>
            Number.parseFloat(getComputedStyle(element).columnGap)
          )
        )
        .toBeGreaterThan(ordinaryGap)

      let sawWrappedRow = false
      for (const width of [768, 320, 393, 768]) {
        await page.setViewportSize({ width, height: 720 })
        for (const direction of ["ltr", "rtl"]) {
          await nav.evaluate((element, dir) => {
            element.setAttribute("dir", dir)
            // Ancestor transforms must not feed scaled pixels into the flex gap.
            element.style.transform = "scale(0.75)"
            element.style.transformOrigin = "center"
          }, direction)
          sawWrappedRow =
            (await assertRows(nav, "Docs", direction)) || sawWrappedRow
        }
      }
      expect(sawWrappedRow).toBe(true)
      await separator.evaluate((element, html) => {
        element.innerHTML = html
      }, originalContent)
      await expect
        .poll(() =>
          list.evaluate((element) =>
            Number.parseFloat(getComputedStyle(element).columnGap)
          )
        )
        .toBeCloseTo(ordinaryGap, 3)
      await assertRows(nav, "Docs", "rtl")
      await expect(nav.getByRole("listitem")).toHaveCount(3)
      await expect(nav.locator('[aria-current="page"]')).toHaveText(
        "Breadcrumb"
      )
    })
  }
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
    await expect(nav.getByRole("link")).toHaveCount(trail.count - 1)
    await expect(nav.getByRole("list")).toHaveCSS("flex-wrap", "wrap")
    await expect(nav.getByRole("list")).toHaveCSS("overflow-x", "visible")
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
        for (const link of await nav.getByRole("link").all()) {
          await expect(link).toBeVisible()
          await assertWithinViewport(link)
          await link.focus()
          await expect(link).toBeFocused()
        }
        await expect(nav.locator('[aria-current="page"]')).toBeVisible()
        await assertWithinViewport(nav.locator('[aria-current="page"]'))
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
